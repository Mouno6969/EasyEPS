import { describe, expect, it } from "vitest";
import {
  addDayKey,
  calculateStreakFrom,
  isPlausibleStudyDay,
  isRealDayKey,
  isValidTzOffset,
  KST_OFFSET_MINUTES,
  localDayKey,
} from "../shared/time";

const BST = 360; // Bangladesh, UTC+6

describe("study-day attribution", () => {
  it("attributes early-morning Korean study to the correct local day", () => {
    // 08:00 in Korea on 2 Jan is 23:00 UTC on 1 Jan. Using the UTC date recorded the
    // session against the wrong day and silently broke streaks.
    const at = new Date(Date.UTC(2026, 0, 1, 23, 0, 0));
    expect(at.toISOString().slice(0, 10)).toBe("2026-01-01"); // the old behaviour
    expect(localDayKey(at, KST_OFFSET_MINUTES)).toBe("2026-01-02");
  });

  it("attributes late-evening Bangladeshi study to the same local day", () => {
    // 23:00 in Dhaka on 2 Jan is 17:00 UTC — a fixed KST rule would push this to 3 Jan.
    const at = new Date(Date.UTC(2026, 0, 2, 17, 0, 0));
    expect(localDayKey(at, BST)).toBe("2026-01-02");
    expect(localDayKey(at, KST_OFFSET_MINUTES)).toBe("2026-01-03");
  });

  it("keeps consecutive Korean study days consecutive", () => {
    const first = new Date(Date.UTC(2026, 0, 1, 23, 0, 0)); // 2 Jan 08:00 KST
    const second = new Date(Date.UTC(2026, 0, 3, 11, 0, 0)); // 3 Jan 20:00 KST
    const days = [localDayKey(first, KST_OFFSET_MINUTES), localDayKey(second, KST_OFFSET_MINUTES)];
    expect(days).toEqual(["2026-01-02", "2026-01-03"]);
    expect(calculateStreakFrom(days, "2026-01-03")).toBe(2);
  });

  it("falls back to KST for clients that send no offset", () => {
    const at = new Date(Date.UTC(2026, 0, 1, 23, 0, 0));
    expect(localDayKey(at)).toBe(localDayKey(at, KST_OFFSET_MINUTES));
  });

  it("ignores an out-of-range offset instead of trusting it", () => {
    const at = new Date(Date.UTC(2026, 0, 1, 23, 0, 0));
    expect(isValidTzOffset(99999)).toBe(false);
    expect(localDayKey(at, 99999)).toBe(localDayKey(at, KST_OFFSET_MINUTES));
  });
});

describe("streak counting", () => {
  it("counts back from today", () => {
    expect(calculateStreakFrom(["2026-03-03", "2026-03-02", "2026-03-01"], "2026-03-03")).toBe(3);
  });

  it("does not break a streak just because today has no activity yet", () => {
    expect(calculateStreakFrom(["2026-03-02", "2026-03-01"], "2026-03-03")).toBe(2);
  });

  it("stops at a real gap", () => {
    expect(calculateStreakFrom(["2026-03-03", "2026-03-01"], "2026-03-03")).toBe(1);
  });

  it("returns zero when the last activity is older than yesterday", () => {
    expect(calculateStreakFrom(["2026-02-20"], "2026-03-03")).toBe(0);
  });

  it("crosses month and year boundaries", () => {
    expect(calculateStreakFrom(["2026-01-01", "2025-12-31", "2025-12-30"], "2026-01-01")).toBe(3);
  });

  it("is not inflated by duplicate day keys", () => {
    expect(calculateStreakFrom(["2026-03-03", "2026-03-03", "2026-03-03"], "2026-03-03")).toBe(1);
  });
});

describe("client-supplied study dates", () => {
  it("rejects dates the bare regex would accept", () => {
    // These pass /^\d{4}-\d{2}-\d{2}$/ but are not usable calendar dates.
    expect(isRealDayKey("2026-13-45")).toBe(false);
    expect(isRealDayKey("0000-00-00")).toBe(false);
    expect(isRealDayKey("2026-02-30")).toBe(false);
    expect(isRealDayKey("2026-03-03")).toBe(true);
  });

  it("rejects future days that no streak could ever reach", () => {
    expect(isPlausibleStudyDay("2999-12-31", "2026-03-03")).toBe(false);
    expect(isPlausibleStudyDay("2026-03-04", "2026-03-03")).toBe(false);
    expect(isPlausibleStudyDay("2026-03-03", "2026-03-03")).toBe(true);
  });

  it("accepts genuine history but not indefinitely old entries", () => {
    expect(isPlausibleStudyDay(addDayKey("2026-03-03", -30), "2026-03-03")).toBe(true);
    expect(isPlausibleStudyDay(addDayKey("2026-03-03", -1000), "2026-03-03")).toBe(false);
  });
});

describe("API date inputs", () => {
  it("rejects impossible dates that a bare regex would let into the database", () => {
    // planner.add, planner.saveSettings, progress.overview and importGuest all took
    // z.string().regex(/^\d{4}-\d{2}-\d{2}$/), which admits these.
    const bareRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (const bad of ["2026-13-45", "0000-00-00", "2026-02-30"]) {
      expect(bareRegex.test(bad), `${bad} passes the old regex`).toBe(true);
      expect(isRealDayKey(bad), `${bad} rejected now`).toBe(false);
    }
    expect(isRealDayKey("2026-06-15")).toBe(true);
  });
});
