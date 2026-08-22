export type ApprovalQueueCursor = { createdAt: number; id: number };

type PendingApprovalRow = {
  id: number;
  createdAt: Date | string;
  makerUserId: number;
  approvalType: "profile_activation" | "signer_key_activation";
};

type PendingApprovalPageInput = {
  limit: number;
  reviewerUserId: number;
  cursor?: ApprovalQueueCursor;
  approvalType?: "profile_activation" | "signer_key_activation";
};

function createdAtMillis(row: Pick<PendingApprovalRow, "createdAt">) {
  return new Date(row.createdAt).getTime();
}

/** Mirrors the approval queue's database ordering: oldest requests first, then ID. */
export function isAfterApprovalQueueCursor(row: Pick<PendingApprovalRow, "id" | "createdAt">, cursor: ApprovalQueueCursor) {
  const timestamp = createdAtMillis(row);
  return timestamp > cursor.createdAt || (timestamp === cursor.createdAt && row.id > cursor.id);
}

/** Pure queue contract used for regression coverage of independent review, filtering, and stable pagination semantics. */
export function paginateActionableApprovalRows<T extends PendingApprovalRow>(rows: T[], input: PendingApprovalPageInput) {
  const ordered = rows
    .filter(row => row.makerUserId !== input.reviewerUserId)
    .filter(row => !input.approvalType || row.approvalType === input.approvalType)
    .filter(row => !input.cursor || isAfterApprovalQueueCursor(row, input.cursor))
    .sort((left, right) => createdAtMillis(left) - createdAtMillis(right) || left.id - right.id);
  const approvals = ordered.slice(0, input.limit);
  const last = approvals.at(-1);
  return { approvals, nextCursor: ordered.length > input.limit && last ? { createdAt: createdAtMillis(last), id: last.id } : undefined };
}
