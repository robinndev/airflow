/**
 * Reading and cleaning originals: real files made with sharp, with metadata
 * added the way cameras, apps and generators add it. Stripping must leave the
 * pixels exactly as they were. Run with: npm run test:unit
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import sharp from "sharp";
import { formatOf, readImageInfo, stripMetadata } from "./formats.ts";

const enc = new TextEncoder();
const bytes = (...parts: (Uint8Array | number[] | string)[]) =>
  Uint8Array.from(parts.flatMap((part) => [...(typeof part === "string" ? enc.encode(part) : part)]));
const u32be = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const has = (file: Uint8Array, text: string) => Buffer.from(file).includes(text, 0, "latin1");

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(data: Uint8Array) {
  let c = 0xffffffff;
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
const pngChunk = (type: string, data: Uint8Array) => {
  const body = bytes(type, data);
  return bytes(u32be(data.length), body, u32be(crc32(body)));
};

/** A small picture with real detail (a gradient with a hard edge), so encoders keep it busy. */
async function pixels(width = 48, height = 32) {
  const raw = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      raw[i] = (x * 5) & 255;
      raw[i + 1] = (y * 7) & 255;
      raw[i + 2] = x > width / 2 ? 220 : 30;
      raw[i + 3] = y < 4 ? 0 : 255; // a see-through strip on top
    }
  }
  return sharp(raw, { raw: { width, height, channels: 4 } });
}

const decoded = async (file: Uint8Array) => sharp(file, { animated: true }).ensureAlpha().raw().toBuffer();

/** Inserts `extra` right before a PNG's IEND chunk (its last 12 bytes). */
const beforeIend = (file: Uint8Array, ...extra: Uint8Array[]) => bytes(file.subarray(0, file.length - 12), ...extra, file.subarray(file.length - 12));

describe("formats", () => {
  test("tells the four formats apart by their bytes, not their name", async () => {
    const base = await pixels();
    assert.equal(formatOf(new Uint8Array(await base.clone().png().toBuffer())), "png");
    assert.equal(formatOf(new Uint8Array(await base.clone().jpeg().toBuffer())), "jpeg");
    assert.equal(formatOf(new Uint8Array(await base.clone().webp().toBuffer())), "webp");
    assert.equal(formatOf(new Uint8Array(await base.clone().gif().toBuffer())), "gif");
    assert.equal(formatOf(bytes("<svg xmlns='http://www.w3.org/2000/svg'/>")), null);
    assert.equal(formatOf(bytes("<!doctype html><script>alert(1)</script>")), null);
  });

  test("reads width and height from the first bytes alone", async () => {
    const base = await pixels(300, 200);
    for (const file of [
      await base.clone().png().toBuffer(),
      await base.clone().jpeg().toBuffer(),
      await base.clone().webp().toBuffer(),
      await base.clone().webp({ lossless: true }).toBuffer(),
      await base.clone().gif().toBuffer(),
    ]) {
      const info = readImageInfo(new Uint8Array(file).subarray(0, 2048));
      assert.equal(info?.width, 300, info?.format);
      assert.equal(info?.height, 200, info?.format);
      assert.equal(info?.frames, 1, info?.format);
    }
  });

  test("counts the frames of animated GIFs and WebPs", async () => {
    const frames = await Promise.all([1, 2, 3].map(async (n) => (await pixels()).clone().modulate({ hue: n * 90 }).png().toBuffer()));
    const gif = new Uint8Array(await sharp(frames, { join: { animated: true } }).gif({ loop: 0 }).toBuffer());
    const webp = new Uint8Array(await sharp(frames, { join: { animated: true } }).webp({ loop: 0 }).toBuffer());
    assert.equal(readImageInfo(gif)?.frames, 3);
    assert.equal(readImageInfo(webp)?.frames, 3);
    assert.deepEqual([readImageInfo(webp)?.width, readImageInfo(webp)?.height], [48, 32]);
  });

  test("a JPEG turned by its EXIF reads as it's shown", async () => {
    const file = new Uint8Array(await (await pixels(300, 200)).jpeg().withMetadata({ orientation: 6 }).toBuffer());
    assert.deepEqual([readImageInfo(file)?.width, readImageInfo(file)?.height], [200, 300]);
  });

  test("rejects what isn't a picture we take", () => {
    assert.equal(readImageInfo(bytes("GIF89a")), null);
    assert.equal(readImageInfo(bytes("not an image at all")), null);
    assert.equal(stripMetadata(bytes("<svg/>")), null);
  });
});

