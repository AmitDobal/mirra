import { create } from "zustand";

import {
  getProgressPhotoById,
  listProgressPhotos,
  saveProgressPhoto,
  upsertProgressPhotoMirror,
  type LocalProgressPhoto,
} from "@/db";
import {
  cacheProgressPhotoMedia,
  createProgressPhotoApi,
  listProgressPhotosApi,
  PROGRESS_PAGE_SIZE,
  type ProgressPhotoDto,
} from "@/lib/api/progress";
import { errorMessage, logger } from "@/lib/logger";

export type ProgressPhoto = {
  readonly id: string;
  readonly label: string;
  readonly note: string;
  readonly takenAt: number;
  readonly uri: string | null;
  readonly kg: string;
  readonly bf: string;
  readonly pose: "front" | "side";
};

type ProgressState = {
  readonly photos: readonly ProgressPhoto[];
  readonly nextCursor: string | null;
  readonly loadingMore: boolean;
  readonly hydrate: () => Promise<void>;
  readonly loadMore: () => Promise<void>;
  readonly addPhoto: (input?: {
    uri?: string | null;
    label?: string;
    pose?: "front" | "side";
  }) => Promise<ProgressPhoto>;
  readonly latestTwo: () => readonly [ProgressPhoto | null, ProgressPhoto | null];
};

const toPose = (pose: string): "front" | "side" =>
  pose === "side" ? "side" : "front";

/** Placeholder entries (no real photo) must never reach <Image source>. */
const toDisplayUri = (uri: string | null | undefined): string | null =>
  !uri || uri.startsWith("placeholder://") ? null : uri;

const labelFor = (takenAt: number) =>
  `Check-in · ${new Date(takenAt).toLocaleDateString()}`;

const fromLocal = (row: LocalProgressPhoto): ProgressPhoto => ({
  id: row.id,
  label: labelFor(row.takenAt),
  note: row.note ?? "On-device entry",
  takenAt: row.takenAt,
  uri: toDisplayUri(row.localUri),
  kg: "—",
  bf: "—",
  pose: toPose(row.pose),
});

const fromRemote = (row: ProgressPhotoDto, uri: string | null): ProgressPhoto => ({
  id: row.id,
  label: labelFor(row.takenAt),
  note: row.note ?? "Synced",
  takenAt: row.takenAt,
  uri: toDisplayUri(uri),
  kg: "—",
  bf: "—",
  pose: toPose(row.pose),
});

const resolveRemoteUri = async (row: ProgressPhotoDto): Promise<string | null> => {
  const existing = await getProgressPhotoById(row.id).catch(() => null);
  const cached = toDisplayUri(existing?.localUri);
  if (cached) return cached;
  if (!row.hasMedia || !row.mediaPath) return null;
  try {
    return await cacheProgressPhotoMedia(row.id, row.mediaPath);
  } catch (err) {
    logger.warn("progress.media_cache_failed", { message: errorMessage(err) });
    return null;
  }
};

const mirrorRemote = async (row: ProgressPhotoDto, uri: string | null): Promise<void> => {
  try {
    await upsertProgressPhotoMirror({
      id: row.id,
      localUri: uri ?? `placeholder://${row.id}`,
      pose: toPose(row.pose),
      takenAt: row.takenAt,
      note: row.note,
    });
  } catch (err) {
    logger.warn("progress.mirror_failed", { message: errorMessage(err) });
  }
};

const mapRemotePage = async (
  items: readonly ProgressPhotoDto[],
): Promise<ProgressPhoto[]> => {
  const out: ProgressPhoto[] = [];
  for (const row of items) {
    const uri = await resolveRemoteUri(row);
    await mirrorRemote(row, uri);
    out.push(fromRemote(row, uri));
  }
  return out;
};

const readLocalBase64 = async (uri: string): Promise<string | null> => {
  try {
    if (uri.startsWith("placeholder://")) return null;
    const res = await fetch(uri);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0) return null;
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) {
      binary += String.fromCharCode(...buf.subarray(i, i + chunk));
    }
    return btoa(binary);
  } catch {
    return null;
  }
};

export const useProgressStore = create<ProgressState>((set, get) => ({
  photos: [],
  nextCursor: null,
  loadingMore: false,

  hydrate: async () => {
    try {
      const remote = await listProgressPhotosApi(null, PROGRESS_PAGE_SIZE);
      const photos = await mapRemotePage(remote.items);
      set({ photos, nextCursor: remote.nextCursor });
      return;
    } catch (err) {
      logger.warn("progress.hydrate.api_failed", { message: errorMessage(err) });
    }
    try {
      const rows = await listProgressPhotos(undefined, PROGRESS_PAGE_SIZE);
      set({ photos: rows.map(fromLocal), nextCursor: null });
    } catch {
      /* keep prior */
    }
  },

  loadMore: async () => {
    const { nextCursor, loadingMore } = get();
    if (!nextCursor || loadingMore) return;
    set({ loadingMore: true });
    try {
      const page = await listProgressPhotosApi(nextCursor, PROGRESS_PAGE_SIZE);
      const mapped = await mapRemotePage(page.items);
      set((s) => {
        const seen = new Set(s.photos.map((p) => p.id));
        const fresh = mapped.filter((r) => !seen.has(r.id));
        return { photos: [...s.photos, ...fresh], nextCursor: page.nextCursor };
      });
    } catch (err) {
      logger.warn("progress.load_more_failed", { message: errorMessage(err) });
    } finally {
      set({ loadingMore: false });
    }
  },

  addPhoto: async (input) => {
    const pose = input?.pose ?? "front";
    const takenAt = Date.now();
    const label = input?.label ?? labelFor(takenAt);
    const note = input?.uri ? "Imported from camera roll" : "On-device entry";
    const localUri = input?.uri ?? `placeholder://${Date.now()}`;

    let id = `photo_${Date.now()}`;
    try {
      const saved = await saveProgressPhoto({
        localUri,
        pose,
        takenAt,
        note,
      });
      id = saved.id;
    } catch (err) {
      logger.warn("progress.local_save_failed", { message: errorMessage(err) });
    }

    const entry: ProgressPhoto = {
      id,
      label,
      note,
      takenAt,
      uri: toDisplayUri(input?.uri),
      kg: "—",
      bf: "—",
      pose,
    };
    set((s) => ({ photos: [entry, ...s.photos] }));

    try {
      const imageBase64 = input?.uri ? await readLocalBase64(input.uri) : null;
      const remote = await createProgressPhotoApi({
        pose,
        note,
        takenAt,
        ...(imageBase64
          ? { imageBase64, contentType: "image/jpeg" as const }
          : {}),
      });
      const uri =
        entry.uri ??
        (await cacheProgressPhotoMedia(remote.id, remote.mediaPath).catch(() => null));
      await mirrorRemote(remote, uri ?? entry.uri);
      const synced = fromRemote(remote, uri ?? entry.uri);
      set((s) => ({
        photos: s.photos.map((p) => (p.id === entry.id ? { ...synced, label } : p)),
      }));
      return { ...synced, label };
    } catch (err) {
      logger.error("progress.create_api_failed", { message: errorMessage(err) });
      return entry;
    }
  },

  latestTwo: () => {
    const [a, b] = get().photos;
    return [a ?? null, b ?? null] as const;
  },
}));
