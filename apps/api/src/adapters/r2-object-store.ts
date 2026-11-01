import type {
  ObjectGetResult,
  ObjectHead,
  ObjectPutRequest,
  ObjectStore,
  UploadUrlRequest,
  UploadUrlResult,
} from "../ports/object-store";

const keyFor = (req: UploadUrlRequest): string =>
  `${req.kind}/${req.userId}/${req.mediaId}`;

/** Cloudflare R2 binding adapter. */
export const createR2ObjectStore = (bucket: R2Bucket): ObjectStore => ({
  createUploadUrl: async (req: UploadUrlRequest): Promise<UploadUrlResult> => {
    // Worker-proxied upload: clients POST bytes to Mirra routes; key reserved here.
    const r2Key = keyFor(req);
    return {
      uploadUrl: "",
      headers: { "Content-Type": req.contentType },
      expiresAt: Date.now() + 15 * 60_000,
      r2Key,
    };
  },

  put: async (req: ObjectPutRequest): Promise<{ bytes: number }> => {
    const body =
      typeof req.body === "string"
        ? new TextEncoder().encode(req.body)
        : req.body instanceof Uint8Array
          ? req.body
          : new Uint8Array(req.body);
    await bucket.put(req.r2Key, body, {
      httpMetadata: { contentType: req.contentType },
    });
    return { bytes: body.byteLength };
  },

  get: async (r2Key: string): Promise<ObjectGetResult | null> => {
    const obj = await bucket.get(r2Key);
    if (!obj) return null;
    const body = await obj.arrayBuffer();
    return {
      body,
      contentType: obj.httpMetadata?.contentType ?? null,
      bytes: body.byteLength,
    };
  },

  head: async (r2Key: string): Promise<ObjectHead> => {
    const obj = await bucket.head(r2Key);
    if (!obj) return { exists: false, bytes: null, contentType: null };
    return {
      exists: true,
      bytes: obj.size,
      contentType: obj.httpMetadata?.contentType ?? null,
    };
  },

  deletePrefix: async (prefix: string): Promise<void> => {
    const listed = await bucket.list({ prefix });
    if (listed.objects.length === 0) return;
    await Promise.all(listed.objects.map((o) => bucket.delete(o.key)));
  },
});
