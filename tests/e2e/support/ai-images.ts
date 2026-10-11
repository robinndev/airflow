import sharp from "sharp";

/*
 * Small PNGs for the AI check, built on the fly: a clean one, one carrying
 * NovelAI's metadata (same keys as a real NovelAI file) and one with
 * settings hidden in the alpha channel, like NovelAI's "stealth" PNG info.
 */

const SIZE = 128;

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data: Buffer) {
  let c = 0xffffffff;
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function textChunk(key: string, value: string) {
  const body = Buffer.concat([Buffer.from("tEXt"), Buffer.from(key, "latin1"), Buffer.from([0]), Buffer.from(value, "latin1")]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length - 4);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

const solid = () =>
  sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 120, g: 180, b: 240, alpha: 1 } } }).png().toBuffer();

export const cleanPng = solid;

export async function novelAiPng() {
  const png = await solid();
  const afterHeader = 8 + 25; // signature + IHDR
  return Buffer.concat([
    png.subarray(0, afterHeader),
    textChunk("Title", "AI generated image"),
    textChunk("Software", "NovelAI"),
    textChunk("Source", "Stable Diffusion XL C1E1DE52"),
    textChunk("Comment", '{"steps": 28, "sampler": "k_euler_ancestral", "scale": 5.0, "uc": "lowres"}'),
    png.subarray(afterHeader),
  ]);
}

export async function stealthPng() {
  const bits = [..."stealth_pngcomp"].flatMap((ch) => [...ch.charCodeAt(0).toString(2).padStart(8, "0")].map(Number));
  const rgba = Buffer.alloc(SIZE * SIZE * 4);
  for (let x = 0; x < SIZE; x++) {
    for (let y = 0; y < SIZE; y++) {
      const i = (y * SIZE + x) * 4;
      rgba[i] = 200;
      rgba[i + 1] = 120;
      rgba[i + 2] = 160;
      rgba[i + 3] = 254 | (bits[x * SIZE + y] ?? 1); // column by column, lowest bit
    }
  }
  return sharp(rgba, { raw: { width: SIZE, height: SIZE, channels: 4 } }).png().toBuffer();
}
