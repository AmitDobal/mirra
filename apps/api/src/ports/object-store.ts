/** Object storage port — R2 adapter or stub. */

export type MediaKind = "mirror" | "progress" | "meal";

export type UploadUrlRequest = {
  userId: string;
  mediaId: string;
  kind: MediaKind;
  contentType: string;
  maxBytes: number;
};

export type UploadUrlResult = {
  uploadUrl: string;
  headers: Record<string, string>;
  expiresAt: number;
  r2Key: string;
};

export type ObjectHead = {
  exists: boolean;
  bytes: number | null;
  contentType: string | null;
};

export type ObjectPutRequest = {
  r2Key: string;
  body: ArrayBuffer | Uint8Array | string;
  contentType: string;
};

export type ObjectGetResult = {
  body: ArrayBuffer;
  contentType: string | null;
  bytes: number;
};

export type ObjectStore = {
  createUploadUrl: (req: UploadUrlRequest) => Promise<UploadUrlResult>;
  put: (req: ObjectPutRequest) => Promise<{ bytes: number }>;
  get: (r2Key: string) => Promise<ObjectGetResult | null>;
  head: (r2Key: string) => Promise<ObjectHead>;
  deletePrefix: (prefix: string) => Promise<void>;
};

export const stubObjectStore: ObjectStore = {
  createUploadUrl: async () => {
    throw new Error("ObjectStore not configured");
  },
  put: async () => {
    throw new Error("ObjectStore not configured");
  },
  get: async () => null,
  head: async () => ({ exists: false, bytes: null, contentType: null }),
  deletePrefix: async () => {
    throw new Error("ObjectStore not configured");
  },
};
