import { describe, it, expect } from "vitest";
import { dueState, totalDue } from "./loans";

// Fixed reference point so these do not start failing on a particular date.
const today = new Date(2026, 8, 8, 14, 30); // 8 September 2026, half past two

describe("dueState", () => {
  it("reports a date in the past as overdue, counting whole days", () => {
    expect(dueState("2026-09-01", today)).toEqual({ kind: "overdue", days: 7 });
  });

  it("treats the due date itself as today, not overdue", () => {
    // The reference time is the afternoon; a loan due today should still read
    // as due today rather than flipping to overdue partway through the day.
    expect(dueState("2026-09-08", today)).toEqual({ kind: "today" });
  });

  it("flags tomorrow as due soon", () => {
    expect(dueState("2026-09-09", today)).toEqual({ kind: "soon", days: 1 });
  });

  it("still counts the seventh day as soon", () => {
    expect(dueState("2026-09-15", today)).toEqual({ kind: "soon", days: 7 });
  });

  it("stops drawing attention past a week", () => {
    expect(dueState("2026-09-16", today)).toEqual({ kind: "later" });
  });

  it("counts across a month boundary", () => {
    expect(dueState("2026-10-01", today)).toEqual({ kind: "later" });
    expect(dueState("2026-08-30", today)).toEqual({ kind: "overdue", days: 9 });
  });

  it("does not throw on a malformed date", () => {
    expect(dueState("not-a-date", today)).toEqual({ kind: "later" });
  });
});

describe("totalDue", () => {
  it("treats interest as a flat surcharge, not an annual rate", () => {
    expect(totalDue(1000, 5)).toBe(1050);
  });

  it("rounds to the øre the same way the database does", () => {
    expect(totalDue(3333, 7.5)).toBe(3582.98);
  });

  it("returns the principal when there is no interest", () => {
    expect(totalDue(2500, 0)).toBe(2500);
  });
});
