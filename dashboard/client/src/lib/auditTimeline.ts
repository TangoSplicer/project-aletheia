/** Chronological display model for owner-scoped audit metadata; no vault content is exposed. */
export type AuditTimelineSource = { id: number; caseId: number; sequenceNumber: number; eventType: string; payloadDigest: string; eventTimestamp: number };

const eventLabels: Record<string, string> = {
  CASE_SAVED_ENCRYPTED: "Encrypted case vault saved",
};

export function chronologicalAuditTimeline(events: AuditTimelineSource[]) {
  return [...events]
    .sort((left, right) => left.eventTimestamp - right.eventTimestamp || left.sequenceNumber - right.sequenceNumber)
    .map(event => ({ ...event, label: eventLabels[event.eventType] ?? event.eventType.replaceAll("_", " ").toLowerCase(), timestamp: new Date(event.eventTimestamp) }));
}
