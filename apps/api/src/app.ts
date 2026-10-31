import { Hono } from "hono";
import { cors } from "hono/cors";

import type { MirraEnv } from "./env";
import { ApiError } from "./lib/errors";
import type { AuthVars } from "./middleware/auth";
import { requestIdMiddleware } from "./middleware/request-id";
import { attendanceRoutes } from "./routes/attendance";
import { checkInRoutes } from "./routes/check-ins";
import { coachRoutes } from "./routes/coach";
import { fuelRoutes } from "./routes/fuel";
import { healthRoutes } from "./routes/health";
import { historyRoutes } from "./routes/history";
import { meRoutes } from "./routes/me";
import { onboardingRoutes } from "./routes/onboarding";
import { planRoutes } from "./routes/plans";
import { todayRoutes } from "./routes/today";
import { workoutRoutes } from "./routes/workouts";

export const createApp = () => {
  const app = new Hono<{ Bindings: MirraEnv; Variables: AuthVars }>();

  app.use("*", requestIdMiddleware);
  app.use(
    "*",
    cors({
      origin: "*",
      allowHeaders: [
        "Content-Type",
        "Authorization",
        "x-request-id",
        "Idempotency-Key",
        "x-mirra-user-id",
        "x-user-id",
      ],
      exposeHeaders: ["x-request-id"],
    }),
  );

  app.route("/", healthRoutes);
  app.route("/", meRoutes);
  app.route("/", onboardingRoutes);
  app.route("/", planRoutes);
  app.route("/", todayRoutes);
  app.route("/", attendanceRoutes);
  app.route("/", historyRoutes);
  app.route("/", checkInRoutes);
  app.route("/", coachRoutes);
  app.route("/", fuelRoutes);
  app.route("/", workoutRoutes);

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
