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

/** "#ff3948" → [255, 57, 72]. */
export function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

/** [255, 57, 72] → "#ff3948", each channel rounded and kept within 0–255. */
export function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * A color as people paste it: a hex code (see parseHex) or RGB, as
 * "rgb(255, 57, 72)", "rgb(255 57 72)" or just "255, 57, 72". Null if it's
 * neither, or a channel is past 255.
 */
export function parseColor(text: string, { short = false } = {}) {
  const hex = parseHex(text, { short });
  if (hex) return hex;
  const rgb = /^\s*(?:rgba?\s*\()?\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*\)?\s*$/i.exec(text);
  if (!rgb) return null;
  const channels = rgb.slice(1, 4).map(Number);
  return channels.every((c) => c <= 255) ? rgbToHex(channels[0], channels[1], channels[2]) : null;
}
