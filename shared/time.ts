/**
 * Day-boundary arithmetic for study streaks and daily minute totals.
 *
 * The server previously derived "today" from `new Date().toISOString().slice(0, 10)`,
 * which is the **UTC** date. This product serves two populations that are both ahead
 * of UTC — EPS workers in Korea (UTC+9) and candidates preparing in Bangladesh
 * (UTC+6) — so early-morning study was attributed to the previous day. A learner in
 * Korea studying at 08:00 and again at 20:00 the next day recorded a two-day gap and
 * silently lost their streak.
 *
 * Fixing on a single zone does not work either: KST for everyone would misfile
 * late-evening Bangladeshi study into the following day. So the offset travels with
 * the request and the server does the arithmetic.
 */

/** Minutes east of UTC. Korea = +540, Bangladesh = +360. */
export const KST_OFFSET_MINUTES = 540;

/**
 * Widest real UTC offset is +14:00 (Kiritimati) / -12:00. Bounding the value keeps a
 * spoofed offset to at most a one-day shift rather than arbitrary date injection.
 */
export const MIN_TZ_OFFSET_MINUTES = -12 * 60;
export const MAX_TZ_OFFSET_MINUTES = 14 * 60;

export function isValidTzOffset(minutes: number): boolean {
  return (
    Number.isInteger(minutes) &&
    minutes >= MIN_TZ_OFFSET_MINUTES &&
    minutes <= MAX_TZ_OFFSET_MINUTES
  );
}

/**
 * Calendar date (yyyy-mm-dd) at `offsetMinutes` east of UTC.
 * Defaults to KST because the curriculum targets work in Korea; callers that know
 * the learner's real offset should pass it.
 */
export function localDayKey(
  at: Date = new Date(),
  offsetMinutes: number = KST_OFFSET_MINUTES,
): string {
  const off = isValidTzOffset(offsetMinutes) ? offsetMinutes : KST_OFFSET_MINUTES;
  return new Date(at.getTime() + off * 60_000).toISOString().slice(0, 10);
}

/** Shift a yyyy-mm-dd key by whole days. */
export function addDayKey(dayKey: string, days: number): string {
  const d = new Date(`${dayKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Consecutive-day streak ending today (or yesterday, if today has no activity yet
 * — a streak should not read as broken merely because the learner has not studied
 * before opening the app).
 */
export function calculateStreakFrom(
  dayKeys: Iterable<string>,
  todayKey: string,
): number {
  const seen = new Set(dayKeys);
  let cursor = seen.has(todayKey) ? todayKey : addDayKey(todayKey, -1);
  let streak = 0;
  while (seen.has(cursor)) {
    streak += 1;
    cursor = addDayKey(cursor, -1);
  }
  return streak;
}

/** True for a real calendar date — rejects 2026-13-45, which passes a bare regex. */
export function isRealDayKey(dayKey: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return false;
  const d = new Date(`${dayKey}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dayKey;
}

/**
 * Guard for client-supplied history (guest import). A date outside this window is
 * either clock skew or an attempt to plant unreachable streak days.
 */
export function isPlausibleStudyDay(
  dayKey: string,
  todayKey: string,
  maxPastDays = 730,
): boolean {
  if (!isRealDayKey(dayKey)) return false;
  if (dayKey > todayKey) return false;
  return dayKey >= addDayKey(todayKey, -maxPastDays);
}
