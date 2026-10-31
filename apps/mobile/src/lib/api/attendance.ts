import { apiFetch } from "./client";

/** Mirrors contracts `AttendanceStateSchema`. */
export type AttendanceState = "none" | "open" | "active";

/** Mirrors contracts `AttendanceDaySchema`. */
export type AttendanceDay = {
  readonly date: string;
  readonly state: AttendanceState;
  readonly openedApp: boolean;
  readonly workoutDone: boolean;
  readonly mealLogged: boolean;
  readonly checkedIn: boolean;
  readonly opens: number;
  readonly firstSeenAt: number | null;
  readonly lastSeenAt: number | null;
};

/** Mirrors contracts `AttendanceWeekResponseSchema`. */
export type AttendanceWeek = {
  readonly today: string;
  readonly start: string;
  readonly days: readonly AttendanceDay[];
};

/** Mirrors contracts `HistoryDayResponseSchema`. */
export type DayHistory = {
  readonly date: string;
  readonly presence: {
    readonly state: AttendanceState;
    readonly firstSeenAt: number | null;
  };
  readonly plannedWorkout: { readonly title: string } | null;
  readonly workout: {
    readonly sessions: number;
    readonly completedSets: number;
    readonly title: string | null;
  };
  readonly meals: {
    readonly count: number;
    readonly kcal: number;
    readonly proteinG: number;
  };
  readonly water: { readonly loggedMl: number; readonly targetMl: number };
  readonly checkIn: {
    readonly status: string;
    readonly note: string | null;
  } | null;
  readonly weightKg: number | null;
};

/** The server derives the local date from the profile timezone; the client never sends one. */
export const pingAttendance = () =>
  apiFetch<AttendanceWeek>("/v1/attendance/ping", {
    method: "POST",
    body: { source: "app_open" },
    quiet: true,
  });

export const getAttendanceWeek = (start?: string) =>
  apiFetch<AttendanceWeek>("/v1/attendance/week", {
    query: { start },
    quiet: true,
  });

export const getDayHistory = (date: string) =>
  apiFetch<DayHistory>("/v1/history/day", { query: { date }, quiet: true });
