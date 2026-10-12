import { SubscriptionRpc, SubscriptionRpcError, accountFingerprint } from './subscription-rpc.mjs';

const SOURCE = 'codex-app-server';
const PLANS = new Set(['free', 'go', 'plus', 'pro', 'prolite', 'promax', 'team', 'self_serve_business_prolite', 'self_serve_business_usage_based', 'business', 'ent26', 'enterprise_cbp_automation', 'enterprise_cbp_usage_based', 'enterprise', 'edu', 'edu_plus', 'edu_pro', 'unknown']);
const PRO = new Set(['pro', 'prolite', 'promax']);
const SUMMARY_FIELDS = ['lifetimeTokens', 'peakDailyTokens', 'longestRunningTurnSec', 'currentStreakDays', 'longestStreakDays'];
const ERROR_CODES = new Set(['unavailable', 'closed', 'cancelled', 'timeout', 'cli_unavailable', 'cleanup_failed', 'unsafe_temp', 'protocol_error', 'process_ended', 'output_limit', 'unexpected_request', 'account_changed', 'rpc_error']);
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : null;
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
const percent = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
function isoSeconds(value) {
  if (!Number.isSafeInteger(value) || value < 0) return null;
  try { return new Date(value * 1000).toISOString(); } catch { return null; }
}
function isoNow(value) { try { return new Date(value).toISOString(); } catch { return null; } }
function publicPlan(value) { return PLANS.has(value) ? value : null; }
function canonicalPlan(value) {
  if (PRO.has(value)) return 'pro';
  if (value === 'team' || value?.startsWith('self_serve_business_')) return 'business';
  if (value === 'ent26' || value?.startsWith('enterprise_')) return 'enterprise';
  if (value?.startsWith('edu_')) return 'edu';
  return value === 'unknown' ? null : value;
}
function emptySnapshot(error = 'unavailable') {
  return { ok: false, accountStatus: 'unavailable', plan: null, planLabel: '暂时无法读取', reportedPlan: null, source: SOURCE, updatedAt: null, stale: true, error, windows: [], resets: { remaining: null, detailsAvailable: false, grants: [] }, dailyUsageBuckets: [], tokenSummary: Object.fromEntries(SUMMARY_FIELDS.map(field => [field, null])) };
}

// Projection intentionally excludes account/email/auth/routing fields, credit IDs,
// arbitrary server banners, and every raw error body.
export function normalizeSubscription(raw, { now = Date.now() } = {}) {
  const snapshot = emptySnapshot();
  const accountResult = object(raw?.account), account = object(accountResult?.account);
  if (!accountResult || !Object.hasOwn(accountResult, 'account')) return snapshot;
  snapshot.updatedAt = isoNow(now);
  snapshot.stale = false;
  if (accountResult.account === null) {
    Object.assign(snapshot, { ok: true, accountStatus: 'not-logged-in', planLabel: '未登录', error: null });
    return snapshot;
  }
  if (account?.type === 'apiKey') {
    Object.assign(snapshot, { ok: true, accountStatus: 'api-key', planLabel: 'API Key 登录', error: null });
    return snapshot;
  }
  if (account?.type !== 'chatgpt') {
    snapshot.planLabel = '此登录方式未提供会员额度'; snapshot.error = 'unsupported_auth';
    return snapshot;
  }
  const reportedPlan = publicPlan(account.planType), plan = canonicalPlan(reportedPlan);
  Object.assign(snapshot, { ok: true, accountStatus: 'chatgpt', reportedPlan, plan, planLabel: ({ free: 'Free', go: 'Go', plus: 'Plus', pro: 'Pro', business: 'Business', enterprise: 'Enterprise', edu: 'Edu' })[plan] || '会员类型未提供', error: null });
  const rates = object(raw?.rateLimits), byId = object(rates?.rateLimitsByLimitId);
  const buckets = byId ? Object.entries(byId).slice(0, 64) : rates?.rateLimits ? [['codex', rates.rateLimits]] : [];
  let sequence = 0;
  for (const [key, bucket] of buckets) {
    if (!object(bucket)) continue;
    // Unknown bucket identifiers remain useful without returning backend strings.
    const bucketId = key === 'codex' ? 'codex' : `quota-${++sequence}`;
    for (const field of ['primary', 'secondary']) {
      const window = object(bucket[field]);
      if (!window) continue;
      const minutes = count(window.windowDurationMins);
      if (PRO.has(reportedPlan) && minutes === 300) continue;
      const used = percent(window.usedPercent);
      snapshot.windows.push({ bucketId, label: minutes === 300 ? '5 小时额度' : minutes === 10080 ? '每周额度' : '其他额度窗口', windowMinutes: minutes, usedPercent: used, remainingPercent: used === null ? null : Math.max(0, Math.min(100, 100 - used)), resetAt: isoSeconds(window.resetsAt), remainingTokens: null });
    }
  }
  if (plan === 'plus' && !snapshot.windows.some(window => window.windowMinutes === 300)) snapshot.windows.unshift({ bucketId: 'codex', label: '5 小时额度', windowMinutes: 300, usedPercent: null, remainingPercent: null, resetAt: null, remainingTokens: null });
  const resets = object(rates?.rateLimitResetCredits);
  snapshot.resets.remaining = count(resets?.availableCount);
  snapshot.resets.detailsAvailable = Array.isArray(resets?.credits);
  if (snapshot.resets.detailsAvailable) {
    snapshot.resets.grants = resets.credits.slice(0, 128).filter(object).map(grant => ({ status: ['available', 'redeeming', 'redeemed', 'unknown'].includes(grant.status) ? grant.status : 'unknown', title: typeof grant.title === 'string' && grant.title.length <= 160 && !/[\x00-\x1f\x7f]/.test(grant.title) ? grant.title : null, grantedAt: isoSeconds(grant.grantedAt), expiresAt: isoSeconds(grant.expiresAt) }));
  }
  const usage = object(raw?.usage), summary = object(usage?.summary);
  for (const field of SUMMARY_FIELDS) snapshot.tokenSummary[field] = count(summary?.[field]);
  if (Array.isArray(usage?.dailyUsageBuckets)) {
    snapshot.dailyUsageBuckets = usage.dailyUsageBuckets.slice(0, 3660).filter(bucket => {
      if (!object(bucket) || typeof bucket.startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(bucket.startDate)) return false;
      try { return new Date(bucket.startDate).toISOString().slice(0, 10) === bucket.startDate; } catch { return false; }
    }).map(bucket => ({ date: bucket.startDate, tokens: count(bucket.tokens) }));
  }
  if (!rates && !usage) snapshot.error = 'quota_and_usage_unavailable';
  else if (!rates) snapshot.error = 'rate_limits_unavailable';
  else if (!usage) snapshot.error = 'usage_unavailable';
  return snapshot;
}

