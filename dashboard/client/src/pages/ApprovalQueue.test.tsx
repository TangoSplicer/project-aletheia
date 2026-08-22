import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ApprovalQueue from "./ApprovalQueue";

let approvalCount = 1;
let queueApprovals: Record<string, unknown>[] = [];
const invalidate = vi.fn();

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 8, role: "admin", name: "Independent Reviewer" } }) }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("wouter", () => ({ Link: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ verificationProfiles: { approvalQueue: { invalidate }, approvalSummary: { invalidate }, pendingApprovals: { invalidate }, current: { invalidate }, list: { invalidate } } }),
    verificationProfiles: {
      approvalQueue: { useQuery: () => ({ data: { approvals: queueApprovals, nextCursor: undefined }, isLoading: false, isError: false, isFetching: false }) },
      approvalSummary: { useQuery: () => ({ data: { count: approvalCount } }) },
      approvalExport: { useQuery: () => ({ isFetching: false, refetch: async () => ({ data: { records: [], hasMore: false } }) }) },
      decideApproval: { useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }) },
    },
  },
}));

describe("approval queue page", () => {
  beforeEach(() => {
    approvalCount = 1;
    queueApprovals = [{ id: 31, status: "pending", userId: 52, profileId: 7, profileKeyId: null, approvalType: "profile_activation", makerUserId: 52, makerNote: "Policy amendment required", reviewerUserId: null, reviewerNote: null, reviewedAt: null, createdAt: "2026-08-10T12:00:00.000Z", profileName: "Pilot register", jurisdiction: "United Kingdom", policyVersion: "2026.2", practitionerId: null, practitionerName: null, publicKeyDigest: null }];
  });

  it("renders actionable approvals with age-derived urgency and required reviewer rationale", () => {
    const html = renderToStaticMarkup(<ApprovalQueue />);
    expect(html).toContain("GOVERNANCE REQUESTS");
    expect(html).toContain("1 ACTIONABLE");
    expect(html).toContain("Urgent review");
    expect(html).toContain("Policy amendment required");
    expect(html).toContain("Reviewer decision note");
    expect(html).toContain("Search requests");
    expect(html).toContain("Lifecycle status");
    expect(html).toContain("Export records");
    expect(html).toContain("Export CSV");
  });

  it("explains the safe empty state when no independently actionable requests remain", () => {
    approvalCount = 0;
    queueApprovals = [];
    const html = renderToStaticMarkup(<ApprovalQueue />);
    expect(html).toContain("No independently actionable requests");
    expect(html).toContain("cannot be approved here");
  });
});
