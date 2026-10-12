// Codex membership presentation for the MeteorNOX-based companion.
(function (host) {
  'use strict';
  const MISSING = '官方未提供';
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const percent = value => finite(value) && value >= 0 && value <= 100 ? value : null;
  const usedPercent = value => finite(value) && value >= 0 ? value : null;
  const count = value => finite(value) && value >= 0 && Number.isSafeInteger(value) ? value : null;
  function safeText(value, fallback = '') {
    if (typeof value !== 'string') return fallback;
    return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\b[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+\b/g, '[已隐藏]')
      .replace(/\b(?:sk-|sess-|Bearer\s+)[A-Za-z0-9_-]{8,}/gi, '[已隐藏]').slice(0, 180).trim() || fallback;
  }
  // Only the unchanged stock summary receives the new presentation. Any
  // user-edited text, module order, style, or additional field keeps its renderer.
  function isDefaultSummary(modules, canonical) {
    function same(left, right) {
      if (left === right) return true;
      if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
      if (Array.isArray(left) !== Array.isArray(right)) return false;
      const a = Object.keys(left).sort(), b = Object.keys(right).sort();
      return a.length === b.length && a.every((key, index) => key === b[index] && same(left[key], right[key]));
    }
    return Array.isArray(modules) && Array.isArray(canonical) && same(modules, canonical);
  }
  function validTime(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)) ? value : null;
  }
  function formatDate(value) {
    const time = validTime(value);
    return time ? new Date(time).toLocaleString('zh-CN', { hour12: false }) : MISSING;
  }
  function countdown(value, now = Date.now()) {
    const time = validTime(value);
    if (!time) return MISSING;
    const seconds = Math.ceil((Date.parse(time) - now) / 1000);
    if (seconds <= 0) return '已到重置时间，等待更新';
    const days = Math.floor(seconds / 86400), hours = Math.floor(seconds % 86400 / 3600), minutes = Math.floor(seconds % 3600 / 60);
    return (days ? days + '天 ' : '') + hours + '小时 ' + minutes + '分 ' + seconds % 60 + '秒';
  }
  function formatPercent(value) { return value === null ? MISSING : new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(value) + '%'; }
  function formatCount(value) { return value === null ? MISSING : value.toLocaleString('zh-CN'); }
  function fiveHour(window) {
    return window?.windowMinutes === 300 || /(?:5\s*(?:h\b|hours?\b|小时)|five[-_ ]?hours?)/i.test(String(window?.bucketId || '') + ' ' + String(window?.label || ''));
  }
  function errorText(value) {
    const messages = { unavailable: '暂时无法读取官方额度，请稍后刷新', cli_unavailable: '没有找到可用的 Codex 组件，请先安装或更新 Codex',
      unsupported_auth: '当前登录方式未提供会员额度', quota_and_usage_unavailable: '官方额度和活动记录暂不可用',
      rate_limits_unavailable: '官方额度暂不可用，活动记录可单独查看', usage_unavailable: '官方活动记录暂不可用',
      timeout: '读取官方额度超时，请稍后刷新', closed: '额度查询服务已停止', account_changed: '账号发生变化，请重新刷新' };
    const text = safeText(value); return messages[text] || (/^[a-z][a-z0-9_]+$/.test(text) ? '额度查询未完成，请稍后刷新' : text);
  }
  function present(data = {}, now = Date.now()) {
    data = data && typeof data === 'object' ? data : {};
    const plan = safeText(data.plan).toLowerCase(), rawLabel = safeText(data.planLabel);
    const isPro = /^pro(?:[-_ ]?(?:lite|flex|max))?$/.test(plan) || /^(?:chatgpt\s+)?pro(?:\b|[-_ ])/.test(rawLabel.toLowerCase());
    const planLabel = isPro ? 'Pro' : ({ free: 'Free', plus: 'Plus', business: 'Business', team: 'Team', enterprise: 'Enterprise', edu: 'Edu' }[plan] || rawLabel || (plan ? safeText(data.plan) : '会员信息不可用'));
    const windows = (Array.isArray(data.windows) ? data.windows : []).filter(window => window && typeof window === 'object' && !(isPro && fiveHour(window))).slice(0, 128).map(window => {
      const used = usedPercent(window.usedPercent), remaining = percent(window.remainingPercent);
      const minutes = finite(window.windowMinutes) && window.windowMinutes > 0 ? window.windowMinutes : null;
      return { label: minutes === 300 ? '5 小时额度' : minutes === 10080 ? '每周额度' : safeText(window.label, '额度窗口'),
        windowMinutes: minutes, usedPercent: used ?? (remaining === null ? null : 100 - remaining),
        remainingPercent: remaining ?? (used === null ? null : Math.max(0, 100 - used)), resetAt: validTime(window.resetAt),
        remainingTokens: null, countdown: countdown(window.resetAt, now) };
    });
    const accountStatus = safeText(data.accountStatus).toLowerCase();
    const statuses = { chatgpt: 'ChatGPT 账号', 'api-key': 'API Key 登录：不提供 ChatGPT 会员额度', api_key: 'API Key 登录：不提供 ChatGPT 会员额度',
      'not-logged-in': '未登录 Codex', signed_out: '未登录 Codex', unauthenticated: '未登录 Codex', unsupported: '当前登录方式不提供会员额度', unavailable: '登录或额度信息暂不可用', unknown: '无法确认登录方式' };
    const accountLabel = statuses[accountStatus] || '无法确认登录方式';
    const unavailable = data.ok !== true || !plan || ['api-key', 'api_key', 'not-logged-in', 'signed_out', 'unauthenticated', 'unsupported', 'unavailable'].includes(accountStatus);
    const resets = data.resets && typeof data.resets === 'object' ? data.resets : {};
    const grants = (Array.isArray(resets.grants) ? resets.grants : []).slice(0, 128).map(grant => ({
      status: ({ available: '可用', redeeming: '处理中', redeemed: '已用', pending: '处理中', consumed: '已用', expired: '已过期', unknown: '状态未提供' })[safeText(grant?.status)] || '状态未提供', title: safeText(grant?.title, '重置授予记录'),
      grantedAt: validTime(grant?.grantedAt), expiresAt: validTime(grant?.expiresAt) }));
    const daily = (Array.isArray(data.dailyUsageBuckets) ? data.dailyUsageBuckets : []).filter(bucket =>
      typeof bucket?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(bucket.date) &&
      Number.isFinite(Date.parse(bucket.date + 'T00:00:00Z')) && new Date(bucket.date + 'T00:00:00Z').toISOString().slice(0, 10) === bucket.date)
      .slice(0, 3660).map(bucket => ({ date: bucket.date, tokens: count(bucket.tokens) }));
    const primary = !isPro && plan === 'plus' ? windows.find(window => window.windowMinutes === 300) : windows.find(window => window.windowMinutes === 10080);
    const weekly = windows.find(window => window.windowMinutes === 10080);
    const summaryAmount = unavailable ? accountStatus === 'api-key' || accountStatus === 'api_key' ? 'API Key 登录' : '暂不可用' : primary ?
      (primary.windowMinutes === 300 ? '5h' : '周') + ' 剩余 ' + formatPercent(primary.remainingPercent) : '额度未提供';
    const resetCount = count(resets.remaining), resetHint = resetCount === null ? '重置次数：' + MISSING : '可重置 ' + formatCount(resetCount) + ' 次';
    const summaryHint = unavailable ? errorText(data.error) || accountLabel : isPro ? resetHint :
      (weekly ? '周剩余 ' + formatPercent(weekly.remainingPercent) : '周额度：' + MISSING) + ' · ' + resetHint;
    return { plan: plan || null, planLabel, isPro, accountStatus, accountLabel, unavailable, windows, weekly,
      source: data.source === 'codex-app-server' ? 'Codex 官方额度与活动记录' : safeText(data.source, '来源未提供'), updatedAt: validTime(data.updatedAt), stale: data.stale === true,
      error: errorText(data.error), resets: { remaining: count(resets.remaining), detailsAvailable: resets.detailsAvailable === true, grants },
      dailyUsageBuckets: daily, tokenSummary: { lifetimeTokens: count(data.tokenSummary?.lifetimeTokens), peakDailyTokens: count(data.tokenSummary?.peakDailyTokens) },
      summary: { label: plan ? planLabel + ' 会员' : 'Codex 会员与额度', amount: summaryAmount,
        remainingPercent: unavailable ? null : primary?.remainingPercent ?? null, quotaLabel: primary?.label || '会员额度',
        hint: summaryHint + (data.stale === true ? data.updatedAt && plan ? ' · 上次数据' : ' · 未确认' : '') } };
  }
  if (typeof module === 'object' && module.exports) { module.exports = { present, safeText, countdown, formatDate, formatPercent, formatCount, fiveHour, isDefaultSummary }; return; }
  if (!host.document) return;
  const document = host.document, dialog = document.getElementById('membership-dialog'), content = document.getElementById('membership-content');
  const displayToggle = document.getElementById('membership-display'), DISPLAY_KEY = 'dshw-membership-display';
  let enabled = true;
  try { enabled = host.localStorage.getItem(DISPLAY_KEY) !== 'false'; } catch {}
  if (displayToggle) {
    displayToggle.checked = enabled;
    displayToggle.addEventListener('change', () => {
      enabled = displayToggle.checked;
      try { host.localStorage.setItem(DISPLAY_KEY, String(enabled)); } catch {}
    });
  }
  let data = { ok: false }, loading = false, job = null, lastFetchAt = -Infinity, cooldownUntil = 0, disposed = false;
  const bindings = new Map(), listeners = new Set(), COOLDOWN_MS = 15000, POLL_MS = 60000;
  function el(tag, text, className) { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; }
  function line(parent, label, text) { const row = el('div', undefined, 'membership-line'), value = el('strong', text); row.append(el('span', label), value); parent.append(row); return value; }
  function updateButton() {
    const button = document.getElementById('membership-refresh'); if (!button) return;
    const seconds = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
    button.disabled = loading || seconds > 0; button.textContent = loading ? '查询中…' : seconds ? seconds + ' 秒后刷新' : '刷新额度';
  }
  function renderDetails() {
    if (!dialog || !content || !dialog.open) return;
    const view = present(data), fragment = document.createDocumentFragment();
    const info = el('section', undefined, 'membership-card');
    line(info, '当前会员', view.plan ? view.planLabel : '无法确认'); line(info, '登录方式', view.accountLabel);
    line(info, '数据来源', view.source); line(info, '更新时间', view.updatedAt ? formatDate(view.updatedAt) : '尚无成功更新时间');
    fragment.append(info);
    if (loading || view.unavailable || view.stale || view.error) fragment.append(el('p', loading ? '正在查询会员额度…' :
      [view.unavailable ? view.accountLabel : '', view.stale ? view.updatedAt && view.plan ? '显示上次数据，当前刷新未成功' : '当前数据未确认，请刷新' : '', view.error].filter(Boolean).join(' · '), 'notice membership-notice'));
    if (!view.windows.length) fragment.append(el('p', '额度窗口：' + MISSING, 'membership-empty'));
    for (const window of view.windows) {
      const card = el('section', undefined, 'membership-card'); card.append(el('h3', window.label));
      if (window.remainingPercent !== null) { const meter = el('progress'); meter.max = 100; meter.value = window.remainingPercent; meter.setAttribute('aria-label', window.label + '剩余百分比'); card.append(meter); }
      line(card, '剩余', formatPercent(window.remainingPercent)); line(card, '已用', formatPercent(window.usedPercent));
      line(card, '重置日期', formatDate(window.resetAt));
      const clock = line(card, '距离重置', window.countdown); clock.dataset.membershipResetAt = window.resetAt || ''; clock.setAttribute('aria-live', 'off');
      card.append(el('p', '剩余 token 数：官方未提供', 'membership-help')); fragment.append(card);
    }
    const reset = el('section', undefined, 'membership-card'); reset.append(el('h3', '额度重置次数'));
    line(reset, '剩余次数', formatCount(view.resets.remaining));
    if (!view.resets.detailsAvailable) reset.append(el('p', '授予与到期明细：' + MISSING, 'membership-help'));
    else if (!view.resets.grants.length) reset.append(el('p', '暂无授予与到期记录', 'membership-help'));
    if (view.resets.detailsAvailable) for (const grant of view.resets.grants) {
      const row = el('div', undefined, 'membership-grant'); row.append(el('h4', grant.title));
      line(row, '状态', grant.status); line(row, '授予时间', formatDate(grant.grantedAt)); line(row, '到期时间', formatDate(grant.expiresAt)); reset.append(row);
    }
    reset.append(el('p', '这里只显示剩余次数，不执行额度重置。', 'membership-help')); fragment.append(reset);
    const tokens = el('section', undefined, 'membership-card'); tokens.append(el('h3', 'Token 活动明细'));
    line(tokens, '累计 token 活动', formatCount(view.tokenSummary.lifetimeTokens)); line(tokens, '单日最高 token 活动', formatCount(view.tokenSummary.peakDailyTokens));
    if (view.dailyUsageBuckets.length) {
      const table = el('table'), head = el('thead'), header = el('tr'), body = el('tbody'); header.append(el('th', '日期'), el('th', 'Token 活动')); head.append(header);
      for (const bucket of view.dailyUsageBuckets) { const row = el('tr'); row.append(el('td', bucket.date), el('td', formatCount(bucket.tokens))); body.append(row); }
      table.append(head, body); tokens.append(table);
    } else tokens.append(el('p', '每日 token 明细：' + MISSING, 'membership-help'));
    tokens.append(el('p', 'Token 活动记录不等于剩余额度。官方只提供额度百分比，未提供剩余或总 token 配额。', 'membership-help')); fragment.append(tokens);
    content.replaceChildren(fragment); updateButton();
  }
  function writeBubble(parts) {
    const view = present(data), frame = parts.label.closest('.dshwv-frame'); if (!frame?.hasAttribute('data-whale-membership')) return;
    parts.label.textContent = view.summary.label; parts.hint.textContent = view.summary.hint;
    const caption = el('span', view.summary.amount, 'membership-bubble-caption');
    parts.amount.replaceChildren(caption);
    // An unknown quota has no bar. Zero remains a real empty bar with 0%.
    if (view.summary.remainingPercent !== null) {
      const meter = el('progress', undefined, 'membership-bubble-progress');
      meter.max = 100; meter.value = view.summary.remainingPercent;
      meter.setAttribute('aria-label', view.summary.quotaLabel + '剩余 ' + formatPercent(view.summary.remainingPercent));
      parts.amount.append(meter);
    }
  }
  function emit() {
    for (const [frame, parts] of bindings) { if (!parts.label.isConnected) bindings.delete(frame); else writeBubble(parts); }
    renderDetails(); updateButton(); for (const listener of listeners) { try { listener(present(data)); } catch {} }
  }
  async function refresh({ force = false } = {}) {
    if (disposed) return present(data);
    if (job) return job;
    const now = Date.now();
    if (force && now < cooldownUntil || !force && now - lastFetchAt < POLL_MS) { emit(); return present(data); }
    lastFetchAt = now; if (force) cooldownUntil = now + COOLDOWN_MS;
    loading = true; emit();
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 65000);
    job = (async () => {
      try {
        const response = await fetch('/api/subscription' + (force ? '?refresh=1' : ''), { cache: 'no-store', signal: controller.signal });
        const next = await response.json();
        if (!next || typeof next !== 'object') throw new Error('invalid-response');
        if (!response.ok && next.ok !== false) throw new Error('failed-response');
        data = next;
      } catch {
        data = { ok: false, accountStatus: 'unavailable', error: '额度查询失败，请稍后刷新' };
      } finally { clearTimeout(timeout); loading = false; job = null; emit(); }
      return present(data);
    })();
    return job;
  }
  function renderBubble(parts) {
    const frame = parts.label.closest('.dshwv-frame'); if (frame) frame.setAttribute('data-whale-membership', '1');
    for (const [element, role] of [[parts.label, 'label'], [parts.amount, 'amount'], [parts.hint, 'hint']]) {
      host.WhaleMoney?.clearBindings(element); element.style.display = ''; element.className = 'dshwv-' + role + ' membership-bubble-' + role;
      element.style.color = ''; element.style.width = ''; element.style.maxWidth = ''; element.style.fontSize = ''; element.style.lineHeight = ''; element.style.whiteSpace = ''; element.style.minHeight = '';
    }
    if (frame) bindings.set(frame, parts); writeBubble(parts);
  }
  function clearFrame(frame) {
    if (!frame) return;
    frame.removeAttribute('data-whale-membership'); bindings.delete(frame);
  }
  function addMenuEntry(menu) {
    if (!menu || menu.querySelector('[data-whale-membership-open]')) return;
    const button = el('button', '会员与额度', 'dshwv-api-open');
    button.type = 'button'; button.setAttribute('data-whale-membership-open', '');
    button.style.cssText = 'width:100%;margin:6px 0;padding:7px;border:1px solid #b8c8e6;border-radius:8px;background:#f7f9ff;color:#203170;cursor:pointer';
    button.addEventListener('click', event => { event.stopPropagation(); open(); });
    menu.appendChild(button);
  }
  function open() {
    if (!dialog) return;
    const settings = document.getElementById('settings-dialog'); if (settings?.open) settings.close();
    if (!dialog.open) dialog.showModal(); renderDetails(); void refresh();
  }
  const openChat = () => { if (host.whaleDesktop?.openChat) Promise.resolve(host.whaleDesktop.openChat()).catch(() => host.whaleToast?.('无法打开聊天设置')); };
  document.getElementById('membership-close')?.addEventListener('click', () => dialog.close());
  document.getElementById('membership-refresh')?.addEventListener('click', () => void refresh({ force: true }));
  document.getElementById('membership-chat')?.addEventListener('click', openChat);
  document.getElementById('membership-widget-menu')?.addEventListener('click', () => { dialog.close(); host.dispatchEvent(new Event('whale-open-widget-menu')); });
  host.addEventListener('whale-open-membership', open);
  const visible = () => { if (!document.hidden) void refresh(); };
  document.addEventListener('visibilitychange', visible);
  const timer = setInterval(() => { if (!document.hidden) void refresh(); }, POLL_MS);
  const tick = setInterval(() => { if (dialog?.open) {
    for (const clock of content.querySelectorAll('[data-membership-reset-at]')) { const text = countdown(clock.dataset.membershipResetAt); if (clock.textContent !== text) clock.textContent = text; }
    updateButton();
  } }, 1000);
  host.addEventListener('pagehide', () => { disposed = true; clearInterval(timer); clearInterval(tick); document.removeEventListener('visibilitychange', visible); }, { once: true });
  host.WhaleMembership = Object.freeze({ present, refresh, open, renderBubble, clearFrame, addMenuEntry, isDefaultSummary, isEnabled: () => enabled, snapshot: () => present(data), onChange(listener) { listeners.add(listener); listener(present(data)); return () => listeners.delete(listener); } });
  if (host.whaleDesktop?.testMode) host.__whaleMembershipTest = Object.freeze({ setFixture(value) { data = value; lastFetchAt = Date.now(); emit(); }, snapshot: () => present(data) });
})(globalThis);
