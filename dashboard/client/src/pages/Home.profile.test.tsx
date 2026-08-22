import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./Home";

let activeProfile: Record<string, unknown> | undefined;
let testUser: { id: number; role: "user" | "admin" } = { id: 52, role: "user" };
let actionableApprovalCount = 0;
const invalidate = vi.fn();

vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("wouter", () => ({ Link: ({ children }: { children: React.ReactNode }) => <>{children}</>, useLocation: () => ["/", vi.fn()] }));
vi.mock("@/components/ui/dialog", () => ({
  useDialogComposition: () => ({ isComposing: () => false, setComposing: () => {}, justEndedComposing: () => false, markCompositionEnd: () => {} }),
  Dialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/ui/tooltip", () => ({ Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>, TooltipContent: ({ children }: { children: React.ReactNode }) => <>{children}</>, TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() } }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ verificationProfiles: { current: { invalidate }, list: { invalidate }, approvalRequests: { invalidate }, approvalSummary: { invalidate } } }),
    sealCases: { save: { useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }) } },
    verificationProfiles: {
      current: { useQuery: () => ({ data: activeProfile, isLoading: false }) },
      history: { useQuery: () => ({ data: [], isLoading: false }) },
      approvalRequests: { useQuery: () => ({ data: [], isLoading: false }) },
      approvalSummary: { useQuery: () => ({ data: { count: actionableApprovalCount }, isLoading: false }) },
      create: { useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }) },
      addKey: { useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }) },
      revokeKey: { useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }) },
      markReviewed: { useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }) },
      retire: { useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }) },
      decideApproval: { useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }) },
    },
    auth: { me: { useQuery: () => ({ data: testUser, isLoading: false }) } },
  },
}));

describe("verification workbench profile dialog", () => {
  beforeEach(() => { activeProfile = undefined; testUser = { id: 52, role: "user" }; actionableApprovalCount = 0; });

  it("renders the settings entry point and separates unconfigured authority from signature verification", () => {
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain("Manage verification profile");
    expect(html).toContain("No active verification profile is configured");
    expect(html).toContain("Key possession is not authority");
    expect(html).toContain("Establish a policy boundary");
  });

  it("renders the active policy key register and review/retirement controls in the workbench dialog", () => {
    activeProfile = { id: 3, name: "Pilot register", jurisdiction: "United Kingdom", policyVersion: "2026.1", status: "active", reviewedAt: 1_700_000_000_000, keys: [{ id: 6, practitionerId: "P-001", practitionerName: "Ada Practitioner", publicKeyDigest: "a".repeat(64), validFrom: null, validUntil: null, status: "active", revocationReason: null }] };
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain("Pilot register");
    expect(html).toContain("Ada Practitioner");
    expect(html).toContain("Register signer key");
    expect(html).toContain("Record review");
    expect(html).toContain("Retire profile");
    expect(html).not.toContain("No active verification profile is configured");
  });

  it("keeps the attention badge hidden when an administrator has no pending approvals", () => {
    testUser = { id: 52, role: "admin" };
    const html = renderToStaticMarkup(<Home />);
    expect(html).not.toContain("Review approvals");
  });

  it("renders a separate administrator approval queue and blocks the maker’s own decision", () => {
    testUser = { id: 52, role: "admin" };
    actionableApprovalCount = 1;
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain("ADMIN APPROVAL QUEUE");
    expect(html).toContain("1 independently actionable request await review.");
    expect(html).toContain("Open approval queue");
  });

  it("shows an attention badge only for approvals an administrator may independently decide", () => {
    testUser = { id: 52, role: "admin" };
    actionableApprovalCount = 1;
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain("Review approvals");
    expect(html).toContain("Open 1 pending approval awaiting your review");
  });
});
