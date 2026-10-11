/**
 * Finds the marks AI image generators leave in their files, so an upload can
 * be turned away before it's re-encoded (re-encoding strips them).
 *
 * Two kinds of marks:
 * - metadata: Content Credentials (C2PA), IPTC/XMP "made with AI" labels, the
 *   generation settings Stable Diffusion UIs, ComfyUI, NovelAI, InvokeAI and
 *   Fooocus write into PNG text chunks or EXIF (`findAiSignature`);
 * - "stealth" settings hidden in the lowest bit of the alpha channel, which
 *   NovelAI and an Automatic1111 extension write so they survive metadata
 *   stripping (`findStealthSignature`, given the pixels).
 *
 * A screenshot or a re-export drops all of this, so a clean file proves
 * nothing: this catches people posting a generator's file as it came. Formats
 * checked against real files from each generator (`npm run ai-check`).
 *
 * Plain TypeScript, no DOM, no Node APIs: runs anywhere. In the browser, use
 * `assertMadeByHumans()` from ./browser, which also reads the pixels.
 */

export type AiSignature = {
  /** Who made it, as best we can tell: "NovelAI", "ComfyUI"… or GENERIC_GENERATOR. */
  generator: string;
  /** Where the mark was, for the review queue: `PNG text "parameters"`. */
  evidence: string;
  /** The start of the matched metadata, so a reviewer can judge it. */
  excerpt: string;
};

export const GENERIC_GENERATOR = "an AI image generator";

/** Bits the stealth magic takes: 15 characters. */
export const STEALTH_BITS = 15 * 8;

/** A piece of metadata pulled out of the file, as text. */
type Field = { where: string; key?: string; text: string };

const latin1 = new TextDecoder("latin1");
const utf8 = new TextDecoder("utf-8");

/**
 * Bytes as searchable text. Dropping NULs makes UTF-16 text (EXIF
 * UserComment, which Automatic1111 writes as "UNICODE\0" + UTF-16) readable
 * as plain ASCII too.
 */
function text(bytes: Uint8Array) {
  return latin1.decode(bytes).replace(/\0/g, "");
}

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

async function inflate(bytes: Uint8Array) {
  try {
    const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

async function pngFields(bytes: Uint8Array): Promise<Field[]> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fields: Field[] = [];
  for (let at = 8; at + 12 <= bytes.length; ) {
    const length = view.getUint32(at);
    const type = ascii(bytes, at + 4, 4);
    const data = bytes.subarray(at + 8, Math.min(bytes.length, at + 8 + length));
    at += 12 + length;

    if (type === "tEXt" || type === "zTXt" || type === "iTXt") {
      const nul = data.indexOf(0);
      if (nul < 0) continue;
      const key = latin1.decode(data.subarray(0, nul));
      let value: Uint8Array | null = data.subarray(nul + 1);
      if (type === "zTXt") {
        value = await inflate(value.subarray(1));
      } else if (type === "iTXt") {
        // compression flag, method, language\0, translated keyword\0, text
        const compressed = value[0] === 1;
        let rest = value.subarray(2);
        rest = rest.subarray(rest.indexOf(0) + 1);
        rest = rest.subarray(rest.indexOf(0) + 1);
        value = compressed ? await inflate(rest) : rest;
      }
      if (!value) continue;
      fields.push({ where: `PNG text "${key}"`, key, text: type === "iTXt" ? utf8.decode(value) : latin1.decode(value) });
    } else if (type === "eXIf") {
      fields.push({ where: "EXIF", text: text(data) });
    } else if (type === "caBX") {
      fields.push({ where: "Content Credentials (C2PA)", text: text(data) });
    } else if (type === "IEND") {
      break;
    }
  }
  return fields;
}

function jpegFields(bytes: Uint8Array): Field[] {
  const fields: Field[] = [];
  const c2pa: Uint8Array[] = [];
  for (let at = 2; at + 4 <= bytes.length; ) {
    if (bytes[at] !== 0xff) break;
    const marker = bytes[at + 1];
    if (marker === 0xff) {
      at++; // fill byte
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) break; // end of image / start of scan: metadata is over
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      at += 2;
      continue;
    }
    const length = (bytes[at + 2] << 8) | bytes[at + 3];
    const data = bytes.subarray(at + 4, Math.min(bytes.length, at + 2 + length));
    at += 2 + length;

    if (marker === 0xe1) {
      const head = ascii(data, 0, 29);
      if (head.startsWith("Exif")) fields.push({ where: "EXIF", text: text(data) });
      else if (head.startsWith("http://ns.adobe.com/")) fields.push({ where: "XMP", text: utf8.decode(data) });
    } else if (marker === 0xeb) {
      c2pa.push(data); // JUMBF, possibly split over several segments
    } else if (marker === 0xfe) {
      fields.push({ where: "JPEG comment", text: text(data) });
    }
  }
  if (c2pa.length) fields.push({ where: "Content Credentials (C2PA)", text: c2pa.map(text).join("") });
  return fields;
}

