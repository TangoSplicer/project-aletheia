export type ApprovalPriority = "urgent" | "review_soon" | "new";

export type ApprovalPriorityPresentation = {
  priority: ApprovalPriority;
  label: string;
  description: string;
  ageLabel: string;
};

const HOUR_MS = 60 * 60 * 1000;
const REVIEW_SOON_MS = 72 * HOUR_MS;
const URGENT_MS = 7 * 24 * HOUR_MS;

function elapsedMs(createdAt: Date | string, now = Date.now()) {
  const timestamp = new Date(createdAt).getTime();
  return Number.isFinite(timestamp) ? Math.max(0, now - timestamp) : 0;
}

export function formatApprovalAge(createdAt: Date | string, now = Date.now()) {
  const elapsed = elapsedMs(createdAt, now);
  const hours = Math.floor(elapsed / HOUR_MS);
  if (hours < 1) return "Less than 1 hour";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

/** Priority is derived solely from request age, so no user can escalate their own approval request. */
export function approvalPriority(createdAt: Date | string, now = Date.now()): ApprovalPriorityPresentation {
  const elapsed = elapsedMs(createdAt, now);
  const ageLabel = formatApprovalAge(createdAt, now);
  if (elapsed >= URGENT_MS) return { priority: "urgent", label: "Urgent review", description: "Pending for seven days or more", ageLabel };
  if (elapsed >= REVIEW_SOON_MS) return { priority: "review_soon", label: "Review soon", description: "Pending for three days or more", ageLabel };
  return { priority: "new", label: "New request", description: "Pending for less than three days", ageLabel };
}
