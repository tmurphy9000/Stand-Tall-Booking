// Shared localStorage session utilities for the client booking/portal flows.
// Key: stb_client_<shopSlug>   TTL: 30 days
// Version 2: sessions without version:2 are immediately cleared (invalidates all pre-fix sessions).

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_VERSION = 2;

function sessionKey(slug) { return `stb_client_${slug}`; }

export function saveClientSession(slug, { clientId, phone, firstName, lastName, otpVerifiedAt = null }) {
  try {
    localStorage.setItem(sessionKey(slug), JSON.stringify({
      version: SESSION_VERSION,
      clientId, phone, firstName, lastName,
      verifiedAt: Date.now(),
      otpVerifiedAt,
    }));
  } catch {}
}

export function loadClientSession(slug) {
  try {
    const raw = localStorage.getItem(sessionKey(slug));
    if (!raw) return null;
    const s = JSON.parse(raw);
    // Clear any pre-v2 session immediately — forces fresh OTP verification
    if (s.version !== SESSION_VERSION) {
      localStorage.removeItem(sessionKey(slug));
      return null;
    }
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