function webpFields(bytes: Uint8Array): Field[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fields: Field[] = [];
  for (let at = 12; at + 8 <= bytes.length; ) {
    const type = ascii(bytes, at, 4);
    const length = view.getUint32(at + 4, true);
    const data = bytes.subarray(at + 8, Math.min(bytes.length, at + 8 + length));
    at += 8 + length + (length % 2);
    if (type === "EXIF") fields.push({ where: "EXIF", text: text(data) });
    else if (type === "XMP ") fields.push({ where: "XMP", text: utf8.decode(data) });
    else if (type === "C2PA") fields.push({ where: "Content Credentials (C2PA)", text: text(data) });
  }
  return fields;
}

/** Other formats (AVIF, HEIC, GIF…): metadata sits near the start or the end. */
function rawFields(bytes: Uint8Array): Field[] {
  const edge = 2 * 1024 * 1024;
  if (bytes.length <= 2 * edge) return [{ where: "file metadata", text: text(bytes) }];
  return [
    { where: "file metadata", text: text(bytes.subarray(0, edge)) },
    { where: "file metadata", text: text(bytes.subarray(bytes.length - edge)) },
  ];
}

async function metadataFields(bytes: Uint8Array) {
  if (PNG_MAGIC.every((byte, i) => bytes[i] === byte)) return pngFields(bytes);
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return jpegFields(bytes);
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return webpFields(bytes);
  return rawFields(bytes);
}

/** IPTC digital source types for generative AI (whole image, or parts of it). */
const AI_SOURCE_TYPE = /\b(compositeWithTrainedAlgorithmicMedia|trainedAlgorithmicMedia)\b/;

/** Generators that sign their output with Content Credentials, by the names they sign with. */
const C2PA_GENERATORS: [RegExp, string][] = [
  [/Bing Image Creator|Image Creator from Microsoft|Microsoft Designer|Microsoft[ _]Responsible[ _]AI/, "Microsoft Image Creator"],
  [/ChatGPT|OpenAI|DALL[·\-. ]?E|GPT-4o|gpt-image/i, "ChatGPT / DALL·E"],
  [/Firefly/, "Adobe Firefly"],
  [/Midjourney/i, "Midjourney"],
  [/Imagen|Gemini|Google AI/, "Google's image AI"],
  [/Meta AI|Imagine with Meta/, "Meta AI"],
  [/Stability AI|Stable Diffusion/i, "Stable Diffusion"],
];

/** Tools that write their name into "Software"-style fields. */
const TOOL_NAMES: [RegExp, string][] = [
  [/NovelAI/i, "NovelAI"],
  [/ComfyUI/i, "ComfyUI"],
  [/InvokeAI/i, "InvokeAI"],
  [/Fooocus/i, "Fooocus"],
  [/Midjourney/i, "Midjourney"],
  [/DALL[·\-. ]?E/i, "ChatGPT / DALL·E"],
  [/Stable Diffusion|DreamStudio|Draw Things|DiffusionBee|Automatic1111|stable-diffusion-webui/i, "Stable Diffusion"],
  [/Leonardo\.Ai|NightCafe|Craiyon|Ideogram|Krea\.ai|SeaArt|Tensor\.Art|PixAI/i, GENERIC_GENERATOR],
];

/** Automatic1111 / Forge / SD.Next generation settings: "Steps: 20, Sampler: Euler a, CFG scale: 7, Seed: …". */
const A1111_SETTINGS = /\bSteps: \d+, (Sampler|CFG scale|Seed|Schedule type): /;

/** The first of `names` found in `value`, and the text that matched. */
function nameIn(value: string, names: [RegExp, string][]) {
  for (const [pattern, name] of names) {
    const hit = pattern.exec(value);
    if (hit) return { name, hit: hit[0] };
  }
  return null;
}

/**
 * Up to 300 readable characters around what matched. Binary containers (C2PA,
 * EXIF) keep only printable ASCII; text fields keep any language.
 */
function excerptOf(field: Field, hit?: string) {
  const at = hit ? Math.max(0, field.text.indexOf(hit) - 100) : 0;
  const window = field.text.slice(at, at + 1200);
  const readable = field.key === undefined && field.where !== "XMP"
    ? window.replace(/[^\x20-\x7E]+/g, " ")
    : window.replace(/[\x00-\x1F\x7F-\x9F]+/g, " ");
  return readable.replace(/\s+/g, " ").trim().slice(0, 300);
}

type Match = { generator: string; evidence: string; hit?: string };