export class SubscriptionService {
  constructor({ query, now = Date.now, cacheTtlMs = 30000, timeoutMs = 60000, ...rpcOptions } = {}) {
    this.rpc = query ? null : new SubscriptionRpc({ ...rpcOptions, timeoutMs });
    this.query = query || (options => this.rpc.query(options));
    this.now = now;
    this.timeoutMs = Math.max(1, Math.min(60000, Number.isFinite(timeoutMs) ? timeoutMs : 60000));
    this.cacheTtlMs = Math.max(0, Math.min(30000, Number.isFinite(cacheTtlMs) ? cacheTtlMs : 30000));
    this.cache = null; this.inflight = null; this.controller = null; this.closed = false;
  }

  get({ force = false } = {}) {
    if (this.closed) return Promise.resolve(emptySnapshot('closed'));
    if (this.inflight) return this.inflight.then(value => structuredClone(value));
    this.controller = new AbortController();
    const controller = this.controller;
    const timer = setTimeout(() => controller.abort('timeout'), this.timeoutMs);
    const call = (options = {}) => new Promise((resolve, reject) => {
      const abort = () => reject(new SubscriptionRpcError(controller.signal.reason === 'timeout' ? 'timeout' : 'cancelled'));
      if (controller.signal.aborted) return abort();
      controller.signal.addEventListener('abort', abort, { once: true });
      Promise.resolve().then(() => this.query({ ...options, signal: controller.signal })).then(resolve, reject).finally(() => controller.signal.removeEventListener('abort', abort));
    });
    this.inflight = (async () => {
      try {
        const at = this.now();
        if (!force && this.cache && at >= this.cache.at && at - this.cache.at < this.cacheTtlMs) {
          const checked = await call({ accountOnly: true });
          if (this.closed || controller.signal.aborted) throw new SubscriptionRpcError('closed');
          const identity = accountFingerprint(checked?.account);
          if (identity && identity === this.cache.identity) return structuredClone(this.cache.snapshot);
          this.cache = null;
        } else this.cache = null;
        const raw = await call();
        if (this.closed || controller.signal.aborted) throw new SubscriptionRpcError('closed');
        const snapshot = normalizeSubscription(raw, { now: this.now() });
        const identity = accountFingerprint(raw?.account);
        if (snapshot.ok && snapshot.accountStatus === 'chatgpt' && identity) this.cache = { at: this.now(), identity, snapshot };
        return snapshot;
      } catch (error) {
        this.cache = null;
        const code = error instanceof SubscriptionRpcError && ERROR_CODES.has(error.code) ? error.code : 'unavailable';
        return emptySnapshot(code);
      } finally {
        clearTimeout(timer);
        if (this.controller === controller) this.controller = null;
      }
    })().finally(() => { this.inflight = null; });
    return this.inflight.then(value => structuredClone(value));
  }

  async close() {
    this.closed = true; this.cache = null;
    this.controller?.abort('cancelled');
    const results = await Promise.allSettled([
      this.inflight || Promise.resolve(),
      this.rpc?.close() || Promise.resolve(),
      Promise.resolve().then(() => this.query.close?.()),
    ]);
    if (results.some(result => result.status === 'rejected')) throw new SubscriptionRpcError('cleanup_failed');
  }
}
