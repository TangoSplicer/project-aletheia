import { describe, expect, it } from "vitest";
import { approvalPriority, formatApprovalAge } from "./approvalQueue";

describe("approval queue priority presentation", () => {
  const now = Date.parse("2026-08-21T12:00:00.000Z");

  it("derives readable request age without accepting user-controlled priority", () => {
    expect(formatApprovalAge("2026-08-21T11:30:00.000Z", now)).toBe("Less than 1 hour");
    expect(formatApprovalAge("2026-08-20T06:00:00.000Z", now)).toBe("1 day");
  });

  it("marks requests for review based solely on independent age thresholds", () => {
    expect(approvalPriority("2026-08-20T12:00:00.000Z", now)).toMatchObject({ priority: "new", label: "New request" });
    expect(approvalPriority("2026-08-18T12:00:00.000Z", now)).toMatchObject({ priority: "review_soon", label: "Review soon" });
    expect(approvalPriority("2026-08-14T12:00:00.000Z", now)).toMatchObject({ priority: "urgent", label: "Urgent review" });
  });
});
