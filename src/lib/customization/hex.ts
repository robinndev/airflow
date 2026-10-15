/**
 * "#abc", "ABC", " #aabbcc " → "#aabbcc". Three digits only when `short`
 * (the editor applies them on blur, so typing "ff3948" doesn't jump to #ffff33).
 */
export function parseHex(text: string, { short = false } = {}) {
  const digits = text.trim().replace(/^#/, "");
  if (/^[0-9a-f]{6}$/i.test(digits)) return `#${digits.toLowerCase()}`;
  if (short && /^[0-9a-f]{3}$/i.test(digits)) return `#${[...digits.toLowerCase()].map((d) => d + d).join("")}`;
  return null;
}
