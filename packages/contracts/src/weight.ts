import { z } from "zod";

export const WEIGHT_KG_MIN = 30;
export const WEIGHT_KG_MAX = 400;
export const WEIGHT_LIST_DEFAULT = 90;
export const WEIGHT_LIST_MAX = 365;

export const WeightBodySchema = z.object({
  kg: z.number().min(WEIGHT_KG_MIN).max(WEIGHT_KG_MAX),
  /** Epoch ms; defaults to now. */
  loggedAt: z.number().int().positive().optional(),
});

export const WeightEntrySchema = z.object({
  id: z.string(),
  kg: z.number(),
  loggedAt: z.number().int(),
});

export const WeightListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).default(WEIGHT_LIST_DEFAULT).transform((n) => Math.min(n, WEIGHT_LIST_MAX)),
});

export type WeightBody = z.infer<typeof WeightBodySchema>;
export type WeightEntry = z.infer<typeof WeightEntrySchema>;
export type WeightListResponse = { items: WeightEntry[] };
