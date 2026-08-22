import { describe, expect, it } from "vitest";
import { paginateActionableApprovalRows } from "./approvalQueuePagination";

const request = (id: number, hoursAfterStart: number, makerUserId = 52, approvalType: "profile_activation" | "signer_key_activation" = "profile_activation") => ({ id, makerUserId, approvalType, createdAt: new Date(Date.UTC(2026, 7, 1, hoursAfterStart)) });

describe("actionable approval queue pagination", () => {
  it("walks forward through an oldest-first large queue without repeating a cursor row", () => {
    const rows = Array.from({ length: 30 }, (_, index) => request(index + 1, index));
    const first = paginateActionableApprovalRows(rows, { reviewerUserId: 8, limit: 12 });
    const second = paginateActionableApprovalRows(rows, { reviewerUserId: 8, limit: 12, cursor: first.nextCursor });
    const third = paginateActionableApprovalRows(rows, { reviewerUserId: 8, limit: 12, cursor: second.nextCursor });
    expect(first.approvals.map(row => row.id)).toEqual(Array.from({ length: 12 }, (_, index) => index + 1));
    expect(second.approvals.map(row => row.id)).toEqual(Array.from({ length: 12 }, (_, index) => index + 13));
    expect(third.approvals.map(row => row.id)).toEqual([25, 26, 27, 28, 29, 30]);
    expect(third.nextCursor).toBeUndefined();
  });

  it("excludes the reviewer’s own submissions and applies request-type filtering before cursor pagination", () => {
    const rows = [request(1, 0, 8), request(2, 1, 52, "profile_activation"), request(3, 2, 52, "signer_key_activation"), request(4, 3, 52, "profile_activation")];
    const page = paginateActionableApprovalRows(rows, { reviewerUserId: 8, limit: 12, approvalType: "profile_activation" });
    expect(page.approvals.map(row => row.id)).toEqual([2, 4]);
  });
});
