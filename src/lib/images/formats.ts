/*
 * The four raster formats we take (PNG, JPEG, WebP, GIF), read and cleaned
 * without decoding a pixel. Pure TS, so it runs in the browser (cleaning the
 * original before upload), on the server (checking an upload) and in scripts.
 *
 * `stripMetadata()` drops what can identify a person (EXIF with GPS and
 * camera, XMP, IPTC, comments, text chunks, Content Credentials) and keeps
 * what changes how the picture looks (color profile, transparency, gamma,
 * animation, JPEG orientation). Pixels stay byte for byte, so Glaze and
 * Nightshade survive.
 */

export type ImageFormat = "png" | "jpeg" | "webp" | "gif";

export const MIME_TYPE: Record<ImageFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export const EXTENSION: Record<ImageFormat, string> = { png: "png", jpeg: "jpg", webp: "webp", gif: "gif" };

export const formatOfMime = (type: string): ImageFormat | null =>
  (Object.keys(MIME_TYPE) as ImageFormat[]).find((format) => MIME_TYPE[format] === type) ?? null;

export type ImageInfo = {
  format: ImageFormat;
  /** As it's shown: JPEGs turned by their EXIF orientation have width and height swapped. */
  width: number;
  height: number;
  /** Frames seen so far (GIF, APNG, animated WebP); 1 for a still. GIFs are only counted to the end of the bytes given. */
  frames: number;
};

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

const viewOf = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function formatOf(bytes: Uint8Array): ImageFormat | null {
  if (bytes.length >= 8 && PNG_MAGIC.every((byte, i) => bytes[i] === byte)) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "webp";
  if (bytes.length >= 6 && /^GIF8[79]a$/.test(ascii(bytes, 0, 6))) return "gif";
  return null;
}

