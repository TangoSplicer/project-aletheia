export type AuditEventCursor = { eventTimestamp: number; id: number };
export type CursorSortableAuditEvent = AuditEventCursor;
export type FilterableAuditEvent = CursorSortableAuditEvent & { eventType: string };
export type AuditEventFilters = { eventType?: string; fromTimestamp?: number };

/** Tests whether an event belongs strictly after a descending timestamp-and-ID cursor. */
export function isAfterAuditCursor(event: CursorSortableAuditEvent, cursor: AuditEventCursor) {
  return event.eventTimestamp < cursor.eventTimestamp || (event.eventTimestamp === cursor.eventTimestamp && event.id < cursor.id);
}

/** Defensive in-memory filter applied after the indexed database predicate, keeping result semantics explicit and testable. */
export function filterAuditEvents<T extends FilterableAuditEvent>(events: T[], filters: AuditEventFilters) {
  return events.filter(event => (!filters.eventType || event.eventType === filters.eventType) && (filters.fromTimestamp === undefined || event.eventTimestamp >= filters.fromTimestamp));
}

/** Converts an already-descending bounded query result into a page and stable continuation cursor. */
export function paginateAuditEvents<T extends CursorSortableAuditEvent>(newestFirstRows: T[], limit: number) {
  const events = newestFirstRows.slice(0, limit);
  const finalEvent = events.at(-1);
  return { events, nextCursor: newestFirstRows.length > limit && finalEvent ? { eventTimestamp: finalEvent.eventTimestamp, id: finalEvent.id } : undefined };
}
