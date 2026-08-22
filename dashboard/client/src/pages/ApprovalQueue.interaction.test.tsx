/** @vitest-environment jsdom */
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ApprovalQueue from "./ApprovalQueue";

const invalidate = vi.fn();
const mutateAsync = vi.fn();
const exportMocks = vi.hoisted(() => ({ downloadApprovalCsv: vi.fn(), approvalExportRefetch: vi.fn() }));
const queueInputs: Array<Record<string, unknown>> = [];

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 8, role: "admin", name: "Independent Reviewer" } }) }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("wouter", () => ({ Link: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/lib/approvalExport", () => ({ downloadApprovalCsv: exportMocks.downloadApprovalCsv }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ verificationProfiles: { approvalQueue: { invalidate }, approvalSummary: { invalidate }, pendingApprovals: { invalidate }, current: { invalidate }, list: { invalidate } } }),
    verificationProfiles: {
      approvalQueue: { useQuery: (input: Record<string, unknown>) => {
        queueInputs.push(input);
        const secondPage = Boolean(input.cursor);
        const noMatch = input.search === "missing";
        const completed = input.status === "completed";
        const approvals = noMatch ? [] : completed ? [{ id: 24, status: "approved", userId: 52, profileId: 7, profileKeyId: null, approvalType: "profile_activation", makerUserId: 52, makerNote: "Completed policy request", reviewerUserId: 8, reviewerNote: "Approved independently", reviewedAt: "2026-08-12T12:00:00.000Z", createdAt: "2026-08-10T12:00:00.000Z", profileName: "North register", jurisdiction: "United Kingdom", policyVersion: "2026.2", practitionerId: null, practitionerName: null, publicKeyDigest: null }] : secondPage ? [{ id: 13, status: "pending", userId: 52, profileId: 7, profileKeyId: null, approvalType: "signer_key_activation", makerUserId: 52, makerNote: "Second page request", reviewerUserId: null, reviewerNote: null, reviewedAt: null, createdAt: "2026-08-11T12:00:00.000Z", profileName: "Pilot", jurisdiction: "United Kingdom", policyVersion: "2026.2", practitionerId: "P-002", practitionerName: "Ada Practitioner", publicKeyDigest: null }] : [{ id: 1, status: "pending", userId: 52, profileId: 7, profileKeyId: null, approvalType: "profile_activation", makerUserId: 52, makerNote: "First page request", reviewerUserId: null, reviewerNote: null, reviewedAt: null, createdAt: "2026-08-10T12:00:00.000Z", profileName: "Pilot", jurisdiction: "United Kingdom", policyVersion: "2026.2", practitionerId: null, practitionerName: null, publicKeyDigest: null }];
        return { data: { approvals, nextCursor: !completed && !noMatch && !secondPage ? { createdAt: Date.parse("2026-08-10T12:00:00.000Z"), id: 1 } : undefined }, isLoading: false, isError: false, isFetching: false };
      } },
      approvalSummary: { useQuery: () => ({ data: { count: 2 } }) },
      approvalExport: { useQuery: (input: Record<string, unknown>) => ({ isFetching: false, refetch: async () => { exportMocks.approvalExportRefetch(input); return { data: { records: [{ id: 41, status: "approved", approvalType: "profile_activation" }], hasMore: false } }; } }) },
      decideApproval: { useMutation: (options: { onSuccess?: () => Promise<void> }) => ({ isPending: false, mutateAsync: async (input: unknown) => { mutateAsync(input); await options.onSuccess?.(); } }) },
    },
  },
}));

