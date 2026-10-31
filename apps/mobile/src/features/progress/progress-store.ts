import { create } from "zustand";

import { listProgressPhotos, saveProgressPhoto, type LocalProgressPhoto } from "@/db";
import {
  createProgressPhotoApi,
  listProgressPhotosApi,
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
  /** Opaque cursor for the next (older) page; null = no more remote pages. */
  readonly nextCursor: string | null;
  readonly loadingMore: boolean;
  /** First page (refresh). */
  readonly hydrate: () => Promise<void>;
  /** Append the next page; no-op when exhausted or already loading. */
  readonly loadMore: () => Promise<void>;
  readonly addPhoto: (input?: {
    uri?: string | null;
    label?: string;
    pose?: "front" | "side";
  }) => Promise<ProgressPhoto>;
  readonly latestTwo: () => readonly [ProgressPhoto | null, ProgressPhoto | null];
};

const uid = () => `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const toPose = (pose: string): "front" | "side" =>
  pose === "side" ? "side" : "front";

/** Placeholder entries (no real photo) must never reach <Image source>. */
const toDisplayUri = (uri: string | null | undefined): string | null =>
  !uri || uri.startsWith("placeholder://") ? null : uri;

const fromLocal = (row: LocalProgressPhoto): ProgressPhoto => {
  const uri = toDisplayUri(row.localUri);
  return {
    id: row.id,
    label: `Check-in · ${new Date(row.takenAt).toLocaleDateString()}`,
    note: row.note ?? "On-device entry",
    takenAt: row.takenAt,
    uri,
    kg: "—",
    bf: "—",
    pose: toPose(row.pose),
  };
};

const fromRemote = (row: ProgressPhotoDto): ProgressPhoto => ({
  id: row.id,
  label: `Check-in · ${new Date(row.takenAt).toLocaleDateString()}`,
  note: row.note ?? "Synced",
  takenAt: row.takenAt,
  uri: toDisplayUri(row.uri),
  kg: "—",
  bf: "—",
  pose: toPose(row.pose),
});

export const useProgressStore = create<ProgressState>((set, get) => ({
  photos: [],
  nextCursor: null,
  loadingMore: false,

  hydrate: async () => {
    try {
      const remote = await listProgressPhotosApi();
      if (remote.items.length > 0) {
        set({ photos: remote.items.map(fromRemote), nextCursor: remote.nextCursor });
        return;
      }
    } catch (err) {
      logger.warn("progress.hydrate.api_failed", { message: errorMessage(err) });
    }
    try {
      const rows = await listProgressPhotos();
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
      const page = await listProgressPhotosApi(nextCursor);
      set((s) => {
        const seen = new Set(s.photos.map((p) => p.id));
        const fresh = page.items.filter((r) => !seen.has(r.id)).map(fromRemote);
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
    const label = input?.label ?? `Check-in · ${new Date().toLocaleDateString()}`;
    const note = input?.uri ? "Imported from camera roll" : "On-device entry";
    const uri = input?.uri ?? `placeholder://${uid()}`;

    let id = uid();
    try {
      const saved = await saveProgressPhoto({
        localUri: uri,
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
      uri: input?.uri ?? null,
      kg: "—",
      bf: "—",
      pose,
    };
    set((s) => ({ photos: [entry, ...s.photos] }));

    try {
      const remote = await createProgressPhotoApi({
        pose,
        note,
        takenAt,
        localUri: uri,
      });
      set((s) => ({
        photos: s.photos.map((p) =>
          p.id === entry.id ? { ...fromRemote(remote), label: entry.label } : p,
        ),
      }));
      return { ...fromRemote(remote), label: entry.label };
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
