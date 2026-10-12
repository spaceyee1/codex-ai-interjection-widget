import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';
import { discoverCodexExecutable } from './subscription-executable.mjs';

export class SubscriptionRpcError extends Error {
  constructor(code = 'unavailable') {
    super('官方会员与额度暂时无法安全读取');
    this.name = 'SubscriptionRpcError';
    this.code = code;
  }
}

// This identity stays in RAM and is never included in a public snapshot.
export function accountFingerprint(accountResult) {
  const account = accountResult?.account;
  if (!account || account.type !== 'chatgpt') return null;
  const identity = accountResult?.workspaceRouting?.chatgptAccountId || account.chatgptAccountId || account.accountId || account.id || account.email;
  if (typeof identity !== 'string' || !identity || identity.length > 1024) return null;
  const plan = typeof account.planType === 'string' ? account.planType : '';
  return createHash('sha256').update(JSON.stringify([identity, plan])).digest('hex');
}

function safeScope(result) {
  const account = result?.account;
  return JSON.stringify([account?.type ?? null, accountFingerprint(result), account?.planType ?? null]);
}

function abortable(promise, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new SubscriptionRpcError(signal.reason === 'timeout' ? 'timeout' : 'cancelled'));
    if (signal.aborted) return abort();
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(promise).then(resolve, () => reject(new SubscriptionRpcError('unavailable')))
      .finally(() => signal.removeEventListener('abort', abort));
  });
}

function temporaryWorkspace(fsImpl) {
  const parent = fsImpl.realpathSync(os.tmpdir());
  const directory = fsImpl.mkdtempSync(path.join(parent, 'codex-whale-subscription-'));
  const original = fsImpl.lstatSync(directory);
  if (!original.isDirectory() || original.isSymbolicLink() || path.dirname(fsImpl.realpathSync(directory)) !== parent) throw new SubscriptionRpcError('unsafe_temp');
  fsImpl.mkdirSync(path.join(directory, 'logs'));
  fsImpl.mkdirSync(path.join(directory, 'state'));
  return {
    directory,
    childStopped: true,
    cleanup() {
      const current = fsImpl.lstatSync(directory);
      if (!current.isDirectory() || current.isSymbolicLink() || current.dev !== original.dev || current.ino !== original.ino || current.birthtimeMs !== original.birthtimeMs || fsImpl.realpathSync(directory) !== directory || path.dirname(directory) !== parent) throw new SubscriptionRpcError('cleanup_failed');
      let entries = 0;
      const inspect = (dir, depth) => {
        if (depth > 12) throw new SubscriptionRpcError('cleanup_failed');
        for (const name of fsImpl.readdirSync(dir)) {
          if (++entries > 4096 || !name || name === '.' || name === '..' || /[\\/]/.test(name)) throw new SubscriptionRpcError('cleanup_failed');
          const file = path.join(dir, name), stat = fsImpl.lstatSync(file);
          if (stat.isSymbolicLink() || !fsImpl.realpathSync(file).startsWith(directory + path.sep)) throw new SubscriptionRpcError('cleanup_failed');
          if (stat.isDirectory()) inspect(file, depth + 1);
          else if (!stat.isFile() || stat.nlink !== 1) throw new SubscriptionRpcError('cleanup_failed');
        }
      };
      inspect(directory, 0);
      fsImpl.rmSync(directory, { recursive: true, force: false });
    },
  };
}

export class SubscriptionRpc {
  constructor({ executable = null, discover = discoverCodexExecutable, spawnImpl = spawn, fsImpl = fs, timeoutMs = 60000, maxOutputBytes = 2 * 1024 * 1024 } = {}) {
    this.executable = executable;
    this.discover = discover;
    this.spawnImpl = spawnImpl;
    this.fs = fsImpl;
    this.timeoutMs = Math.max(1, Math.min(60000, Number.isFinite(timeoutMs) ? timeoutMs : 60000));
    this.maxOutputBytes = Math.max(1, Math.min(2 * 1024 * 1024, Number.isFinite(maxOutputBytes) ? maxOutputBytes : 2 * 1024 * 1024));
    this.jobs = new Set();
    this.pendingQueries = new Set();
    this.closed = false;
  }

