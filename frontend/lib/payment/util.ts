"use client";

export function encodeBase64(s: string): string {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    // btoa needs Latin-1; encode UTF-8 first.
    const utf8 = new TextEncoder().encode(s);
    let bin = "";
    utf8.forEach((b) => (bin += String.fromCharCode(b)));
    return window.btoa(bin);
  }
  return Buffer.from(s, "utf-8").toString("base64");
}
