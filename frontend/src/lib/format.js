import { NOT_CONFIRMED, optionLabel } from "./constants.js";

const ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
export const hasUrdu = (text) => typeof text === "string" && ARABIC_SCRIPT.test(text);
export const urduClass = (text) => (hasUrdu(text) ? "font-urdu" : "");

function toDate(value) {
  if (!value || value === NOT_CONFIRMED) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value, fallback = NOT_CONFIRMED) {
  const d = toDate(value);
  if (!d) return value && value !== NOT_CONFIRMED ? String(value) : fallback;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value, fallback = "Never") {
  const d = toDate(value);
  if (!d) return fallback;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(value, fallback = "Never") {
  const d = toDate(value);
  if (!d) return fallback;
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  const future = sec < 0;
  const s = Math.abs(sec);
  const units = [[86400 * 365, "year"], [86400 * 30, "month"], [86400, "day"], [3600, "hour"], [60, "minute"]];
  for (const [size, unit] of units) {
    if (s >= size) {
      const n = Math.floor(s / size);
      const label = `${n} ${unit}${n === 1 ? "" : "s"}`;
      return future ? `in ${label}` : `${label} ago`;
    }
  }
  return future ? "in under a minute" : "just now";
}

/** Whole days from today until an ISO date (negative when past). null if not a date. */
export function daysUntil(value) {
  const d = toDate(value);
  if (!d) return null;
  const today = new Date();
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((b - a) / 86400000);
}

export function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (typeof value === "number") return value.toLocaleString("en-US");
  if (typeof value === "object") return JSON.stringify(value);
  return optionLabel(value);
}

const OPS = {
  eq: "is", in: "is one of", not_in: "is not one of", lt: "less than", gt: "more than", lte: "at most", gte: "at least",
  is_true: "must be yes", is_false: "must be no", manual: "checked by the scheme authority",
};

/** Human-readable rule, e.g. "Age between 18 and 35". */
export function describeRule(fieldLabel, op, value) {
  if (op === "manual") return "Checked by the scheme authority";
  if (op === "between" && Array.isArray(value)) return `${fieldLabel} between ${formatValue(value[0])} and ${formatValue(value[1])}`;
  if (op === "is_true" || op === "is_false") return `${fieldLabel}: ${OPS[op]}`;
  return `${fieldLabel} ${OPS[op] || op} ${formatValue(value)}`;
}

export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export const isUrl = (v) => typeof v === "string" && /^https?:\/\//i.test(v);
