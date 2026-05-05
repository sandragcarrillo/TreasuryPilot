import "server-only";
import { isAddress } from "viem";

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

export function requireString(
  raw: unknown,
  field: string,
  opts: { min?: number; max: number; trim?: boolean } = { max: 500 }
): Result<string> {
  if (typeof raw !== "string") {
    return { ok: false, message: `${field} must be a string` };
  }
  const v = opts.trim === false ? raw : raw.trim();
  const len = v.length;
  if (opts.min !== undefined && len < opts.min) {
    return { ok: false, message: `${field} must be at least ${opts.min} chars` };
  }
  if (len === 0 && (opts.min === undefined || opts.min > 0)) {
    return { ok: false, message: `${field} required` };
  }
  if (len > opts.max) {
    return { ok: false, message: `${field} exceeds ${opts.max} chars` };
  }
  return { ok: true, value: v };
}

export function requireInt(
  raw: unknown,
  field: string,
  opts: { min?: number; max?: number } = {}
): Result<number> {
  if (typeof raw !== "number" || !Number.isFinite(raw) || !Number.isInteger(raw)) {
    return { ok: false, message: `${field} must be an integer` };
  }
  if (opts.min !== undefined && raw < opts.min) {
    return { ok: false, message: `${field} must be ≥ ${opts.min}` };
  }
  if (opts.max !== undefined && raw > opts.max) {
    return { ok: false, message: `${field} must be ≤ ${opts.max}` };
  }
  return { ok: true, value: raw };
}

export function requireBool(raw: unknown, field: string): Result<boolean> {
  if (typeof raw !== "boolean") {
    return { ok: false, message: `${field} must be a boolean` };
  }
  return { ok: true, value: raw };
}

export function requireAddress(raw: unknown, field: string): Result<`0x${string}`> {
  if (typeof raw !== "string" || !isAddress(raw)) {
    return { ok: false, message: `${field} must be a valid EVM address` };
  }
  return { ok: true, value: raw as `0x${string}` };
}

/**
 * USD amount as string. Parses to a number, enforces non-negative and
 * an upper sanity bound. Stored as string downstream.
 */
export function requireUsdAmount(
  raw: unknown,
  field: string,
  opts: { max?: number } = { max: 1_000_000_000 }
): Result<string> {
  if (typeof raw !== "string") {
    return { ok: false, message: `${field} must be a string` };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > 50) {
    return { ok: false, message: `${field} required (≤50 chars)` };
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, message: `${field} must be a non-negative number` };
  }
  if (opts.max !== undefined && n > opts.max) {
    return { ok: false, message: `${field} exceeds maximum ${opts.max}` };
  }
  return { ok: true, value: trimmed };
}

export function requireObject(raw: unknown): Result<Record<string, unknown>> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, message: "data must be an object" };
  }
  return { ok: true, value: raw as Record<string, unknown> };
}