function matchField(field: Field): Match | null {
  const { where, key, text: value } = field;
  const c2pa = where.startsWith("Content Credentials");

  const sourceType = AI_SOURCE_TYPE.exec(value);
  if (sourceType) {
    return {
      generator: nameIn(value, C2PA_GENERATORS)?.name ?? GENERIC_GENERATOR,
      evidence: `${where}: ${sourceType[1] === "trainedAlgorithmicMedia" ? "made with generative AI" : "contains AI-generated parts"}`,
      hit: sourceType[0],
    };
  }
  if (c2pa) {
    // Some generators sign without the IPTC term (Bing Image Creator: "AI Generated Image").
    const signer = nameIn(value, C2PA_GENERATORS);
    if (signer) return { generator: signer.name, evidence: `${where}: signed by ${signer.name}`, hit: signer.hit };
    const label = /\bAI[ -]generated\b/i.exec(value);
    if (label) return { generator: GENERIC_GENERATOR, evidence: `${where}: "AI generated"`, hit: label[0] };
    return null; // A camera's or an editor's credentials: fine.
  }

  // Settings any UI writes in A1111's format, wherever they ended up (PNG text, EXIF UserComment, comments).
  const settings = A1111_SETTINGS.exec(value) ?? (key === "parameters" ? /\bNegative prompt: /.exec(value) : null);
  if (settings) return { generator: "Stable Diffusion", evidence: `${where}: generation settings`, hit: settings[0] };
  const job = /\bJob ID: [0-9a-f]{8}-[0-9a-f]{4}-/.exec(value);
  if (job) return { generator: "Midjourney", evidence: `${where}: Midjourney job ID`, hit: job[0] };

  switch (key) {
    case "prompt":
    case "workflow":
      if (/"class_type"\s*:|"last_node_id"\s*:/.test(value)) return { generator: "ComfyUI", evidence: `${where}: ComfyUI workflow` };
      break;
    case "invokeai_metadata":
    case "invokeai_graph":
    case "sd-metadata":
    case "Dream":
      return { generator: "InvokeAI", evidence: `${where}: InvokeAI settings` };
    case "fooocus_scheme":
      return { generator: "Fooocus", evidence: `${where}: Fooocus settings` };
    case "Comment":
      if (/"uc"\s*:/.test(value) && /"(sampler|steps|scale)"\s*:/.test(value)) {
        return { generator: "NovelAI", evidence: `${where}: NovelAI settings` };
      }
      break;
    case "Title":
      if (/^AI generated image$/i.test(value.trim())) return { generator: GENERIC_GENERATOR, evidence: `${where}: "${value.trim()}"` };
      break;
  }

  // A tool's name, only where tools sign: never in free text a person wrote.
  const tools =
    key === undefined
      ? where === "XMP"
        ? [...value.matchAll(/(?:CreatorTool|softwareAgent)(?:="|>)([^"<]{1,200})/g)].map((m) => m[1]).join(" ")
        : where === "EXIF"
          ? value
          : ""
      : /^(Software|Source|Generator)$/i.test(key)
        ? value
        : "";
  const tool = tools ? nameIn(tools, TOOL_NAMES) : null;
  if (tool) {
    const what = tool.name === GENERIC_GENERATOR ? "a generator's name" : tool.name;
    return { generator: tool.name, evidence: `${where}: ${what}`, hit: tool.hit };
  }
  return null;
}

/**
 * The AI generator's mark in the file's metadata, or null. When several
 * fields match, a named generator wins over GENERIC_GENERATOR.
 */
export async function findAiSignature(bytes: Uint8Array): Promise<AiSignature | null> {
  let generic: AiSignature | null = null;
  for (const field of await metadataFields(bytes)) {
    const match = matchField(field);
    if (!match) continue;
    const signature = { generator: match.generator, evidence: match.evidence, excerpt: excerptOf(field, match.hit) };
    if (match.generator !== GENERIC_GENERATOR) return signature;
    generic ??= signature;
  }
  return generic;
}

const STEALTH_MAGICS = ["stealth_pnginfo", "stealth_pngcomp"];

/**
 * Settings hidden in the alpha channel's lowest bit, read column by column
 * (x outer, y inner), starting with a magic string. Pass the alpha values in
 * that order; the first STEALTH_BITS are enough.
 */
export function findStealthSignature(columnMajorAlpha: ArrayLike<number>): AiSignature | null {
  if (columnMajorAlpha.length < STEALTH_BITS) return null;
  let magic = "";
  for (let byte = 0; byte < STEALTH_BITS / 8; byte++) {
    let code = 0;
    for (let bit = 0; bit < 8; bit++) code = (code << 1) | (columnMajorAlpha[byte * 8 + bit] & 1);
    magic += String.fromCharCode(code);
  }
  if (!STEALTH_MAGICS.includes(magic)) return null;
  return {
    generator: "NovelAI or Stable Diffusion",
    evidence: "Settings hidden in the image's transparency (stealth PNG info)",
    excerpt: magic,
  };
}
