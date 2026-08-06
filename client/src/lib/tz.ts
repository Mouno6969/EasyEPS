/**
 * The learner's UTC offset in minutes east of UTC.
 *
 * Sent with any mutation that records a study day. The server previously derived the
 * date from UTC, which put the day boundary at 09:00 for learners in Korea — early
 * morning study landed on the previous day and broke streaks. `getTimezoneOffset`
 * returns minutes *behind* UTC, so the sign is flipped here.
 */
export function tzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}
