import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { downloadApprovalCsv, type ApprovalExportScope } from "@/lib/approvalExport";
import { approvalPriority, type ApprovalPriority } from "@/lib/approvalQueue";
import { approvalQueueUrlSearch, currentApprovalQueueUrlState, DEFAULT_APPROVAL_QUEUE_URL_STATE, type ApprovalQueueUrlState, type PriorityFilter, type QueueStatusFilter, type QueueTypeFilter } from "@/lib/approvalQueueUrl";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Check, ClipboardCheck, Clock3, Download, Search, ShieldAlert, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const APPROVAL_QUEUE_PAGE_SIZE = 12;
type ApprovalCursor = { createdAt: number; id: number };

function requestTypeLabel(type: "profile_activation" | "signer_key_activation") {
  return type === "profile_activation" ? "Profile activation" : "Signer-key activation";
}

function requestStatusLabel(status: Exclude<QueueStatusFilter, "all" | "completed">) {
  return status === "pending" ? "Pending review" : status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Cancelled";
}

function StatusBadge({ status }: { status: Exclude<QueueStatusFilter, "all" | "completed"> }) {
  const classes = status === "approved" ? "border-[#8db8ae] bg-[#edf6f2] text-[#235f58]" : status === "pending" ? "border-[#b9a98b] bg-[#fff9e9] text-[#6e4a19]" : "border-[#d6b0a4] bg-[#fff0e9] text-[#8b3d31]";
  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${classes}`}>{requestStatusLabel(status)}</span>;
}

function PriorityBadge({ createdAt }: { createdAt: Date | string }) {
  const presentation = approvalPriority(createdAt);
  const classes = presentation.priority === "urgent" ? "border-[#b95d37] bg-[#fff0e9] text-[#8b3d31]" : presentation.priority === "review_soon" ? "border-[#b9a98b] bg-[#fff9e9] text-[#6e4a19]" : "border-[#b4c9c4] bg-[#edf6f2] text-[#235f58]";
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${classes}`} title={presentation.description}><Clock3 className="h-3.5 w-3.5" />{presentation.label} · {presentation.ageLabel}</span>;
}

