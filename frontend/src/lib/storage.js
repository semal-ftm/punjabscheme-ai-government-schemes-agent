// Storage access can throw (private mode, blocked cookies, quota): always wrap it.

function store(kind) {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readJSON(kind, key, fallback = null) {
  try {
    const raw = store(kind)?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(kind, key, value) {
  try {
    if (value === null || value === undefined) store(kind)?.removeItem(key);
    else store(kind)?.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable or full: the app still works without it */
  }
}

export const KEYS = {
  userId: "ps_user_id",
  chat: "ps_chat_v1",
  checkerProfile: "ps_checker_profile_v1",
};
