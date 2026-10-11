/**
 * The AI check against hand-built files, one per format and generator, plus
 * the human-made files it must leave alone. Run with: npm run test:unit
 *
 * Real files from each generator were checked with `npm run ai-check`; these
 * fixtures copy their layout (keys, chunk types, wording).
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { deflateSync } from "node:zlib";
import { findAiSignature, findStealthSignature, GENERIC_GENERATOR, STEALTH_BITS } from "./signature.ts";

const enc = new TextEncoder();
const bytes = (...parts: (Uint8Array | number[] | string)[]) =>
  Uint8Array.from(parts.flatMap((part) => [...(typeof part === "string" ? enc.encode(part) : part)]));
const u32be = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const u32le = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];

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

// PNG -------------------------------------------------------------------------
function chunk(type: string, data: Uint8Array) {
  const body = bytes(type, data);
  return bytes(u32be(data.length), body, u32be(crc32(body)));
}
const tEXt = (key: string, value: string) => chunk("tEXt", bytes(key, [0], value));
const zTXt = (key: string, value: string) => chunk("zTXt", bytes(key, [0, 0], deflateSync(enc.encode(value))));
const iTXt = (key: string, value: string, compressed = false) =>
  chunk("iTXt", bytes(key, [0, compressed ? 1 : 0, 0], [0], [0], compressed ? deflateSync(enc.encode(value)) : value));
const png = (...chunks: Uint8Array[]) =>
  bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], chunk("IHDR", bytes(u32be(64), u32be(64), [8, 6, 0, 0, 0])), ...chunks, chunk("IEND", new Uint8Array()));

// JPEG ------------------------------------------------------------------------
const segment = (marker: number, data: Uint8Array) => bytes([0xff, marker, (data.length + 2) >> 8, (data.length + 2) & 255], data);
const jpeg = (...segments: Uint8Array[]) => bytes([0xff, 0xd8], ...segments, [0xff, 0xda, 0, 2, 1, 2, 3, 0xff, 0xd9]);
/** EXIF UserComment the way Automatic1111 writes it: "UNICODE\0" + UTF-16BE. */
const exifUserComment = (value: string) =>
  segment(0xe1, bytes("Exif\0\0MM\0*", "UNICODE\0", [...value].flatMap((ch) => [0, ch.charCodeAt(0)])));
const xmp = (inner: string) => segment(0xe1, bytes("http://ns.adobe.com/xap/1.0/\0", `<x:xmpmeta>${inner}</x:xmpmeta>`));

// WebP ------------------------------------------------------------------------
function webp(...chunks: [string, Uint8Array][]) {
  const body = bytes("WEBP", ...chunks.flatMap(([type, data]) => [bytes(type, u32le(data.length), data, data.length % 2 ? [0] : [])]));
  return bytes("RIFF", u32le(body.length), body);
}

/** C2PA manifests are CBOR inside JUMBF: strings show up as-is between binary bytes. */
const c2paManifest = (...strings: string[]) => bytes("jumb", [0, 0, 0, 0x2a], "jumdc2pa", [0x11, 0x00], ...strings.flatMap((s) => [bytes([0x78, s.length], s)]));

const A1111 =
  "1girl, silver hair, looking at viewer\nNegative prompt: lowres, bad anatomy\nSteps: 28, Sampler: DPM++ 2M Karras, CFG scale: 7, Seed: 1234567890, Size: 832x1216, Model: animagineXL";

