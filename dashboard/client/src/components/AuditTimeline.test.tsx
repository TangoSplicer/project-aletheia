import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuditTimeline, AuditTimelinePagination } from "./AuditTimeline";

describe("AuditTimeline presentation", () => {
  it("renders timeline events in chronological order with sequence, time, case, and digest metadata", () => {
    const rendered = renderToStaticMarkup(<AuditTimeline events={[
      { id: 2, caseId: 7, sequenceNumber: 2, eventType: "CASE_SAVED_ENCRYPTED", payloadDigest: "b".repeat(64), eventTimestamp: Date.UTC(2026, 7, 19, 14, 19) },
      { id: 1, caseId: 7, sequenceNumber: 1, eventType: "CASE_SAVED_ENCRYPTED", payloadDigest: "a".repeat(64), eventTimestamp: Date.UTC(2026, 7, 19, 10, 54) },
    ]} />);
    expect(rendered).toContain('aria-label="Chronological audit events"');
    expect(rendered).toContain("Encrypted case vault saved");
    expect(rendered).toContain("SEQ 01");
    expect(rendered).toContain("SEQ 02");
    expect(rendered).toContain("Case #7");
    expect(rendered).toContain(`${"a".repeat(10)}…${"a".repeat(8)}`);
    expect(rendered.indexOf("SEQ 01")).toBeLessThan(rendered.indexOf("SEQ 02"));
  });

  it("renders accessible deterministic controls when more history is available", () => {
    const rendered = renderToStaticMarkup(<AuditTimelinePagination page={2} visibleEvents={10} hasOlder hasUnseenNewer isLoading={false} onNewest={() => undefined} onOlder={() => undefined} />);
    expect(rendered).toContain('aria-label="Audit timeline pagination"');
    expect(rendered).toContain("Page 2 · 10 events");
    expect(rendered).toContain("New events");
    expect(rendered).toContain("Older");
    expect(rendered).not.toMatch(/<button[^>]*\sdisabled(?:=| |>)/);
  });

  it("hides navigation for a complete short history", () => {
    const rendered = renderToStaticMarkup(<AuditTimelinePagination page={1} visibleEvents={2} hasOlder={false} hasUnseenNewer={false} isLoading={false} onNewest={() => undefined} onOlder={() => undefined} />);
    expect(rendered).toBe("");
  });

  it("withholds the new-events CTA for older pages until a background refresh detects unseen history", () => {
    const rendered = renderToStaticMarkup(<AuditTimelinePagination page={2} visibleEvents={10} hasOlder hasUnseenNewer={false} isLoading={false} onNewest={() => undefined} onOlder={() => undefined} />);
    expect(rendered).toContain("Older");
    expect(rendered).not.toContain("New events");
  });
});
