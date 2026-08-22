/**
 * Owner-scoped case archive with server-verified audit-chain summaries. Plaintext
 * manifests and ledgers remain inside the client-side vault restoration workflow.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, ArrowDownToLine, ArrowLeft, CircleAlert, Clock3, FileLock2, Hash, History, KeyRound, RotateCcw, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { AuditTimeline, AuditTimelineFilters, AuditTimelinePagination } from "@/components/AuditTimeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { auditStatusPresentation, type AuditStatus } from "@/lib/auditStatus";
import { auditVerificationFilename, buildAuditVerificationRecord, downloadAuditVerificationRecord } from "@/lib/auditExport";
import { hasUnseenNewestAuditEvent } from "@/lib/auditRefresh";
import { queueRestoredVault, restoreVaultArtifact } from "@/lib/vault";
import { toast } from "sonner";

function compactHash(value: string) {
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

const AUDIT_TIMELINE_PAGE_SIZE = 10;
type AuditCursor = { eventTimestamp: number; id: number };

function AuditBadge({ status }: { status: AuditStatus }) {
  const presentation = auditStatusPresentation(status);
  const Icon = presentation.tone === "pass" ? ShieldCheck : presentation.tone === "alert" ? CircleAlert : Clock3;
  return <span className={`verification-stamp stamp-${presentation.tone}`} title={presentation.title}><Icon className="h-3.5 w-3.5" /> {presentation.label}</span>;
}

export default function CaseArchive() {
  const archive = trpc.sealCases.archive.useQuery();
  const profileHistory = trpc.verificationProfiles.history.useQuery();
  const [auditPage, setAuditPage] = useState(1);
  const [auditCursors, setAuditCursors] = useState<Array<AuditCursor | undefined>>([undefined]);
  const [auditEventType, setAuditEventType] = useState("");
  const [auditFromDate, setAuditFromDate] = useState("");
  const viewedNewestEventId = useRef<number | null>(null);
  const auditCursor = auditCursors[auditPage - 1];
  const auditInput = useMemo(() => ({ limit: AUDIT_TIMELINE_PAGE_SIZE, ...(auditCursor ? { cursor: auditCursor } : {}), ...(auditEventType ? { eventType: auditEventType } : {}), ...(auditFromDate ? { fromTimestamp: new Date(`${auditFromDate}T00:00:00`).getTime() } : {}) }), [auditCursor, auditEventType, auditFromDate]);
  const audit = trpc.sealCases.audit.useQuery(auditInput, { refetchInterval: 30_000, refetchIntervalInBackground: true });
  const newestAuditInput = useMemo(() => ({ limit: 1, ...(auditEventType ? { eventType: auditEventType } : {}), ...(auditFromDate ? { fromTimestamp: new Date(`${auditFromDate}T00:00:00`).getTime() } : {}) }), [auditEventType, auditFromDate]);
  const newestAudit = trpc.sealCases.audit.useQuery(newestAuditInput, { enabled: auditPage > 1, refetchInterval: 30_000, refetchIntervalInBackground: true });
  const [, setLocation] = useLocation();
  const [restoreCaseId, setRestoreCaseId] = useState<number | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const selectedCase = trpc.sealCases.get.useQuery({ id: restoreCaseId ?? 0 }, { enabled: restoreCaseId !== null });

  useEffect(() => {
    if (auditPage === 1 && audit.data?.events[0]) viewedNewestEventId.current = audit.data.events[0].id;
  }, [audit.data, auditPage]);

  const closeRestore = () => {
    if (isRestoring) return;
    setRestoreCaseId(null);
    setPassphrase("");
  };

  const restoreCase = async () => {
    if (!selectedCase.data || passphrase.length < 14) return;
    setIsRestoring(true);
    try {
      const restored = await restoreVaultArtifact(selectedCase.data.encryptedPayloadUrl, selectedCase.data.encryptionSalt, selectedCase.data.encryptionIv, selectedCase.data.contentDigest, passphrase);
      queueRestoredVault(restored);
      closeRestore();
      setLocation("/");
      toast.success("Case restored locally. Verification checks will run again in the workbench.");
    } catch {
      toast.error("Unable to restore this vault. Check the passphrase or the integrity of the saved ciphertext.");
    } finally {
      setIsRestoring(false);
    }
  };

  const exportAuditRecord = (record: Parameters<typeof buildAuditVerificationRecord>[0]) => {
    downloadAuditVerificationRecord(buildAuditVerificationRecord({ ...record, profileHistory: profileHistory.data ?? [] }), auditVerificationFilename(record.caseRefHash));
    toast.success("Audit-chain verification record downloaded.");
  };

  const showOlderAuditEvents = () => {
    const nextCursor = audit.data?.nextCursor;
    if (!nextCursor) return;
    setAuditCursors(cursors => [...cursors.slice(0, auditPage), nextCursor]);
    setAuditPage(page => page + 1);
  };

  const showNewestAuditEvents = () => {
    setAuditCursors([undefined]);
    setAuditPage(1);
  };

  const hasUnseenNewerEvents = hasUnseenNewestAuditEvent(auditPage, viewedNewestEventId.current, newestAudit.data?.events[0]?.id);

  const changeAuditFilter = (change: (value: string) => void, value: string) => {
    change(value);
    showNewestAuditEvents();
  };

  return (
    <DashboardLayout>
      <div className="fieldbook-shell min-h-screen text-[#283331]"><main className="main-desk">
        <header className="topline"><div className="crumbs"><span>Protected evidence workbench</span><ArrowLeft className="h-3.5 w-3.5" /><strong>Case archive</strong></div><Link href="/"><Button variant="outline" className="subtle-button">Return to verification</Button></Link></header>
        <section className="workspace-heading archive-heading"><div><div className="section-kicker"><Archive className="h-4 w-4" /> ENCRYPTED / OWNER-SCOPED</div><h1>Case archive.<br /><em>Ciphertext at rest.</em></h1><p>Records are encrypted before storage. Each case displays a server-verified audit-chain verdict based solely on its metadata.</p></div></section>
        <section className="archive-grid">
          <Card className="verification-card"><div className="card-topline"><div><p className="card-label">SAVED CASE VAULTS</p><h2>Encrypted records</h2></div><FileLock2 className="h-5 w-5 text-[#1e6f68]" /></div>
            {archive.isLoading ? <p className="empty-copy">Verifying owner-scoped audit chains…</p> : archive.data?.length ? <div className="archive-list">{archive.data.map(record => <article key={record.id} className="archive-row"><div className="file-mark"><ShieldCheck className="h-5 w-5" /></div><div className="archive-case-copy"><strong>Case reference {compactHash(record.caseRefHash)}</strong><span>Digest {compactHash(record.contentDigest)} · {record.verificationStatus.replaceAll("_", " ")}</span><div className="archive-audit-meta"><AuditBadge status={record.auditStatus} /><span>{record.auditStatus.totalEvents} audit {record.auditStatus.totalEvents === 1 ? "event" : "events"}</span></div></div><div className="archive-actions"><time>{new Date(record.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</time><Button variant="outline" className="subtle-button archive-restore" onClick={() => exportAuditRecord(record)}><ArrowDownToLine className="h-3.5 w-3.5" /> Export audit</Button><Button variant="outline" className="subtle-button archive-restore" onClick={() => setRestoreCaseId(record.id)}><RotateCcw className="h-3.5 w-3.5" /> Restore</Button></div></article>)}</div> : <div className="empty-vault"><FileLock2 className="h-6 w-6" /><h3>No encrypted cases yet</h3><p>Verify a manifest, then save the evidence package with a vault passphrase. Plaintext manifests and ledgers are never stored in this archive.</p></div>}</Card>
          <Card className="scope-card audit-card"><div className="scope-icon"><History className="h-4 w-4" /></div><div><div className="timeline-heading"><div><p className="card-label">AUDIT TIMELINE</p><h3>Verified event history</h3></div><AuditTimelineFilters eventType={auditEventType} fromDate={auditFromDate} onEventTypeChange={value => changeAuditFilter(setAuditEventType, value)} onFromDateChange={value => changeAuditFilter(setAuditFromDate, value)} onClear={() => { setAuditEventType(""); setAuditFromDate(""); showNewestAuditEvents(); }} /></div>{audit.isLoading ? <p>Loading owner-scoped audit history…</p> : <><AuditTimeline events={audit.data?.events ?? []} /><AuditTimelinePagination page={auditPage} visibleEvents={audit.data?.events.length ?? 0} hasOlder={Boolean(audit.data?.nextCursor)} hasUnseenNewer={hasUnseenNewerEvents} isLoading={audit.isFetching} onNewest={showNewestAuditEvents} onOlder={showOlderAuditEvents} /></>}</div></Card>
          <div className="artifact-note"><Hash className="h-4 w-4" /><span>Case identity is indexed only by an irreversible SHA-256 reference hash.</span></div>
        </section>
      </main></div>
      <Dialog open={restoreCaseId !== null} onOpenChange={open => { if (!open) closeRestore(); }}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Restore encrypted case</DialogTitle><DialogDescription>The ciphertext is retrieved for your authenticated account, then decrypted only in this browser. Your passphrase is never transmitted or retained.</DialogDescription></DialogHeader>{selectedCase.isLoading ? <p className="text-sm text-muted-foreground">Retrieving encrypted artifact…</p> : selectedCase.isError ? <p className="text-sm text-destructive">This encrypted case could not be retrieved.</p> : <div className="grid gap-2"><label htmlFor="restore-passphrase" className="text-sm font-medium">Vault passphrase</label><input id="restore-passphrase" type="password" className="vault-restore-input" value={passphrase} onChange={event => setPassphrase(event.target.value)} placeholder="Enter the original passphrase" autoComplete="current-password" /></div>}<DialogFooter><Button variant="outline" onClick={closeRestore} disabled={isRestoring}>Cancel</Button><Button onClick={() => void restoreCase()} disabled={selectedCase.isLoading || selectedCase.isError || passphrase.length < 14 || isRestoring}><KeyRound className="h-4 w-4" /> {isRestoring ? "Decrypting locally" : "Restore locally"}</Button></DialogFooter></DialogContent></Dialog>
    </DashboardLayout>
  );
}