describe("approval queue interactions", () => {
  afterEach(cleanup);
  beforeEach(() => { window.history.replaceState({}, "", "/approval-queue"); queueInputs.length = 0; mutateAsync.mockReset(); exportMocks.downloadApprovalCsv.mockReset(); exportMocks.approvalExportRefetch.mockReset(); });

  it("filters by age priority, moves through later queue pages, and refreshes after an independent rejection", async () => {
    const user = userEvent.setup();
    render(<ApprovalQueue />);
    expect(screen.getByText("First page request")).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Age priority"), "new");
    expect(screen.getByText("No requests match these filters")).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Age priority"), "urgent");
    expect(screen.getByText("First page request")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /show later requests/i }));
    expect(screen.getByText("Viewing page 2; requests are ordered by earliest submission first.")).toBeTruthy();
    expect(screen.getByText("Second page request")).toBeTruthy();
    await user.type(screen.getByLabelText("Reviewer decision note"), "Independent rejection recorded");
    await user.click(screen.getByRole("button", { name: /reject request/i }));
    expect(mutateAsync).toHaveBeenCalledWith({ approvalId: 13, decision: "rejected", reviewerNote: "Independent rejection recorded" });
    expect(invalidate).toHaveBeenCalled();
    await user.selectOptions(screen.getByLabelText("Request type"), "signer_key_activation");
    expect(screen.getByText("Viewing page 1; requests are ordered by earliest submission first.")).toBeTruthy();
    expect(queueInputs.at(-1)).toMatchObject({ limit: 12, approvalType: "signer_key_activation" });
    await user.type(screen.getByLabelText("Reviewer decision note"), "Independent approval recorded");
    await user.click(screen.getByRole("button", { name: /approve and activate/i }));
    expect(mutateAsync).toHaveBeenLastCalledWith({ approvalId: 1, decision: "approved", reviewerNote: "Independent approval recorded" });
    expect(mutateAsync).toHaveBeenCalledTimes(2);
  });

  it("downloads the selected pending/completed scope from the protected approval register", async () => {
    const user = userEvent.setup();
    render(<ApprovalQueue />);
    await user.selectOptions(screen.getByLabelText("Approval export scope"), "completed");
    await user.click(screen.getByRole("button", { name: /export csv/i }));
    expect(exportMocks.approvalExportRefetch).toHaveBeenLastCalledWith({ status: "completed" });
    expect(exportMocks.downloadApprovalCsv).toHaveBeenCalledWith([{ id: 41, status: "approved", approvalType: "profile_activation" }], "completed");
  });

  it("searches request names, filters completed records by status, and clears the filter bar", async () => {
    const user = userEvent.setup();
    render(<ApprovalQueue />);
    await user.type(screen.getByLabelText("Search approval requests"), "north");
    expect(queueInputs.at(-1)).toMatchObject({ limit: 12, status: "pending", search: "north" });
    await user.selectOptions(screen.getByLabelText("Approval request status"), "completed");
    expect(queueInputs.at(-1)).toMatchObject({ limit: 12, status: "completed", search: "north" });
    expect(screen.getByText("North register · 2026.2")).toBeTruthy();
    expect(screen.getByText("Approved", { selector: "span" })).toBeTruthy();
    await user.clear(screen.getByLabelText("Search approval requests"));
    await user.type(screen.getByLabelText("Search approval requests"), "missing");
    expect(screen.getByText("No requests match these filters")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(queueInputs.at(-1)).toMatchObject({ limit: 12, status: "pending" });
    expect(queueInputs.at(-1)).not.toHaveProperty("search");
  });

  it("loads a shared queue view from the URL and keeps filter changes shareable", async () => {
    window.history.replaceState({}, "", "/approval-queue?q=North%20register&status=completed&type=profile_activation&priority=urgent");
    const user = userEvent.setup();
    render(<ApprovalQueue />);
    expect((screen.getByLabelText("Search approval requests") as HTMLInputElement).value).toBe("North register");
    expect((screen.getByLabelText("Approval request status") as HTMLSelectElement).value).toBe("completed");
    expect((screen.getByLabelText("Request type") as HTMLSelectElement).value).toBe("profile_activation");
    expect((screen.getByLabelText("Age priority") as HTMLSelectElement).value).toBe("urgent");
    expect(queueInputs.at(-1)).toMatchObject({ limit: 12, status: "completed", approvalType: "profile_activation", search: "North register" });
    await user.selectOptions(screen.getByLabelText("Age priority"), "review_soon");
    expect(window.location.search).toBe("?q=North+register&status=completed&type=profile_activation&priority=review_soon");
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(window.location.search).toBe("");
    expect((screen.getByLabelText("Approval request status") as HTMLSelectElement).value).toBe("pending");
  });
});