describe("finds AI generators' marks", () => {
  const cases: [string, Uint8Array, string][] = [
    ["Automatic1111 / Forge, PNG", png(tEXt("parameters", A1111)), "Stable Diffusion"],
    ["Automatic1111, PNG compressed text", png(zTXt("parameters", A1111)), "Stable Diffusion"],
    ["Automatic1111, JPEG EXIF UserComment (UTF-16)", jpeg(exifUserComment(A1111)), "Stable Diffusion"],
    ["Automatic1111, WebP EXIF", webp(["EXIF", bytes("MM\0*", A1111)]), "Stable Diffusion"],
    [
      "ComfyUI workflow",
      png(tEXt("prompt", '{"3": {"inputs": {"seed": 1, "steps": 20}, "class_type": "KSampler"}}'), tEXt("workflow", '{"last_node_id": 9, "nodes": []}')),
      "ComfyUI",
    ],
    ["ComfyUI, international text", png(iTXt("workflow", '{"last_node_id": 9, "nodes": [], "prompt": "猫"}', true)), "ComfyUI"],
    [
      "NovelAI (named over its generic title)",
      png(
        tEXt("Title", "AI generated image"),
        tEXt("Description", "masterpiece, best quality, cat"),
        tEXt("Software", "NovelAI"),
        tEXt("Source", "Stable Diffusion XL C1E1DE52"),
        tEXt("Comment", '{"steps": 28, "sampler": "k_euler_ancestral", "scale": 5.0, "uc": "lowres"}'),
      ),
      "NovelAI",
    ],
    ["NovelAI settings alone", png(tEXt("Comment", '{"steps": 28, "sampler": "k_euler", "uc": "lowres"}')), "NovelAI"],
    ["InvokeAI", png(tEXt("invokeai_metadata", '{"generation_mode": "sdxl_txt2img"}')), "InvokeAI"],
    ["Fooocus", png(tEXt("parameters", '{"base_model": "juggernautXL"}'), tEXt("fooocus_scheme", "fooocus")), "Fooocus"],
    ["Midjourney job ID", png(iTXt("Description", "a fox in the snow --ar 2:3 Job ID: 6d0f1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b")), "Midjourney"],
    [
      "Bing Image Creator, C2PA without the IPTC term (real layout)",
      jpeg(segment(0xeb, c2paManifest("c2pa.actions", "action", "c2pa.created", "softwareAgent", "Bing Image Creator", "description", "AI Generated Image"))),
      "Microsoft Image Creator",
    ],
    [
      "Adobe Firefly, C2PA with the IPTC term",
      jpeg(
        segment(0xeb, c2paManifest("softwareAgent", "Adobe Firefly", "digitalSourceType")),
        segment(0xeb, c2paManifest("http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia")),
      ),
      "Adobe Firefly",
    ],
    [
      "ChatGPT, C2PA in a PNG",
      png(chunk("caBX", c2paManifest("claim_generator", "ChatGPT", "digitalSourceType", "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"))),
      "ChatGPT / DALL·E",
    ],
    ["C2PA in a WebP", webp(["C2PA", c2paManifest("softwareAgent", "Imagen 4", "c2pa.created")]), "Google's image AI"],
    [
      "Photoshop generative fill (composite)",
      jpeg(
        segment(
          0xeb,
          c2paManifest(
            "claim_generator",
            "Adobe_Photoshop/26.9.0",
            "c2pa.edited",
            "softwareAgent",
            "Adobe Firefly",
            "digitalSourceType",
            "http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia",
          ),
        ),
      ),
      "Adobe Firefly",
    ],
    [
      "AI-generated parts from an unnamed tool",
      jpeg(segment(0xeb, c2paManifest("digitalSourceType", "http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia"))),
      GENERIC_GENERATOR,
    ],
    [
      "IPTC label in XMP",
      jpeg(xmp('<Iptc4xmpExt:DigitalSourceType>http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia</Iptc4xmpExt:DigitalSourceType>')),
      GENERIC_GENERATOR,
    ],
    ["generator as XMP CreatorTool", jpeg(xmp('<rdf:Description xmp:CreatorTool="NovelAI"/>')), "NovelAI"],
  ];

  for (const [name, file, generator] of cases) {
    test(name, async () => {
      const signature = await findAiSignature(file);
      assert.ok(signature, "expected a signature");
      assert.equal(signature.generator, generator);
      assert.ok(signature.evidence.length > 0 && signature.excerpt.length > 0);
    });
  }

  test("the excerpt shows what matched, not binary noise", async () => {
    const signature = await findAiSignature(jpeg(segment(0xeb, c2paManifest("x".repeat(400), "softwareAgent", "Bing Image Creator"))));
    assert.match(signature?.excerpt ?? "", /Bing Image Creator/);
    assert.doesNotMatch(signature?.excerpt ?? "", /[^\x20-\x7E]/);
  });
});

describe("leaves human-made files alone", () => {
  const cases: [string, Uint8Array][] = [
    ["no metadata", png()],
    ["Krita", png(tEXt("Software", "Krita"), tEXt("Title", "Commission for @kai"))],
    ["Clip Studio Paint", png(iTXt("XML:com.adobe.xmp", '<xmp:CreatorTool="CLIP STUDIO PAINT">'), tEXt("Software", "CLIP STUDIO PAINT"))],
    ["an artist's description that names an AI", png(tEXt("Description", "Drawn by hand in Procreate, no NovelAI or Midjourney involved"))],
    [
      "Photoshop with Content Credentials, no AI",
      jpeg(segment(0xeb, c2paManifest("claim_generator", "Adobe_Photoshop/26.9.0", "c2pa.edited", "digitalSourceType", "http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture"))),
    ],
    ["a camera's Content Credentials", jpeg(segment(0xeb, c2paManifest("claim_generator", "Leica M11-P", "c2pa.created")))],
    ["Photoshop XMP mentioning an AI in the title", jpeg(xmp('<rdf:Description xmp:CreatorTool="Adobe Photoshop 26.9"><dc:title>not midjourney, lol</dc:title></rdf:Description>'))],
    ["numbers that look like settings", jpeg(segment(0xfe, bytes("Steps: 1, 2 and 3 of my process")))],
    ["a cut-off PNG", png(tEXt("parameters", A1111)).subarray(0, 40)],
    ["empty", new Uint8Array()],
    ["not an image", bytes("hello world")],
  ];

  for (const [name, file] of cases) {
    test(name, async () => {
      assert.equal(await findAiSignature(file), null);
    });
  }
});

describe("stealth settings in the alpha channel", () => {
  /** Alpha values (column-major) carrying `message` in their lowest bit, like NovelAI writes them. */
  function alphaCarrying(message: string, length = 4096) {
    const bits = [...message].flatMap((ch) => [...ch.charCodeAt(0).toString(2).padStart(8, "0")].map(Number));
    return Uint8Array.from({ length }, (_, i) => 254 | (bits[i] ?? 1));
  }

  test("finds NovelAI's compressed settings", () => {
    assert.equal(findStealthSignature(alphaCarrying("stealth_pngcomp"))?.generator, "NovelAI or Stable Diffusion");
  });
  test("finds the uncompressed variant", () => {
    assert.ok(findStealthSignature(alphaCarrying("stealth_pnginfo")));
  });
  test("ignores opaque images", () => {
    assert.equal(findStealthSignature(new Uint8Array(4096).fill(255)), null);
  });
  test("ignores ordinary transparency", () => {
    assert.equal(findStealthSignature(Uint8Array.from({ length: 4096 }, (_, i) => (i * 37) % 256)), null);
  });
  test("needs the whole magic", () => {
    assert.equal(findStealthSignature(alphaCarrying("stealth_pngcomp", STEALTH_BITS - 1)), null);
  });
});