  query(options = {}) {
    const promise = this.#query(options);
    this.pendingQueries.add(promise);
    promise.finally(() => this.pendingQueries.delete(promise)).catch(() => {});
    return promise;
  }

  async #query({ signal, accountOnly = false } = {}) {
    if (this.closed) throw new SubscriptionRpcError('closed');
    const controller = new AbortController();
    const abort = () => controller.abort('cancelled');
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    this.jobs.add(controller);
    const timer = setTimeout(() => controller.abort('timeout'), this.timeoutMs);
    let temp;
    try {
      const executable = this.executable || await abortable(this.discover({ signal: controller.signal }), controller.signal);
      if (controller.signal.aborted) throw new SubscriptionRpcError('cancelled');
      // Explicit paths are a trusted constructor dependency, never renderer input.
      if (typeof executable !== 'string' || !path.isAbsolute(executable) || (process.platform === 'win32' && !/\.exe$/i.test(executable))) throw new SubscriptionRpcError('cli_unavailable');
      temp = temporaryWorkspace(this.fs);
      const overrides = [
        'analytics.enabled=false', 'otel.exporter="none"', 'otel.metrics_exporter="none"',
        'otel.trace_exporter="none"', 'otel.log_user_prompt=false',
        `log_dir=${JSON.stringify(path.join(temp.directory, 'logs'))}`,
        `sqlite_home=${JSON.stringify(path.join(temp.directory, 'state'))}`,
      ];
      const args = ['app-server', ...overrides.flatMap(value => ['-c', value])];
      return await this.#run(executable, args, controller.signal, accountOnly, temp);
    } catch (error) {
      throw error instanceof SubscriptionRpcError ? error : new SubscriptionRpcError('unavailable');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      this.jobs.delete(controller);
      if (temp) {
        if (!temp.childStopped) throw new SubscriptionRpcError('cleanup_failed');
        try { temp.cleanup(); } catch { throw new SubscriptionRpcError('cleanup_failed'); }
      }
    }
  }

  #run(executable, args, signal, accountOnly, temp) {
    return new Promise((resolve, reject) => {
      let child, finished = false, settled = false, closeSeen = false, finishError = null, finishResult;
      let nextId = 1, stdoutBytes = 0, stderrBytes = 0, buffer = '', identityEstablished = false;
      const decoder = new StringDecoder('utf8'), pending = new Map();
      let cleanupTimer;
      const settle = () => {
        if (settled) return;
        settled = true;
        clearTimeout(cleanupTimer);
        signal.removeEventListener('abort', onAbort);
        if (finishError) reject(finishError); else resolve(finishResult);
      };
      const finish = (error, result) => {
        if (finished) return;
        finished = true;
        finishError = error; finishResult = result;
        for (const waiter of pending.values()) waiter.reject(error || new SubscriptionRpcError('cancelled'));
        pending.clear(); buffer = '';
        try { child?.stdin?.end(); } catch {}
        if (child && !closeSeen) cleanupTimer = setTimeout(() => { finishError = new SubscriptionRpcError('cleanup_failed'); settle(); }, 1200);
        try { child?.kill('SIGKILL'); } catch { finishError = new SubscriptionRpcError('cleanup_failed'); }
        if (!child || closeSeen) settle();
      };
      const onAbort = () => finish(new SubscriptionRpcError(signal.reason === 'timeout' ? 'timeout' : 'cancelled'));
      signal.addEventListener('abort', onAbort, { once: true });
      if (signal.aborted) return onAbort();
      try { child = this.spawnImpl(executable, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, shell: false }); }
      catch { return finish(new SubscriptionRpcError('cli_unavailable')); }
      temp.childStopped = false;
      child.on('error', () => finish(new SubscriptionRpcError('cli_unavailable')));
      child.on('close', () => { closeSeen = true; temp.childStopped = true; if (!finished) finish(new SubscriptionRpcError('process_ended')); else settle(); });
      child.stdin?.on('error', () => finish(new SubscriptionRpcError('protocol_error')));
      child.stdout?.on('error', () => finish(new SubscriptionRpcError('protocol_error')));
      child.stderr?.on('error', () => finish(new SubscriptionRpcError('protocol_error')));
      child.stderr?.on('data', chunk => {
        // Do not retain, print, or put raw stderr in an Error object.
        stderrBytes += Buffer.byteLength(chunk);
        if (stderrBytes > this.maxOutputBytes) finish(new SubscriptionRpcError('output_limit'));
      });
      child.stdout?.on('data', chunk => {
        if (finished) return;
        stdoutBytes += Buffer.byteLength(chunk);
        if (stdoutBytes > this.maxOutputBytes) return finish(new SubscriptionRpcError('output_limit'));
        buffer += decoder.write(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        let newline;
        while (!finished && (newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline).trim(); buffer = buffer.slice(newline + 1);
          if (!line) continue;
          let message;
          try { message = JSON.parse(line); } catch { return finish(new SubscriptionRpcError('protocol_error')); }
          if (!message || typeof message !== 'object' || Array.isArray(message)) return finish(new SubscriptionRpcError('protocol_error'));
          if (typeof message.method === 'string') {
            if (Object.hasOwn(message, 'id')) return finish(new SubscriptionRpcError('unexpected_request'));
            if (message.method === 'account/updated' && identityEstablished) return finish(new SubscriptionRpcError('account_changed'));
            continue;
          }
          const waiter = pending.get(message.id);
          if (!waiter) continue;
          pending.delete(message.id);
          if (Object.hasOwn(message, 'error')) waiter.reject(new SubscriptionRpcError('rpc_error'));
          else if (!Object.hasOwn(message, 'result')) waiter.reject(new SubscriptionRpcError('protocol_error'));
          else {
            if (waiter.method === 'account/read') identityEstablished = true;
            waiter.resolve(message.result);
          }
        }
      });
      const request = (method, params) => new Promise((res, rej) => {
        if (finished) return rej(new SubscriptionRpcError('cancelled'));
        const id = nextId++;
        pending.set(id, { method, resolve: res, reject: rej });
        try { child.stdin.write(JSON.stringify({ method, id, params }) + '\n'); }
        catch { pending.delete(id); rej(new SubscriptionRpcError('protocol_error')); }
      });
      (async () => {
        try {
          await request('initialize', { clientInfo: { name: 'codex_whale_membership', title: 'Codex Whale Membership', version: '1.0.0' }, capabilities: { experimentalApi: false, explicitGatewayOauth: true, requestAttestation: false } });
          if (finished) return;
          child.stdin.write(JSON.stringify({ method: 'initialized', params: {} }) + '\n');
          const account = await request('account/read', { refreshToken: false });
          identityEstablished = true;
          if (accountOnly || account?.account?.type !== 'chatgpt') return finish(null, { account, rateLimits: null, usage: null });
          let rateLimits = null, usage = null, rateLimitsError = null, usageError = null;
          try { rateLimits = await request('account/rateLimits/read', { excludeResetCreditDetails: false }); }
          catch { if (finished) return; rateLimitsError = 'rate_limits_unavailable'; }
          try { usage = await request('account/usage/read', {}); }
          catch { if (finished) return; usageError = 'usage_unavailable'; }
          const after = await request('account/read', { refreshToken: false });
          if (safeScope(account) !== safeScope(after)) return finish(new SubscriptionRpcError('account_changed'));
          finish(null, { account: after, rateLimits, usage, rateLimitsError, usageError });
        } catch (error) { finish(error instanceof SubscriptionRpcError ? error : new SubscriptionRpcError('protocol_error')); }
      })();
    });
  }

  async close() {
    this.closed = true;
    for (const controller of this.jobs) controller.abort('cancelled');
    const results = await Promise.allSettled([...this.pendingQueries]);
    if (results.some(result => result.status === 'rejected' && result.reason?.code === 'cleanup_failed')) throw new SubscriptionRpcError('cleanup_failed');
  }
}
