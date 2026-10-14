import { AwsClient } from "aws4fetch";

/*
 * Just enough of the S3 API for the art backup: put, list, delete, and a
 * small JSON state file. Works with any S3-compatible store (Cloudflare R2,
 * Backblaze B2, MinIO, Supabase's own S3 endpoint for local tests), using
 * path-style URLs: <endpoint>/<bucket>/<key>.
 */

export type BackupTarget = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};

/** The backup bucket from the environment, or null when it isn't set up yet. */
export function backupTargetFromEnv(env: Record<string, string | undefined> = process.env): BackupTarget | null {
  const { BACKUP_S3_ENDPOINT, BACKUP_S3_BUCKET, BACKUP_S3_ACCESS_KEY_ID, BACKUP_S3_SECRET_ACCESS_KEY } = env;
  if (!BACKUP_S3_ENDPOINT || !BACKUP_S3_BUCKET || !BACKUP_S3_ACCESS_KEY_ID || !BACKUP_S3_SECRET_ACCESS_KEY) return null;
  return {
    endpoint: BACKUP_S3_ENDPOINT.replace(/\/$/, ""),
    bucket: BACKUP_S3_BUCKET,
    accessKeyId: BACKUP_S3_ACCESS_KEY_ID,
    secretAccessKey: BACKUP_S3_SECRET_ACCESS_KEY,
    region: env.BACKUP_S3_REGION || "auto",
  };
}

const encodeKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");

const decodeXml = (text: string) =>
  text.replace(/&(lt|gt|amp|quot|apos);/g, (_, name: string) => ({ lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" })[name]!);

export function s3(target: BackupTarget) {
  const client = new AwsClient({
    accessKeyId: target.accessKeyId,
    secretAccessKey: target.secretAccessKey,
    service: "s3",
    region: target.region,
  });
  const url = (key = "") => `${target.endpoint}/${target.bucket}${key ? `/${encodeKey(key)}` : ""}`;

  async function check(res: Response, what: string) {
    if (!res.ok) throw new Error(`${what}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    return res;
  }

  return {
    async put(key: string, body: Blob | Uint8Array | string, type = "application/octet-stream") {
      await check(await client.fetch(url(key), { method: "PUT", body: body as BodyInit, headers: { "Content-Type": type } }), `put ${key}`);
    },

    /** The JSON at `key`, or null when there's none yet. */
    async getJson<T>(key: string): Promise<T | null> {
      const res = await client.fetch(url(key));
      if (res.status === 404) return null;
      return (await check(res, `get ${key}`)).json() as Promise<T>;
    },

    /** Removes a key. False when the store refuses (a retention lock still holds it). */
    async delete(key: string) {
      const res = await client.fetch(url(key), { method: "DELETE" });
      return res.ok || res.status === 404;
    },

    /** Every key under `prefix`, a page at a time. */
    async *list(prefix: string) {
      let token: string | null = null;
      do {
        const query: URLSearchParams = new URLSearchParams({ "list-type": "2", prefix, ...(token && { "continuation-token": token }) });
        const xml: string = await (await check(await client.fetch(`${url()}?${query}`), `list ${prefix}`)).text();
        yield [...xml.matchAll(/<Key>([\s\S]*?)<\/Key>/g)].map((match) => decodeXml(match[1]));
        token = /<IsTruncated>true<\/IsTruncated>/.test(xml)
          ? decodeXml(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(xml)?.[1] ?? "") || null
          : null;
      } while (token);
    },
  };
}
