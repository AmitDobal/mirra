/** R2 object storage port — stub until signed upload adapter lands. */

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

export type ObjectStore = {
  createUploadUrl: (req: UploadUrlRequest) => Promise<UploadUrlResult>;
  head: (r2Key: string) => Promise<ObjectHead>;
  deletePrefix: (prefix: string) => Promise<void>;
};

export const stubObjectStore: ObjectStore = {
  createUploadUrl: async () => {
    throw new Error("ObjectStore not configured");
  },
  head: async () => ({ exists: false, bytes: null, contentType: null }),
  deletePrefix: async () => {
    throw new Error("ObjectStore not configured");
  },
};
