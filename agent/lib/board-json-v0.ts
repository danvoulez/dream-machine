// board-json-v0 — matches Dream-Machine-Envelope-Ledger/src/canonical.ts
// For string-only LogLine/oauth payloads this also matches JCS (RFC 8785).

import { createHash } from "node:crypto";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export function canonicalJson(value: JsonValue): string {
  return serialize(value);
}

function serialize(value: JsonValue): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("canonicalJson rejects non-finite numbers");
    if (Object.is(value, -0)) return "0";
    return String(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(serialize).join(",")}]`;

  const keys = Object.keys(value).sort();
  const pairs = keys.map((k) => {
    const child = value[k];
    if (child === undefined) throw new TypeError(`canonicalJson rejects undefined value for key ${k}`);
    return `${JSON.stringify(k)}:${serialize(child)}`;
  });
  return `{${pairs.join(",")}}`;
}

export type Hash = string & { readonly __brand: "Hash" };

export function hashValue(value: JsonValue): Hash {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex") as Hash;
}

export function sha256Text(text: string): Hash {
  return createHash("sha256").update(text, "utf8").digest("hex") as Hash;
}