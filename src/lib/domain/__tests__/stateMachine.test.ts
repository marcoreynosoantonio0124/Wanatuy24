import { describe, it, expect } from "vitest";
import {
  transition,
  canTransition,
  isRemindable,
  isTerminal,
  InvalidTransitionError,
  type OccurrenceStatus,
} from "@/lib/domain/stateMachine";

describe("occurrence state machine (spec §4.3)", () => {
  it("walks the time-driven happy path", () => {
    expect(transition("UPCOMING", { type: "REACH_DUE" })).toBe("DUE");
    expect(transition("DUE", { type: "REACH_OVERDUE" })).toBe("OVERDUE");
    expect(transition("OVERDUE", { type: "EXHAUST_POLICY" })).toBe("OVERDUE_ESCALATED");
  });

  it("allows proof submission from every remindable state", () => {
    const remindable: OccurrenceStatus[] = [
      "UPCOMING",
      "DUE",
      "OVERDUE",
      "OVERDUE_ESCALATED",
      "REJECTED",
    ];
    for (const s of remindable) {
      expect(transition(s, { type: "SUBMIT_PROOF" })).toBe("SUBMITTED");
    }
  });

  it("confirms and waives correctly", () => {
    expect(transition("SUBMITTED", { type: "CONFIRM" })).toBe("CONFIRMED");
    expect(transition("DUE", { type: "WAIVE" })).toBe("WAIVED");
    expect(transition("OVERDUE_ESCALATED", { type: "WAIVE" })).toBe("WAIVED");
  });

  it("rejection returns to DUE, or OVERDUE past grace (resume from current step)", () => {
    expect(transition("SUBMITTED", { type: "REJECT" })).toBe("DUE");
    expect(transition("SUBMITTED", { type: "REJECT" }, { pastGrace: true })).toBe("OVERDUE");
  });

  it("rejects illegal transitions", () => {
    expect(() => transition("CONFIRMED", { type: "SUBMIT_PROOF" })).toThrow(
      InvalidTransitionError
    );
    expect(() => transition("WAIVED", { type: "CONFIRM" })).toThrow(InvalidTransitionError);
    expect(() => transition("UPCOMING", { type: "CONFIRM" })).toThrow(InvalidTransitionError);
    expect(() => transition("CONFIRMED", { type: "WAIVE" })).toThrow(InvalidTransitionError);
    expect(() => transition("UPCOMING", { type: "EXHAUST_POLICY" })).toThrow(
      InvalidTransitionError
    );
  });

  it("cannot submit proof once confirmed or waived (idempotency guard)", () => {
    expect(canTransition("CONFIRMED", { type: "SUBMIT_PROOF" })).toBe(false);
    expect(canTransition("WAIVED", { type: "SUBMIT_PROOF" })).toBe(false);
  });

  it("classifies remindable and terminal states", () => {
    expect(isRemindable("DUE")).toBe(true);
    expect(isRemindable("CONFIRMED")).toBe(false);
    expect(isTerminal("CONFIRMED")).toBe(true);
    expect(isTerminal("WAIVED")).toBe(true);
    expect(isTerminal("OVERDUE")).toBe(false);
  });
});
