// Shared localStorage session utilities for the client booking/portal flows.
// Key: stb_client_<shopSlug>   TTL: 30 days

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function sessionKey(slug) { return `stb_client_${slug}`; }

export function saveClientSession(slug, { clientId, phone, firstName, lastName, otpVerifiedAt = null }) {
  try {
    localStorage.setItem(sessionKey(slug), JSON.stringify({
      clientId, phone, firstName, lastName, verifiedAt: Date.now(), otpVerifiedAt,
    }));
  } catch {}
}

export function loadClientSession(slug) {
  try {
    const raw = localStorage.getItem(sessionKey(slug));
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.verifiedAt || Date.now() - s.verifiedAt > SESSION_TTL_MS) {
      localStorage.removeItem(sessionKey(slug));
      return null;
    }
    return s;
  } catch { return null; }
}

export function clearClientSession(slug) {
  try { localStorage.removeItem(sessionKey(slug)); } catch {}
}

export function refreshClientSession(slug) {
  try {
    const raw = localStorage.getItem(sessionKey(slug));
    if (!raw) return;
    const s = JSON.parse(raw);
    s.verifiedAt = Date.now();
    localStorage.setItem(sessionKey(slug), JSON.stringify(s));
  } catch {}
}
