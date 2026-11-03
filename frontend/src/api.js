// API client for the PunjabScheme AI FastAPI backend.
// All paths go through /api (Vite proxies it to http://127.0.0.1:8000 in development).

const BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

export const BACKEND_DOWN_MESSAGE = "Backend not reachable. Start it with `uvicorn app.api:app` (from the backend folder).";

export class ApiError extends Error {
  constructor(message, status = 0, { unreachable = false } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.unreachable = unreachable;
  }
}

async function errorFromResponse(res) {
  let detail = "";
  let isJson = false;
  try {
    const text = await res.text();
    try {
      const body = JSON.parse(text);
      isJson = true;
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail)) {
        // FastAPI validation errors
        detail = body.detail.map((d) => `${(d.loc || []).slice(1).join(".")}: ${d.msg}`).join("; ");
      } else if (body.error) detail = body.error;
    } catch {
      detail = text.slice(0, 200);
    }
  } catch {
    /* ignore body read errors */
  }
  // The dev proxy answers 500/502/504 with a non-JSON body when FastAPI is not running.
  if (!isJson && [500, 502, 503, 504].includes(res.status)) {
    return new ApiError(BACKEND_DOWN_MESSAGE, res.status, { unreachable: true });
  }
  return new ApiError(detail || `Request failed (HTTP ${res.status})`, res.status);
}

export async function request(path, { method = "GET", body, form, signal } = {}) {
  const init = { method, signal, headers: { Accept: "application/json" } };
  if (form) init.body = form;
  else if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, init);
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new ApiError(BACKEND_DOWN_MESSAGE, 0, { unreachable: true });
  }
  if (!res.ok) throw await errorFromResponse(res);
  if (res.status === 204) return null;
  try {
    return await res.json();
  } catch {
    throw new ApiError("The server returned an unexpected (non-JSON) response.", res.status);
  }
}

const enc = encodeURIComponent;

export const api = {
  health: (o) => request("/health", o),
  agentInfo: (o) => request("/agent/info", o),
  stats: (o) => request("/stats", o),

  schemes: (params = {}, o) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/schemes${qs ? `?${qs}` : ""}`, o);
  },
  scheme: (id, o) => request(`/schemes/${enc(id)}`, o),

  eligibility: (profile, schemeIds = [], o) =>
    request("/eligibility", { method: "POST", body: { profile, scheme_ids: schemeIds }, ...o }),
  compare: (schemeIds, o) => request("/compare", { method: "POST", body: { scheme_ids: schemeIds }, ...o }),

  updates: (o) => request("/updates", o),
  runUpdates: (sourceId, o) =>
    request(`/updates/run${sourceId ? `?source_id=${enc(sourceId)}` : ""}`, { method: "POST", ...o }),
  ingest: ({ url, title, sourceId, file }, o) => {
    const form = new FormData();
    form.append("url", url);
    form.append("title", title || "");
    if (sourceId) form.append("source_id", sourceId);
    if (file) form.append("file", file);
    return request("/ingest", { method: "POST", form, ...o });
  },

  sessionMessages: (sessionId, o) => request(`/sessions/${enc(sessionId)}/messages`, o),

  user: (userId, o) => request(`/users/${enc(userId)}`, o),
  setConsent: (userId, consent, o) =>
    request(`/users/${enc(userId)}/consent`, { method: "PUT", body: { consent }, ...o }),
  saveProfile: (userId, profile, o) =>
    request(`/users/${enc(userId)}/profile`, { method: "PUT", body: { profile }, ...o }),
  deleteUser: (userId, o) => request(`/users/${enc(userId)}`, { method: "DELETE", ...o }),
  saveScheme: (userId, schemeId, note, o) =>
    request(`/users/${enc(userId)}/saved`, { method: "POST", body: { scheme_id: schemeId, note: note || null }, ...o }),
  unsaveScheme: (userId, schemeId, o) =>
    request(`/users/${enc(userId)}/saved/${enc(schemeId)}`, { method: "DELETE", ...o }),
};

/**
 * Parse one SSE block ("event: x\ndata: ...\ndata: ...") into {event, data}.
 * Comment lines (": ping") are ignored; multi-line data is joined with "\n".
 */
function parseSseBlock(block) {
  let event = "message";
  const data = [];
  for (const line of block.split("\n")) {
    if (!line || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "data") data.push(value);
  }
  return data.length ? { event, data: data.join("\n") } : null;
}

/**
 * POST /api/chat and consume its Server-Sent Events stream.
 * Handlers: onSession({session_id}), onTrace(event), onFinal(result).
 * Resolves with the final result; rejects on network errors, `event: error`, or a truncated stream.
 */
export async function streamChat({ message, sessionId, userId, signal, onSession, onTrace, onFinal }) {
  let res;
  try {
    res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ message, session_id: sessionId || null, user_id: userId || null }),
      signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new ApiError(BACKEND_DOWN_MESSAGE, 0, { unreachable: true });
  }
  if (!res.ok) throw await errorFromResponse(res);
  if (!res.body) throw new ApiError("Streaming is not supported by this browser.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let finalResult = null;
  let streamError = null;

  const handle = (block) => {
    const parsed = parseSseBlock(block);
    if (!parsed) return;
    let payload;
    try {
      payload = JSON.parse(parsed.data);
    } catch {
      return; // ignore malformed payloads rather than killing the stream
    }
    if (parsed.event === "session") onSession?.(payload);
    else if (parsed.event === "trace") onTrace?.(payload);
    else if (parsed.event === "final") {
      finalResult = payload;
      onFinal?.(payload);
    } else if (parsed.event === "error") {
      streamError = new ApiError(payload?.error || "The agent failed while answering.", 500);
    }
  };

  const append = (chunk) => {
    let text = buffer + chunk;
    // Keep a trailing "\r" until the next chunk: it may be the first half of "\r\n".
    const trailingCR = text.endsWith("\r");
    if (trailingCR) text = text.slice(0, -1);
    text = text.replace(/\r\n?/g, "\n");
    let idx;
    while ((idx = text.indexOf("\n\n")) !== -1) {
      handle(text.slice(0, idx));
      text = text.slice(idx + 2);
    }
    buffer = text + (trailingCR ? "\r" : "");
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    append(decoder.decode(value, { stream: true }));
    if (streamError) break;
  }
  append(decoder.decode());
  if (buffer.trim()) handle(buffer.replace(/\r/g, ""));
  buffer = "";

  if (streamError) throw streamError;
  if (!finalResult) throw new ApiError("The connection closed before the answer was complete. Please try again.");
  return finalResult;
}