export default function ApprovalQueue() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [page, setPage] = useState(1);
  const [cursors, setCursors] = useState<Array<ApprovalCursor | undefined>>([undefined]);
  const [filters, setFilters] = useState<ApprovalQueueUrlState>(currentApprovalQueueUrlState);
  const [exportScope, setExportScope] = useState<ApprovalExportScope>("all");
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const { search: searchTerm, status: statusFilter, type: typeFilter, priority: priorityFilter } = filters;
  const cursor = cursors[page - 1];
  const search = searchTerm.trim();
  const input = useMemo(() => ({ limit: APPROVAL_QUEUE_PAGE_SIZE, status: statusFilter, ...(cursor ? { cursor } : {}), ...(typeFilter === "all" ? {} : { approvalType: typeFilter }), ...(search ? { search } : {}) }), [cursor, search, statusFilter, typeFilter]);
  const exportInput = useMemo(() => ({ status: exportScope }), [exportScope]);
  const queue = trpc.verificationProfiles.approvalQueue.useQuery(input, { enabled: user?.role === "admin" });
  const summary = trpc.verificationProfiles.approvalSummary.useQuery(undefined, { enabled: user?.role === "admin" });
  const approvalExport = trpc.verificationProfiles.approvalExport.useQuery(exportInput, { enabled: false, retry: false });
  const decideApproval = trpc.verificationProfiles.decideApproval.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.verificationProfiles.approvalQueue.invalidate(), utils.verificationProfiles.approvalSummary.invalidate(), utils.verificationProfiles.pendingApprovals.invalidate(), utils.verificationProfiles.current.invalidate(), utils.verificationProfiles.list.invalidate()]);
    },
  });
  const visibleApprovals = useMemo(() => (queue.data?.approvals ?? []).filter(request => priorityFilter === "all" || approvalPriority(request.createdAt).priority === priorityFilter), [priorityFilter, queue.data?.approvals]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromBrowser = () => setFilters(currentApprovalQueueUrlState());
    window.addEventListener("popstate", syncFromBrowser);
    return () => window.removeEventListener("popstate", syncFromBrowser);
  }, []);

  const resetToFirstPage = () => {
    setCursors([undefined]);
    setPage(1);
  };
  const changeTypeFilter = (value: QueueTypeFilter) => {
    updateFilters({ type: value });
  };
  const changeStatusFilter = (value: QueueStatusFilter) => {
    updateFilters({ status: value });
  };
  const changeSearch = (value: string) => {
    updateFilters({ search: value });
  };
  const changePriorityFilter = (value: PriorityFilter) => updateFilters({ priority: value });
  const updateFilters = (next: Partial<ApprovalQueueUrlState>) => {
    const normalized: ApprovalQueueUrlState = { ...filters, ...next, search: (next.search ?? filters.search).trim().slice(0, 120) };
    if (typeof window !== "undefined") {
      const query = approvalQueueUrlSearch(normalized);
      const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
      window.history.replaceState(window.history.state, "", url);
    }
    setFilters(normalized);
    resetToFirstPage();
  };
  const clearFilters = () => {
    updateFilters(DEFAULT_APPROVAL_QUEUE_URL_STATE);
  };
  const decide = async (approvalId: number, decision: "approved" | "rejected") => {
    const reviewerNote = reviewNotes[approvalId]?.trim();
    if (!reviewerNote || reviewerNote.length < 3) return toast.error("A reviewer decision note of at least three characters is required.");
    try {
      await decideApproval.mutateAsync({ approvalId, decision, reviewerNote });
      setReviewNotes(current => ({ ...current, [approvalId]: "" }));
      toast.success(decision === "approved" ? "Change approved and activated." : "Change rejected; it remains inactive.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The approval decision could not be recorded.");
    }
  };
  const showLaterRequests = () => {
    const nextCursor = queue.data?.nextCursor;
    if (!nextCursor) return;
    setCursors(current => [...current.slice(0, page), nextCursor]);
    setPage(current => current + 1);
  };
  const exportRegister = async () => {
    try {
      const result = await approvalExport.refetch();
      if (!result.data) throw new Error("The approval register could not be prepared.");
      downloadApprovalCsv(result.data.records, exportScope);
      toast.success(`Exported ${result.data.records.length} ${exportScope === "all" ? "approval" : exportScope} record${result.data.records.length === 1 ? "" : "s"} as CSV.`);
      if (result.data.hasMore) toast.warning("The CSV contains the first 5,000 records. Narrow the scope or archive older records before another export.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The approval register could not be exported.");
    }
  };

  return <DashboardLayout><div className="fieldbook-shell min-h-screen text-[#283331]"><main className="main-desk"><header className="topline"><div className="crumbs"><span>Governance controls</span><ArrowLeft className="h-3.5 w-3.5" /><strong>Approval queue</strong></div><Link href="/"><Button variant="outline" className="subtle-button">Return to verification</Button></Link></header>{user?.role !== "admin" ? <section className="workspace-heading"><div><div className="section-kicker"><ShieldAlert className="h-4 w-4" /> RESTRICTED / GOVERNANCE</div><h1>Administrator review<br /><em>is required.</em></h1><p>This queue is available only to administrators. It deliberately excludes requests a reviewer created, so maker–checker separation remains intact.</p></div></section> : <><section className="workspace-heading archive-heading"><div><div className="section-kicker"><ClipboardCheck className="h-4 w-4" /> GOVERNANCE / INDEPENDENT REVIEW</div><h1>Approval queue.<br /><em>Review with separation.</em></h1><p>Find pending and completed governance records by name, profile, signer, or lifecycle status. The current filters are represented in the URL for a shareable view; access and maker–checker controls are still enforced for each viewer.</p></div></section><section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]"><Card className="verification-card"><div className="card-topline"><div><p className="card-label">GOVERNANCE REQUESTS</p><h2>Approval queue</h2></div><span className="verification-stamp stamp-pending" aria-live="polite">{summary.data?.count ?? 0} ACTIONABLE</span></div><div className="mt-5 grid gap-3 rounded-xl border border-[#d6d5c8] bg-[#efeee4] p-3 sm:grid-cols-2 xl:grid-cols-3"><label className="grid gap-1 text-sm font-medium sm:col-span-2 xl:col-span-1">Search requests<span className="relative"><Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-[#596561]" /><input aria-label="Search approval requests" value={searchTerm} onChange={event => changeSearch(event.target.value)} placeholder="Profile, practitioner, or policy" className="h-9 w-full rounded-md border border-[#c9c8bc] bg-[#fffdf4] py-2 pl-8 pr-2 text-sm" /></span></label><label className="grid gap-1 text-sm font-medium">Lifecycle status<select aria-label="Approval request status" value={statusFilter} onChange={event => changeStatusFilter(event.target.value as QueueStatusFilter)} className="h-9 rounded-md border border-[#c9c8bc] bg-[#fffdf4] px-2 text-sm"><option value="pending">Pending actionable</option><option value="all">All visible statuses</option><option value="completed">Completed</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option></select></label><label className="grid gap-1 text-sm font-medium">Request type<select value={typeFilter} onChange={event => changeTypeFilter(event.target.value as QueueTypeFilter)} className="h-9 rounded-md border border-[#c9c8bc] bg-[#fffdf4] px-2 text-sm"><option value="all">All request types</option><option value="profile_activation">Profile activation</option><option value="signer_key_activation">Signer-key activation</option></select></label><label className="grid gap-1 text-sm font-medium">Age priority<select value={priorityFilter} onChange={event => changePriorityFilter(event.target.value as PriorityFilter)} className="h-9 rounded-md border border-[#c9c8bc] bg-[#fffdf4] px-2 text-sm"><option value="all">All priorities on this page</option><option value="urgent">Urgent review (7+ days)</option><option value="review_soon">Review soon (3+ days)</option><option value="new">New request (under 3 days)</option></select></label><label className="grid gap-1 text-sm font-medium">Export records<select aria-label="Approval export scope" value={exportScope} onChange={event => setExportScope(event.target.value as ApprovalExportScope)} className="h-9 rounded-md border border-[#c9c8bc] bg-[#fffdf4] px-2 text-sm"><option value="all">Pending and completed</option><option value="pending">Pending only</option><option value="completed">Completed only</option></select></label><div className="flex flex-wrap items-end gap-2"><Button variant="outline" className="subtle-button" disabled={approvalExport.isFetching} onClick={() => void exportRegister()}><Download className="h-4 w-4" />{approvalExport.isFetching ? "Preparing CSV" : "Export CSV"}</Button><Button variant="outline" className="subtle-button" onClick={clearFilters}>Clear filters</Button></div></div>{queue.isLoading ? <p className="empty-copy">Loading governance requests…</p> : queue.isError ? <p className="empty-copy text-[#8b3d31]">The approval queue could not be loaded.</p> : visibleApprovals.length ? <div className="mt-5 space-y-3">{visibleApprovals.map(request => { const isPending = request.status === "pending"; return <article key={request.id} className="rounded-xl border border-[#d6d5c8] bg-white/60 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="card-label">{requestTypeLabel(request.approvalType)}</p><h3 className="font-serif text-xl">{request.approvalType === "profile_activation" ? `${request.profileName} · ${request.policyVersion}` : `${request.practitionerName || request.practitionerId} · signer key`}</h3><p className="mt-1 text-sm text-[#596561]">Owner #{request.userId} · Maker #{request.makerUserId} · submitted {new Date(request.createdAt).toLocaleString()}</p></div><div className="flex flex-wrap gap-2"><StatusBadge status={request.status} />{isPending ? <PriorityBadge createdAt={request.createdAt} /> : null}</div></div><p className="mt-3 rounded-lg bg-[#efeee4] p-3 text-sm text-[#596561]"><strong className="text-[#283331]">Maker rationale: </strong>{request.makerNote || "No rationale supplied."}</p>{isPending ? <div className="mt-3 flex flex-col gap-2"><label className="grid gap-1 text-sm font-medium" htmlFor={`review-note-${request.id}`}>Reviewer decision note<textarea id={`review-note-${request.id}`} value={reviewNotes[request.id] ?? ""} onChange={event => setReviewNotes(current => ({ ...current, [request.id]: event.target.value }))} placeholder="Record the independent basis for this decision" className="min-h-20 rounded-md border border-[#c9c8bc] bg-[#fffdf4] p-2 text-sm" /></label><div className="flex flex-wrap gap-2"><Button className="fieldbook-button" disabled={decideApproval.isPending} onClick={() => void decide(request.id, "approved")}><Check className="h-4 w-4" />Approve and activate</Button><Button variant="outline" className="subtle-button text-[#8b3d31]" disabled={decideApproval.isPending} onClick={() => void decide(request.id, "rejected")}><X className="h-4 w-4" />Reject request</Button></div></div> : <p className="mt-3 text-sm text-[#596561]">{request.reviewedAt ? `Completed ${new Date(request.reviewedAt).toLocaleString()}` : "Completed request"}{request.reviewerUserId ? ` by reviewer #${request.reviewerUserId}` : ""}{request.reviewerNote ? ` · ${request.reviewerNote}` : ""}</p>}</article>; })}</div> : <div className="empty-vault"><ClipboardCheck className="h-6 w-6" /><h3>{search || statusFilter !== "pending" || priorityFilter !== "all" || typeFilter !== "all" ? "No requests match these filters" : "No independently actionable requests"}</h3><p>{search ? "Try a profile, practitioner, or policy term, or clear the search." : "Requests created by the signed-in reviewer are excluded from pending review and cannot be approved here."}</p></div>}<div className="mt-5 flex items-center justify-between gap-3 border-t border-[#d6d5c8] pt-4"><span className="text-sm text-[#596561]">Viewing page {page}; requests are ordered by earliest submission first.</span><Button variant="outline" className="subtle-button" disabled={!queue.data?.nextCursor || queue.isFetching} onClick={showLaterRequests}>{queue.isFetching ? "Loading" : "Show later requests"}</Button></div></Card><Card className="scope-card audit-card"><div className="scope-icon"><Clock3 className="h-4 w-4" /></div><div><p className="card-label">PRIORITY POLICY</p><h3>Age makes attention visible.</h3><p><strong>Urgent review</strong> begins after seven days. <strong>Review soon</strong> begins after three days. These labels do not grant authority, alter a request, or bypass independent approval.</p></div></Card></section></>}</main></div></DashboardLayout>;
}
