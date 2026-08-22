import { describe, expect, it } from "vitest";
import { auditStatusPresentation } from "./auditStatus";

describe("archive audit-status presentation", () => {
  it("maps valid chains to the verified badge", () => {
    expect(auditStatusPresentation({ state: "verified", checkedEvents: 2, totalEvents: 2 })).toMatchObject({ label: "AUDIT VERIFIED", tone: "pass" });
  });

  it("maps broken chains to the review badge with the verifier reason", () => {
    expect(auditStatusPresentation({ state: "attention", checkedEvents: 1, totalEvents: 2, reason: "Event hash mismatch at event 2." })).toMatchObject({ label: "AUDIT REVIEW", tone: "alert", title: "Event hash mismatch at event 2." });
  });

  it("maps missing audit history to the pending badge", () => {
    expect(auditStatusPresentation({ state: "unavailable", checkedEvents: 0, totalEvents: 0 })).toMatchObject({ label: "AUDIT PENDING", tone: "pending" });
  });
});
