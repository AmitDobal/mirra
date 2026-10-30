import { create } from "zustand";

import { listProgressPhotos, saveProgressPhoto, type LocalProgressPhoto } from "@/db";

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
  readonly hydrate: () => Promise<void>;
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

const fromLocal = (row: LocalProgressPhoto): ProgressPhoto => {
  const uri =
    row.localUri.startsWith("placeholder://") ? null : row.localUri;
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

export const useProgressStore = create<ProgressState>((set, get) => ({
  photos: [],

  hydrate: async () => {
    try {
      const rows = await listProgressPhotos();
      set({ photos: rows.map(fromLocal) });
    } catch {
      /* keep prior */
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
    } catch {
      /* keep local id */
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
    return entry;
  },

  latestTwo: () => {
    const [a, b] = get().photos;
    return [a ?? null, b ?? null] as const;
  },
}));
