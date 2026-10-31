import { Hono } from "hono";
import { cors } from "hono/cors";

import type { MirraEnv } from "./env";
import { ApiError } from "./lib/errors";
import type { AuthVars } from "./middleware/auth";
import { requestIdMiddleware } from "./middleware/request-id";
import { aiRoutes } from "./routes/ai";
import { attendanceRoutes } from "./routes/attendance";
import { authRoutes } from "./routes/auth";
import { checkInRoutes } from "./routes/check-ins";
import { coachRoutes } from "./routes/coach";
import { devAuthRoutes } from "./routes/dev-auth";
import { fuelRoutes } from "./routes/fuel";
import { healthRoutes } from "./routes/health";
import { historyRoutes } from "./routes/history";
import { insightsRoutes } from "./routes/insights";
import { mealPlanRoutes } from "./routes/meal-plan";
import { meRoutes } from "./routes/me";
import { onboardingRoutes } from "./routes/onboarding";
import { planRoutes } from "./routes/plans";
import { progressRoutes } from "./routes/progress";
import { todayRoutes } from "./routes/today";
import { todayActionsRoutes } from "./routes/today-actions";
import { weightRoutes } from "./routes/weight";
import { workoutEditRoutes } from "./routes/workout-edit";
import { workoutRoutes } from "./routes/workouts";

export const createApp = () => {
  const app = new Hono<{ Bindings: MirraEnv; Variables: AuthVars }>();

  app.use("*", requestIdMiddleware);
  app.use(
    "*",
    cors({
      // Reflect request origin so Expo / browser cookie flows work with credentials.
      origin: (origin) => origin || "http://127.0.0.1:8787",
      allowHeaders: [
        "Content-Type",
        "Authorization",
        "Cookie",
        "x-request-id",
        "Idempotency-Key",
        "x-mirra-user-id",
        "x-user-id",
        "expo-origin",
      ],
      exposeHeaders: ["x-request-id", "Set-Cookie", "set-auth-token"],
      credentials: true,
    }),
  );

  app.route("/", authRoutes);
  app.route("/", devAuthRoutes);
  app.route("/", healthRoutes);
  app.route("/", meRoutes);
  app.route("/", onboardingRoutes);
  app.route("/", planRoutes);
  app.route("/", todayRoutes);
  app.route("/", todayActionsRoutes);
  app.route("/", attendanceRoutes);
  app.route("/", historyRoutes);
  app.route("/", checkInRoutes);
  app.route("/", coachRoutes);
  app.route("/", fuelRoutes);
  app.route("/", mealPlanRoutes);
  app.route("/", insightsRoutes);
  app.route("/", workoutRoutes);
  app.route("/", workoutEditRoutes);
  app.route("/", progressRoutes);
  app.route("/", weightRoutes);
  app.route("/", aiRoutes);

  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json({ error: { code: err.code, message: err.message } }, err.status);
    }
    console.error(err);
    return c.json({ error: { code: "internal", message: "Internal error" } }, 500);
  });

  app.notFound((c) =>
    c.json({ error: { code: "not_found", message: "Not found" } }, 404),
  );

  return app;
};

export type MirraApp = ReturnType<typeof createApp>;
