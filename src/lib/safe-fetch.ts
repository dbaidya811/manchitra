export async function safeFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  opts: { retries?: number; timeoutMs?: number; backoffMs?: number } = {}
) {
  const { retries = 3, timeoutMs = 10000, backoffMs = 600 } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(input, { ...init, signal: ctrl.signal, cache: init.cache ?? 'no-store' });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err: any) {
      clearTimeout(timer);
      lastErr = err;
      const msg = String(err?.message || err?.toString?.() || err);
      const transient =
        msg.includes('wsarecv') ||
        msg.includes('ECONNRESET') ||
        msg.includes('EAI_AGAIN') ||
        msg.includes('timeout') ||
        msg.includes('EOF') ||
        msg.includes('fetch failed') ||
        msg.includes('aborted');
      if (!transient || attempt === retries) break;
      await new Promise(r => setTimeout(r, backoffMs * Math.pow(2, attempt)));
    }
  }
  throw lastErr;
}
