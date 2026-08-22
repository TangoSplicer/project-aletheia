import { approvalQueueUrlSearch, DEFAULT_APPROVAL_QUEUE_URL_STATE, parseApprovalQueueUrlState } from "@/lib/approvalQueueUrl";
import { describe, expect, it } from "vitest";

describe("approval queue URL state", () => {
  it("parses only supported shareable filters and limits a search term", () => {
    const state = parseApprovalQueueUrlState(new URLSearchParams("q=%20North%20Registry%20&status=completed&type=profile_activation&priority=urgent"));
    expect(state).toEqual({ search: "North Registry", status: "completed", type: "profile_activation", priority: "urgent" });
  });

  it("falls back safely for invalid parameters and serializes only non-default filters", () => {
    expect(parseApprovalQueueUrlState(new URLSearchParams("q=abc&status=unsafe&type=unknown&priority=late"))).toEqual({ ...DEFAULT_APPROVAL_QUEUE_URL_STATE, search: "abc" });
    expect(approvalQueueUrlSearch(DEFAULT_APPROVAL_QUEUE_URL_STATE)).toBe("");
    expect(approvalQueueUrlSearch({ search: "North Registry", status: "completed", type: "all", priority: "all" })).toBe("q=North+Registry&status=completed");
  });
});