/** Format, size and frame count from the file's first bytes (a few KB is enough, except to count a GIF's frames). */
export function readImageInfo(bytes: Uint8Array): ImageInfo | null {
  try {
    switch (formatOf(bytes)) {
      case "png":
        return pngInfo(bytes);
      case "jpeg":
        return jpegInfo(bytes);
      case "webp":
        return webpInfo(bytes);
      case "gif":
        return gifInfo(bytes);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * The same file without its metadata, or null when it isn't one of our four
 * formats or doesn't parse (then don't keep it as an original).
 */
export function stripMetadata(bytes: Uint8Array): Uint8Array | null {
  try {
    switch (formatOf(bytes)) {
      case "png":
        return stripPng(bytes);
      case "jpeg":
        return stripJpeg(bytes);
      case "webp":
        return stripWebp(bytes);
      case "gif":
        return stripGif(bytes);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

class Malformed extends Error {}

function need(condition: boolean): asserts condition {
  if (!condition) throw new Malformed();
}

/* PNG ------------------------------------------------------------------------ */

/** Chunks that change how the picture looks (or animate it). Other ancillary chunks (text, EXIF, time, C2PA) go. */
const PNG_KEEP = new Set([
  "tRNS", "gAMA", "cHRM", "sRGB", "iCCP", "sBIT", "bKGD", "pHYs", "hIST", "sPLT",
  "cICP", "mDCV", "mDCv", "cLLI", "cLLi", "acTL", "fcTL", "fdAT",
]);

function* pngChunks(bytes: Uint8Array) {
  const view = viewOf(bytes);
  for (let at = 8; at + 12 <= bytes.length; ) {
    const length = view.getUint32(at);
    const type = ascii(bytes, at + 4, 4);
    const end = at + 12 + length;
    yield { type, at, end, data: bytes.subarray(at + 8, Math.min(bytes.length, at + 8 + length)) };
    if (type === "IEND") return;
    at = end;
  }
}

function pngInfo(bytes: Uint8Array): ImageInfo {
  need(bytes.length >= 24 && ascii(bytes, 12, 4) === "IHDR");
  const view = viewOf(bytes);
  let frames = 1;
  for (const chunk of pngChunks(bytes)) {
    if (chunk.type === "acTL" && chunk.data.length >= 4) frames = Math.max(1, viewOf(chunk.data).getUint32(0));
    if (chunk.type === "IDAT") break;
  }
  return { format: "png", width: view.getUint32(16), height: view.getUint32(20), frames };
}

function stripPng(bytes: Uint8Array) {
  const parts = [bytes.subarray(0, 8)];
  let ended = false;
  for (const chunk of pngChunks(bytes)) {
    need(chunk.end <= bytes.length);
    // Critical chunks (uppercase first letter) can't be dropped; ancillary ones only stay if they're on the list.
    const critical = chunk.type.charCodeAt(0) < 0x61;
    if (critical || PNG_KEEP.has(chunk.type)) parts.push(bytes.subarray(chunk.at, chunk.end));
    if (chunk.type === "IEND") ended = true;
  }
  need(ended);
  return concat(parts);
}

/* JPEG ----------------------------------------------------------------------- */

type Segment = { marker: number; at: number; end: number; data: Uint8Array };

/** The header segments, up to and including the first start of scan. */
function* jpegSegments(bytes: Uint8Array): Generator<Segment> {
  for (let at = 2; at + 4 <= bytes.length; ) {
    need(bytes[at] === 0xff);
    const marker = bytes[at + 1];
    if (marker === 0xff) {
      at++; // fill byte
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      yield { marker, at, end: at + 2, data: new Uint8Array() };
      at += 2;
      continue;
    }
    const length = (bytes[at + 2] << 8) | bytes[at + 3];
    need(length >= 2);
    const end = at + 2 + length;
    yield { marker, at, end, data: bytes.subarray(at + 4, Math.min(bytes.length, end)) };
    if (marker === 0xda || marker === 0xd9) return;
    at = end;
  }
}

const isSof = (marker: number) => marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);

/** EXIF orientation (1–8) from an APP1 segment's data, or 1. */
function exifOrientation(data: Uint8Array) {
  if (data.length < 14 || ascii(data, 0, 6) !== "Exif\0\0") return 1;
  const tiff = data.subarray(6);
  const view = viewOf(tiff);
  const little = ascii(tiff, 0, 2) === "II";
  const ifd = view.getUint32(4, little);
  if (ifd + 2 > tiff.length) return 1;
  const count = view.getUint16(ifd, little);
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > tiff.length) break;
    if (view.getUint16(entry, little) === 0x0112) {
      const value = view.getUint16(entry + 8, little);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}

function jpegInfo(bytes: Uint8Array): ImageInfo {
  let orientation = 1;
  for (const segment of jpegSegments(bytes)) {
    if (segment.marker === 0xe1 && orientation === 1) orientation = exifOrientation(segment.data);
    if (isSof(segment.marker)) {
      need(segment.data.length >= 5);
      const height = (segment.data[1] << 8) | segment.data[2];
      const width = (segment.data[3] << 8) | segment.data[4];
      const turned = orientation >= 5;
      return { format: "jpeg", width: turned ? height : width, height: turned ? width : height, frames: 1 };
    }
  }
  throw new Malformed();
}

/** A tiny EXIF block that only says which way up the picture goes. */
function orientationSegment(orientation: number) {
  // FFE1, length 34: "Exif\0\0", big-endian TIFF header, one IFD with one entry (0x0112, SHORT, 1), no next IFD.
  return Uint8Array.from([
    0xff, 0xe1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08,
    0x00, 0x01, 0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
}

/** Where the entropy-coded data ends: the end-of-image marker (inside the data, 0xFF is always followed by 0x00 or a restart). */
function endOfImage(bytes: Uint8Array, from: number) {
  for (let at = from; at + 1 < bytes.length; at++) {
    if (bytes[at] === 0xff && bytes[at + 1] === 0xd9) return at + 2;
  }
  return bytes.length;
}

function stripJpeg(bytes: Uint8Array) {
  const head: Uint8Array[] = [];
  let orientation = 1;
  let scan: Segment | null = null;
  for (const segment of jpegSegments(bytes)) {
    const { marker, data } = segment;
    if (marker === 0xda) {
      scan = segment;
      break;
    }
    if (marker === 0xe1 && orientation === 1) orientation = exifOrientation(data);
    const keep =
      marker === 0xe0 || // JFIF
      (marker === 0xe2 && ascii(data, 0, 12) === "ICC_PROFILE\0") ||
      (marker === 0xee && ascii(data, 0, 5) === "Adobe") || // color transform
      ((marker < 0xe0 || marker > 0xef) && marker !== 0xfe); // tables, frame, restart interval (not APPn, not comments)
    if (keep) head.push(bytes.subarray(segment.at, segment.end));
  }
  need(scan !== null && scan.end <= bytes.length);
  // The orientation goes right after JFIF's APP0 (which must come first) or the start of image.
  const afterJfif = head[0]?.[1] === 0xe0 ? 1 : 0;
  if (orientation !== 1) head.splice(afterJfif, 0, orientationSegment(orientation));
  // Anything after the end of image (gain maps, depth maps and the like) goes too.
  return concat([bytes.subarray(0, 2), ...head, bytes.subarray(scan.at, endOfImage(bytes, scan.end))]);
}

/* WebP ----------------------------------------------------------------------- */

const WEBP_KEEP = new Set(["VP8X", "VP8 ", "VP8L", "ALPH", "ICCP", "ANIM", "ANMF"]);
const VP8X_EXIF = 0x08;
const VP8X_XMP = 0x04;

function* webpChunks(bytes: Uint8Array) {
  const view = viewOf(bytes);
  for (let at = 12; at + 8 <= bytes.length; ) {
    const type = ascii(bytes, at, 4);
    const length = view.getUint32(at + 4, true);
    const end = at + 8 + length + (length % 2);
    const complete = at + 8 + length <= bytes.length;
    yield { type, at, end: Math.min(end, bytes.length), complete, data: bytes.subarray(at + 8, Math.min(bytes.length, at + 8 + length)) };
    at = end;
  }
}

function webpInfo(bytes: Uint8Array): ImageInfo {
  const first = webpChunks(bytes).next().value;
  need(first !== undefined);
  const { type, data } = first;
  if (type === "VP8X") {
    need(data.length >= 10);
    const width = 1 + (data[4] | (data[5] << 8) | (data[6] << 16));
    const height = 1 + (data[7] | (data[8] << 8) | (data[9] << 16));
    let frames = 0;
    for (const chunk of webpChunks(bytes)) if (chunk.type === "ANMF") frames++;
    return { format: "webp", width, height, frames: Math.max(1, frames) };
  }
  if (type === "VP8 ") {
    need(data.length >= 10 && data[3] === 0x9d && data[4] === 0x01 && data[5] === 0x2a);
    return { format: "webp", width: (data[6] | (data[7] << 8)) & 0x3fff, height: (data[8] | (data[9] << 8)) & 0x3fff, frames: 1 };
  }
  if (type === "VP8L") {
    need(data.length >= 5 && data[0] === 0x2f);
    const bits = data[1] | (data[2] << 8) | (data[3] << 16) | (data[4] << 24);
    return { format: "webp", width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1, frames: 1 };
  }
  throw new Malformed();
}

function stripWebp(bytes: Uint8Array) {
  const chunks: Uint8Array[] = [];
  for (const chunk of webpChunks(bytes)) {
    need(chunk.complete);
    if (!WEBP_KEEP.has(chunk.type)) continue;
    const copy = bytes.slice(chunk.at, chunk.end);
    if (chunk.type === "VP8X") copy[8] &= ~(VP8X_EXIF | VP8X_XMP);
    chunks.push(copy);
  }
  need(chunks.some((chunk) => ["VP8 ", "VP8L", "ANMF"].includes(ascii(chunk, 0, 4))));
  const body = concat(chunks);
  const header = new Uint8Array(12);
  header.set(bytes.subarray(0, 4));
  viewOf(header).setUint32(4, 4 + body.length, true);
  header.set(bytes.subarray(8, 12), 8);
  return concat([header, body]);
}

/* GIF ------------------------------------------------------------------------ */

/** Application extensions that change how it plays or looks: looping, color profile. XMP and the rest go. */
const GIF_APPS = ["NETSCAPE2.0", "ANIMEXTS1.0", "ICCRGBG1012"];

/** Index just past a run of sub-blocks (size byte + data, ending with a zero size). */
function skipSubBlocks(bytes: Uint8Array, at: number) {
  while (at < bytes.length && bytes[at] !== 0) at += 1 + bytes[at];
  return at + 1;
}

type GifBlock = { kind: "extension" | "image" | "trailer"; at: number; end: number; label?: number; app?: string };

function* gifBlocks(bytes: Uint8Array): Generator<GifBlock> {
  const packed = bytes[10];
  let at = 13 + (packed & 0x80 ? 3 * 2 ** ((packed & 7) + 1) : 0);
  while (at < bytes.length) {
    const introducer = bytes[at];
    if (introducer === 0x3b) {
      yield { kind: "trailer", at, end: at + 1 };
      return;
    }
    if (introducer === 0x21) {
      const label = bytes[at + 1];
      const app = label === 0xff && bytes[at + 2] === 11 ? ascii(bytes, at + 3, 11) : undefined;
      const end = skipSubBlocks(bytes, at + 2);
      yield { kind: "extension", at, end, label, app };
      at = end;
    } else if (introducer === 0x2c) {
      const local = bytes[at + 9];
      const table = local & 0x80 ? 3 * 2 ** ((local & 7) + 1) : 0;
      const end = skipSubBlocks(bytes, at + 10 + table + 1); // descriptor, local colors, LZW minimum code size
      yield { kind: "image", at, end };
      at = end;
    } else {
      throw new Malformed();
    }
  }
}

function gifInfo(bytes: Uint8Array): ImageInfo {
  need(bytes.length >= 13);
  const view = viewOf(bytes);
  let frames = 0;
  try {
    for (const block of gifBlocks(bytes)) if (block.kind === "image" && block.end <= bytes.length) frames++;
  } catch {
    // A partial read can end mid-block; what was counted stands.
  }
  return { format: "gif", width: view.getUint16(6, true), height: view.getUint16(8, true), frames: Math.max(1, frames) };
}

function stripGif(bytes: Uint8Array) {
  need(bytes.length >= 13);
  const packed = bytes[10];
  const parts = [bytes.subarray(0, 13 + (packed & 0x80 ? 3 * 2 ** ((packed & 7) + 1) : 0))];
  let ended = false;
  for (const block of gifBlocks(bytes)) {
    need(block.end <= bytes.length);
    const keep =
      block.kind !== "extension" ||
      block.label === 0xf9 || // frame timing and transparency
      block.label === 0x01 || // plain text (drawn on the picture)
      (block.label === 0xff && GIF_APPS.includes(block.app ?? ""));
    if (keep) parts.push(bytes.subarray(block.at, block.end));
    if (block.kind === "trailer") ended = true;
  }
  if (!ended) parts.push(Uint8Array.of(0x3b));
  return concat(parts);
}
