import type { RecipeThread, RecipeTurn } from "@mirra/contracts";
import { and, desc, eq, gt, sql } from "drizzle-orm";

import type { AppDB } from "../db";
import { recipeChatThreads, recipeChatTurns } from "../db/schema";
import { newId } from "../lib/id";

export type ThreadRow = typeof recipeChatThreads.$inferSelect;
export type TurnRow = typeof recipeChatTurns.$inferSelect;

/** Last-N window shown in the UI and fed to the model. */
export const HISTORY_TURNS = 6;
const ORPHAN_AFTER_MS = 60_000;

export const toThreadView = (t: ThreadRow): RecipeThread => ({
  id: t.id,
  turnsUsed: t.turnCount,
  maxTurns: t.maxTurns,
  turnsLeft: Math.max(0, t.maxTurns - t.turnCount),
});

export const toTurnView = (t: TurnRow): RecipeTurn => ({
  id: t.id,
  idx: t.idx,
  role: t.role as RecipeTurn["role"],
  text: t.text,
});

export const findThread = async (db: AppDB, userId: string, itemId: string): Promise<ThreadRow | null> => {
  const [row] = await db
    .select()
    .from(recipeChatThreads)
    .where(and(eq(recipeChatThreads.userId, userId), eq(recipeChatThreads.planItemId, itemId)))
    .limit(1);
  return row ?? null;
};

export const getOrCreateThread = async (
  db: AppDB,
  userId: string,
  itemId: string,
  maxTurns: number,
): Promise<ThreadRow> => {
  await db
    .insert(recipeChatThreads)
    .values({ id: newId(), userId, planItemId: itemId, maxTurns })
    .onConflictDoNothing();
  return (await findThread(db, userId, itemId))!;
};

/** Oldest first, newest `limit` rows. */
export const listTurns = async (db: AppDB, threadId: string, limit = 30): Promise<TurnRow[]> => {
  const rows = await db
    .select()
    .from(recipeChatTurns)
    .where(eq(recipeChatTurns.threadId, threadId))
    .orderBy(desc(recipeChatTurns.idx))
    .limit(limit);
  return rows.reverse();
};

/** Replay: the stored assistant reply for a client request id, if this exact request already ran. */
export const findReplay = async (
  db: AppDB,
  threadId: string,
  clientRequestId: string,
): Promise<TurnRow | null> => {
  const [user] = await db
    .select()
    .from(recipeChatTurns)
    .where(and(eq(recipeChatTurns.threadId, threadId), eq(recipeChatTurns.clientRequestId, clientRequestId)))
    .limit(1);
  if (!user) return null;
  const [reply] = await db
    .select()
    .from(recipeChatTurns)
    .where(and(eq(recipeChatTurns.threadId, threadId), eq(recipeChatTurns.idx, user.idx + 1)))
    .limit(1);
  return reply ?? null;
};

/** User messages sent in the last minute across all of this user's threads (rate limit input). */
export const countRecentUserTurns = async (db: AppDB, userId: string, sinceMs: number): Promise<number> => {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(recipeChatTurns)
    .innerJoin(recipeChatThreads, eq(recipeChatTurns.threadId, recipeChatThreads.id))
    .where(
      and(
        eq(recipeChatThreads.userId, userId),
        eq(recipeChatTurns.role, "user"),
        gt(recipeChatTurns.createdAt, new Date(sinceMs)),
      ),
    );
  return Number(row?.n ?? 0);
};

/**
 * Claim the next idx with the user's message BEFORE the provider call. The unique
 * (thread_id, idx) index makes a concurrent double-send fail here, before any credit is held.
 * Returns null when the slot is genuinely taken.
 */
export const claimUserTurn = async (
  db: AppDB,
  thread: ThreadRow,
  text: string,
  clientRequestId: string | undefined,
): Promise<TurnRow | null> => {
  const idx = thread.turnCount * 2;
  const row = {
    id: newId(),
    threadId: thread.id,
    idx,
    role: "user",
    text,
    clientRequestId: clientRequestId ?? null,
    createdAt: new Date(),
  };
  try {
    await db.insert(recipeChatTurns).values(row);
    return { ...row, source: null, creditsCharged: 0 };
  } catch {
    // A crashed request can leave an orphan user turn. Reclaim it once it is clearly stale.
    const [held] = await db
      .select()
      .from(recipeChatTurns)
      .where(and(eq(recipeChatTurns.threadId, thread.id), eq(recipeChatTurns.idx, idx)))
      .limit(1);
    if (!held || held.role !== "user" || held.createdAt.getTime() > Date.now() - ORPHAN_AFTER_MS) return null;
    await db.delete(recipeChatTurns).where(eq(recipeChatTurns.id, held.id));
    return claimUserTurn(db, thread, text, clientRequestId);
  }
};

export const dropTurn = async (db: AppDB, turnId: string): Promise<void> => {
  await db.delete(recipeChatTurns).where(eq(recipeChatTurns.id, turnId));
};

/** Persist the assistant reply and bump the thread counter in one atomic batch. */
export const finishTurn = async (
  db: AppDB,
  thread: ThreadRow,
  userTurn: TurnRow,
  reply: { text: string; source: string; charged: number },
): Promise<ThreadRow> => {
  const turnCount = thread.turnCount + 1;
  await db.batch([
    db.insert(recipeChatTurns).values({
      id: newId(),
      threadId: thread.id,
      idx: userTurn.idx + 1,
      role: "assistant",
      text: reply.text,
      source: reply.source,
      creditsCharged: reply.charged,
      createdAt: new Date(),
    }),
    db
      .update(recipeChatThreads)
      .set({ turnCount, status: turnCount >= thread.maxTurns ? "capped" : "open", updatedAt: new Date() })
      .where(eq(recipeChatThreads.id, thread.id)),
  ]);
  return { ...thread, turnCount };
};

export const saveRecipe = async (
  db: AppDB,
  threadId: string,
  recipe: { json: string; key: string; source: string; contextHash: string },
): Promise<void> => {
  await db
    .update(recipeChatThreads)
    .set({
      recipeJson: recipe.json,
      recipeKey: recipe.key,
      recipeSource: recipe.source,
      contextHash: recipe.contextHash,
      updatedAt: new Date(),
    })
    .where(eq(recipeChatThreads.id, threadId));
};

export const listHistory = async (db: AppDB, threadId: string): Promise<TurnRow[]> =>
  (await listTurns(db, threadId, HISTORY_TURNS)).sort((a, b) => a.idx - b.idx);
