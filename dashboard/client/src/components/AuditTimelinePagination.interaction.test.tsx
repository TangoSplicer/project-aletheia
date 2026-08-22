/** @vitest-environment jsdom */
import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AuditTimeline, AuditTimelineFilters, AuditTimelinePagination } from "./AuditTimeline";

const event = (sequenceNumber: number) => ({ id: sequenceNumber, caseId: 4, sequenceNumber, eventType: "CASE_SAVED_ENCRYPTED", payloadDigest: String(sequenceNumber).padStart(64, "0"), eventTimestamp: Date.UTC(2026, 7, 19, 10, sequenceNumber) });
const pages = [[12, 11, 10, 9, 8, 7, 6, 5, 4, 3].map(event), [2, 1].map(event)];

function PagedTimelineFixture() {
  const [page, setPage] = useState(1);
  const events = pages[page - 1];
  return <><AuditTimeline events={events} /><AuditTimelinePagination page={page} visibleEvents={events.length} hasOlder={page < pages.length} hasUnseenNewer={page > 1} isLoading={false} onNewest={() => setPage(1)} onOlder={() => setPage(current => current + 1)} /></>;
}

describe("AuditTimelinePagination interaction", () => {
  it("moves between bounded history pages and changes the rendered event set", async () => {
    const user = userEvent.setup();
    render(<PagedTimelineFixture />);
    expect(screen.getByText("Page 1 · 10 events")).toBeTruthy();
    expect(screen.getByText("SEQ 12")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /older/i }));
    expect(screen.getByText("Page 2 · 2 events")).toBeTruthy();
    expect(screen.getByText("SEQ 01")).toBeTruthy();
    expect(screen.queryByText("SEQ 12")).toBeNull();
    expect(screen.getByRole("button", { name: "New events" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /new events/i }));
    expect(screen.getByText("Page 1 · 10 events")).toBeTruthy();
    expect(screen.getByText("SEQ 12")).toBeTruthy();
  });

  it("keeps filters out of the timeline until opened and supports clearing the active selection", async () => {
    const user = userEvent.setup();
    function FilterFixture() {
      const [eventType, setEventType] = useState("");
      const [fromDate, setFromDate] = useState("");
      return <><AuditTimelineFilters eventType={eventType} fromDate={fromDate} onEventTypeChange={setEventType} onFromDateChange={setFromDate} onClear={() => { setEventType(""); setFromDate(""); }} /><output>{eventType || "all"}|{fromDate || "any"}</output></>;
    }
    render(<FilterFixture />);
    await user.click(screen.getByText("Filter"));
    await user.selectOptions(screen.getByLabelText("Audit event type filter"), "CASE_SAVED_ENCRYPTED");
    expect(screen.getByText("CASE_SAVED_ENCRYPTED|any")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByText("all|any")).toBeTruthy();
  });
});
