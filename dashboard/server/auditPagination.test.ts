import { describe, expect, it } from "vitest";
import { filterAuditEvents, isAfterAuditCursor, paginateAuditEvents } from "./auditPagination";

describe("audit cursor pagination", () => {
  it("progresses across long histories without skipping or repeating events with identical timestamps", () => {
    const history = Array.from({ length: 23 }, (_, offset) => ({ id: 23 - offset, eventTimestamp: 1_776_480_000_000 }));
    const first = paginateAuditEvents(history, 10);
    const secondRows = history.filter(event => isAfterAuditCursor(event, first.nextCursor!));
    const second = paginateAuditEvents(secondRows, 10);
    const thirdRows = secondRows.filter(event => isAfterAuditCursor(event, second.nextCursor!));
    const third = paginateAuditEvents(thirdRows, 10);
    expect(first.events.map(event => event.id)).toEqual([23, 22, 21, 20, 19, 18, 17, 16, 15, 14]);
    expect(first.nextCursor).toEqual({ eventTimestamp: 1_776_480_000_000, id: 14 });
    expect(second.events.map(event => event.id)).toEqual([13, 12, 11, 10, 9, 8, 7, 6, 5, 4]);
    expect(third.events.map(event => event.id)).toEqual([3, 2, 1]);
    expect(third.nextCursor).toBeUndefined();
    expect([...first.events, ...second.events, ...third.events].map(event => event.id)).toEqual(history.map(event => event.id));
  });

  it("filters an audit page by event type and from-date before preserving stable cursor pagination", () => {
    const history = [
      { id: 6, eventTimestamp: 6000, eventType: "CASE_SAVED_ENCRYPTED" },
      { id: 5, eventTimestamp: 5000, eventType: "CASE_OPENED" },
      { id: 4, eventTimestamp: 4000, eventType: "CASE_SAVED_ENCRYPTED" },
      { id: 3, eventTimestamp: 3000, eventType: "CASE_SAVED_ENCRYPTED" },
      { id: 2, eventTimestamp: 2000, eventType: "CASE_OPENED" },
    ];
    const filtered = filterAuditEvents(history, { eventType: "CASE_SAVED_ENCRYPTED", fromTimestamp: 3000 });
    const first = paginateAuditEvents(filtered, 2);
    const nextRows = filtered.filter(event => isAfterAuditCursor(event, first.nextCursor!));
    expect(first.events.map(event => event.id)).toEqual([6, 4]);
    expect(first.nextCursor).toEqual({ eventTimestamp: 4000, id: 4 });
    expect(nextRows.map(event => event.id)).toEqual([3]);
  });
});
