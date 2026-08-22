import { describe, expect, it } from "vitest";
import { hasUnseenNewestAuditEvent } from "./auditRefresh";

describe("background audit refresh", () => {
  it("announces new history only when an older page observes a newer event than the viewed first page", () => {
    expect(hasUnseenNewestAuditEvent(2, 21, 22)).toBe(true);
    expect(hasUnseenNewestAuditEvent(1, 21, 22)).toBe(false);
    expect(hasUnseenNewestAuditEvent(2, 21, 21)).toBe(false);
    expect(hasUnseenNewestAuditEvent(2, 21, undefined)).toBe(false);
  });
});
