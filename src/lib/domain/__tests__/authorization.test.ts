import { describe, it, expect } from "vitest";
import {
  canReadAgreement,
  canSubmitProof,
  canReviewProof,
  canWaive,
  canManageAgreement,
  assert,
  ForbiddenError,
  type AuthContext,
} from "@/lib/domain/authorization";

function ctx(userId: string, roles: Array<"LESSOR" | "RENTER" | "COMANAGER">): AuthContext {
  return {
    userId,
    memberships: roles.map((role) => ({ userId, role, acceptedAt: new Date() })),
  };
}

const lessor = ctx("u-lessor", ["LESSOR"]);
const comanager = ctx("u-co", ["COMANAGER"]);
const renter = ctx("u-renter", ["RENTER"]);
const self = ctx("u-self", ["LESSOR", "RENTER"]); // self-agreement (spec A5)
const stranger: AuthContext = { userId: "u-x", memberships: [] };

describe("read access", () => {
  it("any member can read; non-members cannot", () => {
    expect(canReadAgreement(lessor)).toBe(true);
    expect(canReadAgreement(renter)).toBe(true);
    expect(canReadAgreement(stranger)).toBe(false);
  });
});

describe("submit proof (must hold responsibleRole)", () => {
  it("RENTER obligation: renter submits, lessor cannot", () => {
    expect(canSubmitProof(renter, "RENTER")).toBe(true);
    expect(canSubmitProof(lessor, "RENTER")).toBe(false);
    expect(canSubmitProof(stranger, "RENTER")).toBe(false);
  });

  it("LESSOR obligation: lessor/comanager submits, renter cannot", () => {
    expect(canSubmitProof(lessor, "LESSOR")).toBe(true);
    expect(canSubmitProof(comanager, "LESSOR")).toBe(true);
    expect(canSubmitProof(renter, "LESSOR")).toBe(false);
  });

  it("self-agreement holder can submit either way", () => {
    expect(canSubmitProof(self, "RENTER")).toBe(true);
    expect(canSubmitProof(self, "LESSOR")).toBe(true);
  });
});

describe("review proof (confirmer is the counter-party — spec 4.3 symmetry)", () => {
  it("RENTER obligation is confirmed by the lessor side", () => {
    expect(canReviewProof(lessor, "RENTER")).toBe(true);
    expect(canReviewProof(comanager, "RENTER")).toBe(true);
    expect(canReviewProof(renter, "RENTER")).toBe(false);
  });

  it("LESSOR obligation is confirmed by the renter", () => {
    expect(canReviewProof(renter, "LESSOR")).toBe(true);
    expect(canReviewProof(lessor, "LESSOR")).toBe(false);
  });

  it("self-agreement holder can confirm either way", () => {
    expect(canReviewProof(self, "RENTER")).toBe(true);
    expect(canReviewProof(self, "LESSOR")).toBe(true);
  });
});

describe("waive & manage (lessor side only)", () => {
  it("only lessor/comanager can waive or manage", () => {
    expect(canWaive(lessor)).toBe(true);
    expect(canWaive(comanager)).toBe(true);
    expect(canWaive(renter)).toBe(false);
    expect(canManageAgreement(lessor)).toBe(true);
    expect(canManageAgreement(renter)).toBe(false);
  });
});

describe("assert helper", () => {
  it("throws ForbiddenError when the predicate is false", () => {
    expect(() => assert(canWaive(renter), "waive occurrence")).toThrow(ForbiddenError);
    expect(() => assert(canWaive(lessor), "waive occurrence")).not.toThrow();
  });
});
