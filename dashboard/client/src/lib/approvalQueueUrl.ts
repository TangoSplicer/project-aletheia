import type { ApprovalPriority } from "@/lib/approvalQueue";

export type QueueTypeFilter = "all" | "profile_activation" | "signer_key_activation";
export type QueueStatusFilter = "all" | "pending" | "completed" | "approved" | "rejected" | "cancelled";
export type PriorityFilter = "all" | ApprovalPriority;

export type ApprovalQueueUrlState = {
  search: string;
  status: QueueStatusFilter;
  type: QueueTypeFilter;
  priority: PriorityFilter;
};

export const DEFAULT_APPROVAL_QUEUE_URL_STATE: ApprovalQueueUrlState = {
  search: "",
  status: "pending",
  type: "all",
  priority: "all",
};

const statuses = new Set<QueueStatusFilter>(["all", "pending", "completed", "approved", "rejected", "cancelled"]);
const types = new Set<QueueTypeFilter>(["all", "profile_activation", "signer_key_activation"]);
const priorities = new Set<PriorityFilter>(["all", "urgent", "review_soon", "new"]);

export function parseApprovalQueueUrlState(params: URLSearchParams): ApprovalQueueUrlState {
  const search = (params.get("q") ?? "").trim().slice(0, 120);
  const status = params.get("status");
  const type = params.get("type");
  const priority = params.get("priority");
  return {
    search,
    status: status && statuses.has(status as QueueStatusFilter) ? status as QueueStatusFilter : DEFAULT_APPROVAL_QUEUE_URL_STATE.status,
    type: type && types.has(type as QueueTypeFilter) ? type as QueueTypeFilter : DEFAULT_APPROVAL_QUEUE_URL_STATE.type,
    priority: priority && priorities.has(priority as PriorityFilter) ? priority as PriorityFilter : DEFAULT_APPROVAL_QUEUE_URL_STATE.priority,
  };
}

export function approvalQueueUrlSearch(state: ApprovalQueueUrlState): string {
  const params = new URLSearchParams();
  if (state.search) params.set("q", state.search);
  if (state.status !== DEFAULT_APPROVAL_QUEUE_URL_STATE.status) params.set("status", state.status);
  if (state.type !== DEFAULT_APPROVAL_QUEUE_URL_STATE.type) params.set("type", state.type);
  if (state.priority !== DEFAULT_APPROVAL_QUEUE_URL_STATE.priority) params.set("priority", state.priority);
  return params.toString();
}

export function currentApprovalQueueUrlState(): ApprovalQueueUrlState {
  if (typeof window === "undefined") return DEFAULT_APPROVAL_QUEUE_URL_STATE;
  return parseApprovalQueueUrlState(new URLSearchParams(window.location.search));
}
