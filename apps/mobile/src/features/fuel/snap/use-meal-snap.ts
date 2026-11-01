import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useRef, useState } from "react";

import { estimateMeal, type MealSlot, uploadMealPhoto } from "@/lib/api";
import { errorMessage, logger } from "@/lib/logger";

import { useFuelStore } from "../fuel-store";
import { uriToDataUrl } from "../fuel-helpers";
import {
  draftFromEstimate,
  slotForHour,
  toAnalysisFields,
  totalsOf,
  type SnapDraft,
} from "./snap-model";
import { permissionFailure, toSnapFailure, type SnapFailure } from "./snap-errors";

export type SnapMode = "camera" | "gallery" | "describe";

export type SnapPhase =
  | { readonly name: "describe" }
  | { readonly name: "analyzing" }
  | { readonly name: "result" }
  | { readonly name: "failed"; readonly failure: SnapFailure };

type Photo = { readonly uri: string; readonly mime: string | null };

const PICK_OPTIONS = { quality: 0.5 };

/** Camera → gallery fallback (simulator has no camera). Returns null on cancel. */
const pickPhoto = async (mode: "camera" | "gallery"): Promise<Photo | null | "denied"> => {
  if (mode === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!lib.granted) return "denied";
      mode = "gallery";
    }
  }
  const run = () =>
    mode === "camera"
      ? ImagePicker.launchCameraAsync(PICK_OPTIONS)
      : ImagePicker.launchImageLibraryAsync({ ...PICK_OPTIONS, mediaTypes: ["images"] });
  const picked = await run().catch(() =>
    ImagePicker.launchImageLibraryAsync({ ...PICK_OPTIONS, mediaTypes: ["images"] }),
  );
  const asset = picked.canceled ? null : picked.assets[0];
  return asset?.uri ? { uri: asset.uri, mime: asset.mimeType ?? null } : null;
};

/** Meal snap state machine: pick → analyzing → result | failed → save. */
export const useMealSnap = (initialMode: SnapMode, onExit: () => void) => {
  const addMeal = useFuelStore((s) => s.addMeal);
  const [phase, setPhase] = useState<SnapPhase>(
    initialMode === "describe" ? { name: "describe" } : { name: "analyzing" },
  );
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [description, setDescription] = useState("");
  const [draft, setDraft] = useState<SnapDraft | null>(null);
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const runId = useRef(0);

  const analyze = useCallback(async (next: Photo | null, text: string) => {
    const id = ++runId.current;
    setPhase({ name: "analyzing" });
    setSaveError(null);
    try {
      const [imageDataUrl, media] = await Promise.all([
        next ? uriToDataUrl(next.uri, next.mime) : Promise.resolve(undefined),
        // Upload is best-effort: a failed upload must not block the estimate.
        next
          ? uploadMealPhoto(next.uri, next.mime).catch((err: unknown) => {
              logger.warn("snap.upload_failed", { message: errorMessage(err) });
              return null;
            })
          : Promise.resolve(null),
      ]);
      const estimate = await estimateMeal({
        ...(imageDataUrl ? { imageDataUrl } : {}),
        ...(text.trim() ? { description: text.trim() } : {}),
      });
      if (id !== runId.current) return;
      const slot: MealSlot = slotForHour(new Date().getHours());
      setMediaId(media);
      setDraft(draftFromEstimate(estimate, slot));
      setPhase({ name: "result" });
    } catch (err) {
      if (id !== runId.current) return;
      logger.error("snap.estimate_failed", { message: errorMessage(err) });
      setPhase({ name: "failed", failure: toSnapFailure(err) });
    }
  }, []);

  const capture = useCallback(
    async (mode: "camera" | "gallery") => {
      setPhase({ name: "analyzing" });
      const result = await pickPhoto(mode).catch(() => null);
      if (result === "denied") {
        setPhase({ name: "failed", failure: permissionFailure() });
        return;
      }
      if (!result) {
        // Nothing picked yet → leave; otherwise keep the previous result.
        if (draft) setPhase({ name: "result" });
        else onExit();
        return;
      }
      setPhoto(result);
      void analyze(result, description);
    },
    [analyze, description, draft, onExit],
  );

  useEffect(() => {
    if (initialMode !== "describe") void capture(initialMode);
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const describe = useCallback(
    (text: string) => {
      setDescription(text);
      void analyze(photo, text);
    },
    [analyze, photo],
  );

  const retry = useCallback(() => void analyze(photo, description), [analyze, photo, description]);
  const retake = useCallback(
    () => (photo ? void capture("camera") : setPhase({ name: "describe" })),
    [capture, photo],
  );
  const retakeAsDescribe = useCallback(() => setPhase({ name: "describe" }), []);
  const cancel = useCallback(() => {
    runId.current += 1;
    onExit();
  }, [onExit]);

  /** Re-run the model with the user's note (Fix sheet). */
  const refine = useCallback(
    (note: string) => {
      const merged = [description, note].filter((p) => p.trim()).join(". ");
      setDescription(merged);
      void analyze(photo, merged);
    },
    [analyze, description, photo],
  );

  const save = useCallback(async (): Promise<number | null> => {
    if (!draft || saving) return null;
    setSaving(true);
    setSaveError(null);
    try {
      const t = totalsOf(draft);
      const meal = await addMeal({
        name: draft.name,
        calories: t.kcal,
        proteinG: t.proteinG,
        carbsG: t.carbsG,
        fatG: t.fatG,
        slot: draft.slot,
        source: photo ? "snap" : "describe",
        mediaId,
        analysis: toAnalysisFields(draft),
      });
      return meal.calories;
    } catch (err) {
      logger.error("snap.save_failed", { message: errorMessage(err) });
      setSaveError("Couldn't save this meal. Try again.");
      return null;
    } finally {
      setSaving(false);
    }
  }, [addMeal, draft, mediaId, photo, saving]);

  return {
    phase,
    photo,
    description,
    draft,
    setDraft,
    saving,
    saveError,
    mediaId,
    describe,
    retry,
    retake,
    retakeAsDescribe,
    refine,
    cancel,
    capture,
    save,
  };
};
