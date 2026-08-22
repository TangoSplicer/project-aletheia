import React from "react";
import { ChevronRight, Clock3, SlidersHorizontal } from "lucide-react";
import { chronologicalAuditTimeline, type AuditTimelineSource } from "@/lib/auditTimeline";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";

function compactHash(value: string) {
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

/** A metadata-only chronological view of owner-scoped audit events. */
export function AuditTimeline({ events }: { events: AuditTimelineSource[] }) {
  const timeline = chronologicalAuditTimeline(events);
  if (!timeline.length) return <p>Encrypted case saves will create metadata-only audit events here. Team sharing is not enabled in this release.</p>;
  return <ol className="audit-timeline" aria-label="Chronological audit events">{timeline.map(event => <li key={event.id}><span className="timeline-node"><Clock3 className="h-3 w-3" /></span><div><div className="timeline-title"><strong>{event.label}</strong><code>SEQ {String(event.sequenceNumber).padStart(2, "0")}</code></div><time>{event.timestamp.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", year: "numeric" })}</time><span>Case #{event.caseId} · {compactHash(event.payloadDigest)}</span></div></li>)}</ol>;
}

export function AuditTimelineFilters({ eventType, fromDate, onEventTypeChange, onFromDateChange, onClear }: { eventType: string; fromDate: string; onEventTypeChange: (value: string) => void; onFromDateChange: (value: string) => void; onClear: () => void }) {
  const hasFilters = Boolean(eventType || fromDate);
  return <details className="timeline-filters"><summary><SlidersHorizontal className="h-3.5 w-3.5" /> Filter{hasFilters ? " · active" : ""}</summary><div><label>Event type<select value={eventType} onChange={event => onEventTypeChange(event.target.value)} aria-label="Audit event type filter"><option value="">All events</option><option value="CASE_SAVED_ENCRYPTED">Encrypted saves</option></select></label><label>From date<input type="date" value={fromDate} onChange={event => onFromDateChange(event.target.value)} aria-label="Audit from date filter" /></label>{hasFilters ? <Button type="button" variant="ghost" size="sm" className="timeline-filter-clear" onClick={onClear}>Clear</Button> : null}</div></details>;
}

/** Deterministic controls for navigating bounded cursor pages of audit metadata. */
export function AuditTimelinePagination({ page, visibleEvents, hasOlder, hasUnseenNewer, isLoading, onNewest, onOlder }: { page: number; visibleEvents: number; hasOlder: boolean; hasUnseenNewer: boolean; isLoading: boolean; onNewest: () => void; onOlder: () => void }) {
  if (!hasOlder && !hasUnseenNewer) return null;
  return <div className="timeline-pagination"><p aria-live="polite">Page {page} · {visibleEvents} {visibleEvents === 1 ? "event" : "events"}</p><Pagination aria-label="Audit timeline pagination"><PaginationContent>{hasUnseenNewer ? <PaginationItem><Button type="button" variant="outline" size="sm" className="subtle-button" disabled={isLoading} onClick={onNewest}>New events</Button></PaginationItem> : null}{hasOlder ? <PaginationItem><Button type="button" variant="outline" size="sm" className="subtle-button" disabled={isLoading} onClick={onOlder}>Older <ChevronRight className="h-3.5 w-3.5" /></Button></PaginationItem> : null}</PaginationContent></Pagination></div>;
}