describe("stripMetadata", () => {
  test("PNG: drops text, EXIF, time and Content Credentials; keeps color and transparency", async () => {
    const clean = new Uint8Array(await (await pixels()).png().toBuffer());
    const dirty = beforeIend(
      clean,
      pngChunk("tEXt", bytes("parameters", [0], "Steps: 28, Sampler: Euler a, CFG scale: 7, Seed: 1")),
      pngChunk("tEXt", bytes("Author", [0], "Jane Doe")),
      pngChunk("eXIf", bytes("MM\0*", "GPS 51.5N 0.1W")),
      pngChunk("tIME", bytes([7, 234, 10, 12, 9, 30, 0])),
      pngChunk("caBX", bytes("jumbc2pa manifest")),
      pngChunk("gAMA", bytes(u32be(45455))),
    );
    const stripped = stripMetadata(dirty)!;
    for (const gone of ["Jane Doe", "Steps: 28", "GPS", "tIME", "caBX", "eXIf"]) assert.equal(has(stripped, gone), false, gone);
    assert.equal(has(stripped, "gAMA"), true);
    assert.deepEqual(await decoded(stripped), await decoded(dirty));
  });

  test("JPEG: drops EXIF, XMP and comments; keeps the color profile and which way up it goes", async () => {
    const file = new Uint8Array(
      await (await pixels(300, 200))
        .jpeg({ quality: 90 })
        .withIccProfile("p3")
        .withMetadata({ orientation: 6 })
        .withExif({ IFD0: { Make: "PhoneMaker", Model: "Pocket 12", Artist: "Jane Doe" } })
        .toBuffer(),
    );
    // XMP and a comment after the EXIF, the way editors write them.
    const xmp = bytes([0xff, 0xe1, 0, 46], "http://ns.adobe.com/xap/1.0/\0", "<x>Jane Doe</x>");
    const comment = bytes([0xff, 0xfe, 0, 10], "Jane Doe");
    const dirty = bytes(file.subarray(0, 2), xmp, comment, file.subarray(2));
    assert.equal(has(dirty, "PhoneMaker"), true);

    const stripped = stripMetadata(dirty)!;
    for (const gone of ["PhoneMaker", "Pocket 12", "Jane Doe", "http://ns.adobe.com"]) assert.equal(has(stripped, gone), false, gone);
    assert.equal(has(stripped, "ICC_PROFILE"), true);
    assert.deepEqual([readImageInfo(stripped)?.width, readImageInfo(stripped)?.height], [200, 300]);
    assert.equal((await sharp(stripped).metadata()).orientation, 6);
    assert.deepEqual(await decoded(stripped), await decoded(dirty));
  });

  test("JPEG: a picture that's already upright gets no EXIF at all", async () => {
    const file = new Uint8Array(await (await pixels()).jpeg().withExif({ IFD0: { Make: "PhoneMaker" } }).toBuffer());
    const stripped = stripMetadata(file)!;
    assert.equal(has(stripped, "Exif"), false);
    assert.deepEqual(await decoded(stripped), await decoded(file));
  });

  test("JPEG: what trails the end of the image (gain maps, depth maps) goes", async () => {
    const file = new Uint8Array(await (await pixels()).jpeg().toBuffer());
    const stripped = stripMetadata(bytes(file, "trailing XMP: Jane Doe"))!;
    assert.equal(has(stripped, "Jane Doe"), false);
    assert.deepEqual([...stripped.subarray(-2)], [0xff, 0xd9]);
  });

  test("WebP: drops EXIF and XMP and clears their flags", async () => {
    const dirty = new Uint8Array(
      await (await pixels()).webp({ quality: 90 }).withExif({ IFD0: { Make: "PhoneMaker", Artist: "Jane Doe" } }).toBuffer(),
    );
    assert.equal(has(dirty, "PhoneMaker"), true);
    const stripped = stripMetadata(dirty)!;
    assert.equal(has(stripped, "PhoneMaker"), false);
    assert.equal(has(stripped, "EXIF"), false);
    assert.equal(stripped[20] & 0x0c, 0); // VP8X: no EXIF, no XMP
    assert.equal(new DataView(stripped.buffer).getUint32(4, true), stripped.length - 8);
    assert.deepEqual(await decoded(stripped), await decoded(dirty));
  });

  test("GIF: drops comments and XMP, keeps looping and every frame", async () => {
    const frames = await Promise.all([1, 2, 3].map(async (n) => (await pixels()).clone().modulate({ hue: n * 90 }).png().toBuffer()));
    const clean = new Uint8Array(await sharp(frames, { join: { animated: true } }).gif({ loop: 0 }).toBuffer());
    const table = clean[10] & 0x80 ? 3 * 2 ** ((clean[10] & 7) + 1) : 0;
    const head = 13 + table;
    const comment = bytes([0x21, 0xfe, 8], "Jane Doe", [0]);
    const xmp = bytes([0x21, 0xff, 11], "XMP DataXMP", [14], "<x>Jane Doe</x>".slice(0, 14), [0]);
    const dirty = bytes(clean.subarray(0, head), comment, xmp, clean.subarray(head));

    const stripped = stripMetadata(dirty)!;
    assert.equal(has(stripped, "Jane Doe"), false);
    assert.equal(has(stripped, "XMP DataXMP"), false);
    assert.equal(has(stripped, "NETSCAPE2.0"), has(clean, "NETSCAPE2.0"));
    assert.equal(readImageInfo(stripped)?.frames, 3);
    assert.deepEqual(await decoded(stripped), await decoded(clean));
  });

  test("refuses a file cut short instead of keeping half of it", async () => {
    const png = new Uint8Array(await (await pixels()).png().toBuffer());
    const webp = new Uint8Array(await (await pixels()).webp().toBuffer());
    assert.equal(stripMetadata(png.subarray(0, png.length - 20)), null);
    assert.equal(stripMetadata(webp.subarray(0, webp.length - 20)), null);
  });
});
