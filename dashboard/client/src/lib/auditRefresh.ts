/** Reports whether a background newest-page refresh contains an event unseen from the active first page. */
export function hasUnseenNewestAuditEvent(page: number, viewedNewestEventId: number | null, refreshedNewestEventId: number | undefined) {
  return page > 1 && refreshedNewestEventId !== undefined && refreshedNewestEventId !== viewedNewestEventId;
}
