/**
 * Aletheia Fieldbook: a protected verification desk that keeps source evidence in
 * the browser while performing manifest-signature and ledger-chain checks locally.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowDownToLine,
  Check,
  ChevronRight,
  CircleAlert,
  FileJson,
  FileKey2,
  Fingerprint,
  FolderOpen,
  Hash,
  Info,
  KeyRound,
  LockKeyhole,
  MoreHorizontal,
  PanelRight,
  Search,
  ShieldCheck,
  Stamp,
  Upload,
  X,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { VerificationProfilePresentation } from "@/components/VerificationProfilePresentation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { evaluateProfileAuthorization } from "@/lib/profileAuthorization";
import { buildProfileProvenance } from "@/lib/profileProvenance";
import { buildWorkbenchInspectionRecord, buildWorkbenchVaultPayload } from "@/lib/workbenchProfile";
import { encryptVaultPayload, hashCaseReference, takeRestoredVault } from "@/lib/vault";
import {
  createDemonstrationBundle,
  inspectLedger,
  parseLedgerDocument,
  type LedgerEntry,
  type LedgerResult,
  type SealManifest,
  type SignatureResult,
  verifyManifestSignature,
} from "@/lib/verification";

type CheckLevel = "pass" | "attention" | "pending";
type VerificationCheck = { label: string; description: string; level: CheckLevel; value: string };

const requiredFields = ["case_id", "practitioner_id", "timestamp", "ledger_root_hash"] as const;
const initialSignature: SignatureResult = { state: "unavailable", message: "Load a signed manifest to verify its Ed25519 envelope." };
const initialLedger: LedgerResult = { state: "unavailable", message: "Load a JSONL or JSON ledger to recompute the custody chain.", validEntries: 0, totalEntries: 0 };

function shortHash(value?: string) {
  if (!value) return "—";
  return value.length > 31 ? `${value.slice(0, 16)}…${value.slice(-11)}` : value;
}

function stateLevel(state: "verified" | "failed" | "unavailable" | "checking"): CheckLevel {
  if (state === "verified") return "pass";
  if (state === "failed") return "attention";
  return "pending";
}

function LevelIcon({ level }: { level: CheckLevel }) {
  if (level === "pass") return <Check className="h-3.5 w-3.5" />;
  if (level === "attention") return <CircleAlert className="h-3.5 w-3.5" />;
  return <Info className="h-3.5 w-3.5" />;
}

function LevelBadge({ level, children }: { level: CheckLevel; children: React.ReactNode }) {
  const style = level === "pass" ? "stamp-pass" : level === "attention" ? "stamp-alert" : "stamp-pending";
  return <span className={`verification-stamp ${style}`}><LevelIcon level={level} />{children}</span>;
}

function authorizationLevel(state: ReturnType<typeof evaluateProfileAuthorization>["state"]): CheckLevel {
  if (state === "authorized") return "pass";
  if (state === "unconfigured" || state === "signature_unverified" || state === "pending_key") return "pending";
  return "attention";
}

function toMillis(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function Home() {
  const manifestInputRef = useRef<HTMLInputElement>(null);
  const ledgerInputRef = useRef<HTMLInputElement>(null);
  const [manifest, setManifest] = useState<SealManifest | null>(null);
  const [fileName, setFileName] = useState("");
  const [ledgerName, setLedgerName] = useState("");
  const [signature, setSignature] = useState<SignatureResult>(initialSignature);
  const [ledger, setLedger] = useState<LedgerResult>(initialLedger);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [vaultPassphrase, setVaultPassphrase] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", jurisdiction: "", policyVersion: "", makerNote: "" });
  const [keyForm, setKeyForm] = useState({ practitionerId: "", practitionerName: "", publicKey: "", validFrom: "", validUntil: "", approvalReference: "", makerNote: "" });
  const [revocationReasons, setRevocationReasons] = useState<Record<number, string>>({});
  const saveCase = trpc.sealCases.save.useMutation();
  const profileUtils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const authQuery = trpc.auth.me.useQuery();
  const activeProfileQuery = trpc.verificationProfiles.current.useQuery();
  const profileHistoryQuery = trpc.verificationProfiles.history.useQuery();
  const approvalRequestsQuery = trpc.verificationProfiles.approvalRequests.useQuery();
  const approvalSummaryQuery = trpc.verificationProfiles.approvalSummary.useQuery(undefined, { enabled: authQuery.data?.role === "admin" });
  const createProfile = trpc.verificationProfiles.create.useMutation({
    onSuccess: async () => {
      await profileUtils.verificationProfiles.current.invalidate();
      await profileUtils.verificationProfiles.list.invalidate();
    },
  });
  const addProfileKey = trpc.verificationProfiles.addKey.useMutation({
    onSuccess: async () => {
      await profileUtils.verificationProfiles.current.invalidate();
    },
  });
  const revokeProfileKey = trpc.verificationProfiles.revokeKey.useMutation({
    onSuccess: async () => {
      await profileUtils.verificationProfiles.current.invalidate();
    },
  });
  const markProfileReviewed = trpc.verificationProfiles.markReviewed.useMutation({
    onSuccess: async () => {
      await profileUtils.verificationProfiles.current.invalidate();
    },
  });
  const retireProfile = trpc.verificationProfiles.retire.useMutation({
    onSuccess: async () => {
      await profileUtils.verificationProfiles.current.invalidate();
      await profileUtils.verificationProfiles.list.invalidate();
    },
  });

  const missingFields = manifest ? requiredFields.filter(field => !manifest[field]) : [];
  const structureValid = Boolean(manifest) && missingFields.length === 0;
  const rootMatches = Boolean(manifest?.ledger_root_hash && ledger.rootHash && manifest.ledger_root_hash === ledger.rootHash);
  const sealVerified = structureValid && signature.state === "verified" && ledger.state === "verified" && rootMatches;
  const profileAuthorization = useMemo(() => evaluateProfileAuthorization(activeProfileQuery.data, signature, manifest?.practitioner_id), [activeProfileQuery.data, manifest?.practitioner_id, signature]);
  const actionablePendingApprovalCount = authQuery.data?.role === "admin" ? approvalSummaryQuery.data?.count ?? 0 : 0;

  const checks = useMemo<VerificationCheck[]>(() => {
    if (!manifest) {
      return [
        { label: "Manifest available", description: "A sealing manifest is required before inspection can begin.", level: "attention", value: "Awaiting file" },
        { label: "Required fields", description: "Checks case, practitioner, timestamp, and declared ledger root.", level: "pending", value: "Not checked" },
        { label: "Ed25519 signature", description: "Verifies a provided signing envelope over the canonical manifest payload.", level: "pending", value: "Not checked" },
        { label: "Ledger continuity", description: "Recomputes the supplied JSONL/JSON evidence ledger with the Aletheia BLAKE3 formula.", level: "pending", value: "Not checked" },
      ];
    }
    return [
        { label: "Manifest available", description: "The manifest was parsed locally in this protected browser session.", level: "pass", value: "Parsed locally" },
        { label: "Required fields", description: "The sealing identity and declared ledger root are present.", level: missingFields.length ? "attention" : "pass", value: missingFields.length ? `Missing: ${missingFields.join(", ")}` : "4 fields present" },
        { label: "Ed25519 signature", description: signature.message, level: stateLevel(signature.state), value: signature.signerFingerprint ?? (signature.state === "verified" ? "Verified" : signature.state === "failed" ? "Rejected" : "No verifiable envelope") },
        { label: "Practitioner authorization", description: profileAuthorization.message, level: authorizationLevel(profileAuthorization.state), value: profileAuthorization.state === "authorized" ? profileAuthorization.profileName ?? "Authorized" : profileAuthorization.state === "unconfigured" ? "No active profile" : "Review required" },
        { label: "Ledger continuity", description: ledger.message, level: ledger.state === "verified" && rootMatches ? "pass" : ledger.state === "failed" || (ledger.state === "verified" && !rootMatches) ? "attention" : "pending", value: ledger.state === "verified" ? (rootMatches ? `${ledger.validEntries} entries; root matches` : "Recomputed root differs from manifest") : ledger.totalEntries ? `${ledger.validEntries}/${ledger.totalEntries} entries valid` : "No ledger loaded" },
      ];
  }, [ledger, manifest, missingFields, profileAuthorization, rootMatches, signature]);

  const completedCount = checks.filter(check => check.level === "pass").length;

  const runSignatureCheck = async (candidate: SealManifest) => {
    setSignature({ state: "checking", message: "Verifying Ed25519 envelope with Web Crypto…" });
    const result = await verifyManifestSignature(candidate);
    setSignature(result);
  };

  useEffect(() => {
    const restored = takeRestoredVault();
    if (!restored) return;
    const restoredManifest = restored.manifest as SealManifest;
    const restoredEntries = restored.ledgerEntries as LedgerEntry[];
    setManifest(restoredManifest);
    setFileName("restored-encrypted-vault.json");
    setLedgerEntries(restoredEntries);
    setLedgerName("restored-custody-ledger.jsonl");
    setLedger(inspectLedger(restoredEntries));
    void runSignatureCheck(restoredManifest);
    toast.success("Encrypted case restored locally; signature and ledger checks were recomputed.");
  }, []);

  const parseManifest = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".json")) {
      toast.error("Choose a JSON sealing manifest.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as SealManifest;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("The document must contain a JSON object.");
        setManifest(parsed);
        setFileName(file.name);
        void runSignatureCheck(parsed);
        toast.success("Manifest parsed locally; signature inspection started.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to parse this manifest.");
      }
    };
    reader.onerror = () => toast.error("The selected file could not be read.");
    reader.readAsText(file);
  };

  const parseLedger = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const entries = parseLedgerDocument(String(reader.result));
        const result = inspectLedger(entries);
        setLedgerEntries(entries);
        setLedger(result);
        setLedgerName(file.name);
        toast[result.state === "verified" ? "success" : "error"](result.message);
      } catch (error) {
        setLedger(initialLedger);
        toast.error(error instanceof Error ? error.message : "Unable to parse this ledger.");
      }
    };
    reader.onerror = () => toast.error("The selected ledger could not be read.");
    reader.readAsText(file);
  };

  const openDemo = async () => {
    try {
      const bundle = await createDemonstrationBundle();
      setManifest(bundle.manifest);
      setFileName("demonstration-sealing-manifest.json");
      setLedgerEntries(bundle.ledger);
      setLedgerName("demonstration-chain.jsonl");
      setLedger(inspectLedger(bundle.ledger));
      await runSignatureCheck(bundle.manifest);
      toast.success("Signed demonstration manifest and ledger loaded locally.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The demonstration bundle could not be generated.");
    }
  };

  const resetWorkspace = () => {
    setManifest(null);
    setFileName("");
    setLedgerName("");
    setSignature(initialSignature);
    setLedger(initialLedger);
    setLedgerEntries([]);
    setVaultPassphrase("");
    if (manifestInputRef.current) manifestInputRef.current.value = "";
    if (ledgerInputRef.current) ledgerInputRef.current.value = "";
    toast.message("Verification workspace cleared.");
  };

  const saveToEncryptedVault = async () => {
    if (!manifest) return toast.error("Load a manifest before saving a case vault.");
    if (vaultPassphrase.length < 14) return toast.error("Use a vault passphrase of at least 14 characters.");
    try {
      const encrypted = await encryptVaultPayload(buildWorkbenchVaultPayload({ manifest, ledgerEntries, signature, ledger, rootMatches, profile: activeProfileQuery.data, authorization: profileAuthorization, profileHistory: profileHistoryQuery.data ?? [] }), vaultPassphrase);
      const caseRefHash = await hashCaseReference(manifest.case_id ?? encrypted.contentDigest);
      await saveCase.mutateAsync({
        ...encrypted,
        caseRefHash,
        verificationStatus: sealVerified ? "verified" : "review_required",
      });
      setVaultPassphrase("");
      toast.success("Encrypted case vault saved; an audit reference was recorded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The encrypted case vault could not be saved.");
    }
  };

  const exportResult = () => {
    if (!manifest) return toast.error("Load a manifest before exporting a verification record.");
    const record = buildWorkbenchInspectionRecord({ manifest, fileName, ledgerName, structureValid, signature, ledger, rootMatches, ledgerEntries, profile: activeProfileQuery.data, authorization: profileAuthorization, profileHistory: profileHistoryQuery.data ?? [], checks });
    const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${manifest.case_id ?? "aletheia"}-verification-record.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Verification record downloaded.");
  };

  const saveProfile = async () => {
    try {
      await createProfile.mutateAsync({ ...profileForm });
      setProfileForm({ name: "", jurisdiction: "", policyVersion: "", makerNote: "" });
      toast.success("Verification profile submitted for independent approval. It remains inactive until a different administrator approves it.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification profile could not be saved.");
    }
  };

  const registerProfileKey = async () => {
    const profile = activeProfileQuery.data;
    if (!profile) return toast.error("Create an active verification profile first.");
    try {
      await addProfileKey.mutateAsync({
        profileId: profile.id,
        practitionerId: keyForm.practitionerId,
        practitionerName: keyForm.practitionerName || undefined,
        publicKey: keyForm.publicKey,
        validFrom: toMillis(keyForm.validFrom),
        validUntil: toMillis(keyForm.validUntil),
        approvalReference: keyForm.approvalReference || undefined,
        makerNote: keyForm.makerNote || undefined,
      });
      setKeyForm({ practitionerId: "", practitionerName: "", publicKey: "", validFrom: "", validUntil: "", approvalReference: "", makerNote: "" });
      toast.success("Signer key submitted for independent approval. It cannot authorize manifests until approved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Signer key could not be registered.");
    }
  };

  const revokeKey = async (keyId: number) => {
    try {
      await revokeProfileKey.mutateAsync({ keyId, reason: revocationReasons[keyId]?.trim() || "Revoked by profile administrator." });
      toast.success("Signer key revoked. Historical profile decisions remain visible in prior exports.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Signer key could not be revoked.");
    }
  };

  const reviewProfile = async () => {
    const profile = activeProfileQuery.data;
    if (!profile) return;
    try {
      await markProfileReviewed.mutateAsync({ profileId: profile.id });
      toast.success("Profile review timestamp recorded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profile review could not be recorded.");
    }
  };

  const retireActiveProfile = async () => {
    const profile = activeProfileQuery.data;
    if (!profile) return;
    if (!window.confirm(`Retire ${profile.name}? Existing profile verdicts remain preserved, but future authorization checks will be unconfigured until another profile is activated.`)) return;
    try {
      await retireProfile.mutateAsync({ profileId: profile.id });
      toast.success("Verification profile retired. Create and approve a replacement before relying on practitioner authorization.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profile could not be retired.");
    }
  };

  const fileStatus = sealVerified ? "SEAL VERIFIED" : manifest ? "REVIEW REQUIRED" : "NO MANIFEST";
  const fileStatusLevel: CheckLevel = sealVerified ? "pass" : manifest ? "attention" : "pending";

  return (
    <DashboardLayout>
      <div className="fieldbook-shell text-[#283331]">
        <main className="main-desk">
          <header className="topline">
            <div className="crumbs"><span>Protected evidence workbench</span><ChevronRight className="h-3.5 w-3.5" /><strong>Seal verification</strong></div>
            <div className="top-actions">
              <span className="local-pill"><span className="local-dot" /> Browser-local validation</span>
              {actionablePendingApprovalCount > 0 && <Button variant="outline" size="sm" className="border-[#b7782a] bg-[#fff7df] px-2.5 text-[#6e4a19] shadow-sm hover:bg-[#fff0c9]" onClick={() => setLocation("/approval-queue")} aria-label={`Open ${actionablePendingApprovalCount} pending approval${actionablePendingApprovalCount === 1 ? "" : "s"} awaiting your review`}><CircleAlert className="h-3.5 w-3.5" /><span className="hidden sm:inline">Review approvals</span><span className="rounded-full bg-[#b7782a] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white" aria-hidden="true">{actionablePendingApprovalCount}</span><span className="sr-only"> pending approval{actionablePendingApprovalCount === 1 ? "" : "s"} awaiting your review</span></Button>}
              <Link href="/case-archive"><button className="icon-button" aria-label="Open case archive"><Archive className="h-4 w-4" /></button></Link>
              <Tooltip><TooltipTrigger asChild><button className="icon-button" onClick={() => toast.message("Case search is the next archive release.")}><Search className="h-4 w-4" /></button></TooltipTrigger><TooltipContent>Search cases</TooltipContent></Tooltip>
              <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
                <Tooltip><TooltipTrigger asChild><DialogTrigger asChild><button className="icon-button" aria-label="Manage verification profile"><MoreHorizontal className="h-4 w-4" /></button></DialogTrigger></TooltipTrigger><TooltipContent>Verification settings</TooltipContent></Tooltip>
                <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-[#f7f5ea] text-[#283331]">
                  <DialogHeader>
                    <p className="card-label">TRUST / AUTHORIZATION</p>
                    <DialogTitle className="font-serif text-3xl">Verification profile</DialogTitle>
                    <DialogDescription className="text-[#596561]">A valid Ed25519 signature proves control of a key. This profile determines whether that key is approved for the named practitioner and policy.</DialogDescription>
                  </DialogHeader>
                  {activeProfileQuery.isLoading ? <p className="text-sm text-[#596561]">Loading active profile…</p> : activeProfileQuery.data ? (
                    <div className="space-y-5">
                      <section className="rounded-xl border border-[#c9c8bc] bg-[#efeee4] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-serif text-xl">{activeProfileQuery.data.name}</h3><p className="mt-1 text-sm text-[#596561]">{activeProfileQuery.data.jurisdiction} · Policy {activeProfileQuery.data.policyVersion}</p></div><LevelBadge level="pass">ACTIVE PROFILE</LevelBadge></div>
                        <p className="mt-3 text-xs text-[#596561]">Last reviewed: {activeProfileQuery.data.reviewedAt ? new Date(activeProfileQuery.data.reviewedAt).toLocaleString() : "Not recorded"}. Authorization uses the full 64-character BLAKE3 digest; short display fingerprints are never trust identifiers.</p>
                        <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" className="subtle-button" disabled={markProfileReviewed.isPending} onClick={() => void reviewProfile()}>{markProfileReviewed.isPending ? "Recording review" : "Record review"}</Button><Button variant="outline" className="subtle-button text-[#8b3d31]" disabled={retireProfile.isPending} onClick={() => void retireActiveProfile()}>{retireProfile.isPending ? "Retiring" : "Retire profile"}</Button></div>
                      </section>
                      <VerificationProfilePresentation profile={activeProfileQuery.data} authorization={profileAuthorization} />
                      <section className="space-y-3"><div><p className="card-label">APPROVED SIGNER KEYS</p><h3 className="font-serif text-xl">Register practitioner authority</h3></div>
                        <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="profile-practitioner">Practitioner ID</Label><Input id="profile-practitioner" value={keyForm.practitionerId} onChange={event => setKeyForm(current => ({ ...current, practitionerId: event.target.value }))} placeholder="PRACTITIONER-001" /></div><div><Label htmlFor="profile-practitioner-name">Practitioner name</Label><Input id="profile-practitioner-name" value={keyForm.practitionerName} onChange={event => setKeyForm(current => ({ ...current, practitionerName: event.target.value }))} placeholder="Optional display name" /></div></div>
                        <div><Label htmlFor="profile-public-key">Ed25519 public key (Base64)</Label><Input id="profile-public-key" value={keyForm.publicKey} onChange={event => setKeyForm(current => ({ ...current, publicKey: event.target.value }))} placeholder="32-byte raw Ed25519 public key" /></div>
                        <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="profile-valid-from">Valid from</Label><Input id="profile-valid-from" type="datetime-local" value={keyForm.validFrom} onChange={event => setKeyForm(current => ({ ...current, validFrom: event.target.value }))} /></div><div><Label htmlFor="profile-valid-until">Valid until</Label><Input id="profile-valid-until" type="datetime-local" value={keyForm.validUntil} onChange={event => setKeyForm(current => ({ ...current, validUntil: event.target.value }))} /></div></div>
                        <div><Label htmlFor="profile-approval-reference">Approval evidence reference</Label><Input id="profile-approval-reference" value={keyForm.approvalReference} onChange={event => setKeyForm(current => ({ ...current, approvalReference: event.target.value }))} placeholder="Register entry or review reference" /></div><div><Label htmlFor="key-maker-note">Maker rationale</Label><Input id="key-maker-note" value={keyForm.makerNote} onChange={event => setKeyForm(current => ({ ...current, makerNote: event.target.value }))} placeholder="Why this signer key is proposed" /></div>
                        <Button className="fieldbook-button" disabled={addProfileKey.isPending || !keyForm.practitionerId || !keyForm.publicKey} onClick={() => void registerProfileKey()}><KeyRound className="h-4 w-4" /> {addProfileKey.isPending ? "Registering" : "Register signer key"}</Button>
                      </section>
                      <section className="space-y-3"><p className="card-label">KEY REGISTER</p>{activeProfileQuery.data.keys.length ? activeProfileQuery.data.keys.map(key => <article key={key.id} className="rounded-lg border border-[#d6d5c8] bg-white/60 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><strong>{key.practitionerName || key.practitionerId}</strong><p className="text-xs text-[#596561]">{key.practitionerId} · <code>{shortHash(key.publicKeyDigest)}</code></p></div><LevelBadge level={key.status === "active" ? "pass" : "attention"}>{key.status.toUpperCase()}</LevelBadge></div>{key.status === "active" && <div className="mt-3 flex gap-2"><Input aria-label={`Revocation reason for ${key.practitionerId}`} value={revocationReasons[key.id] ?? ""} onChange={event => setRevocationReasons(current => ({ ...current, [key.id]: event.target.value }))} placeholder="Reason for revocation" /><Button variant="outline" className="subtle-button" disabled={revokeProfileKey.isPending} onClick={() => void revokeKey(key.id)}>Revoke</Button></div>}{key.revocationReason && <p className="mt-2 text-xs text-[#8b3d31]">Revocation: {key.revocationReason}</p>}</article>) : <p className="rounded-lg border border-dashed border-[#c9c8bc] p-4 text-sm text-[#596561]">No signer keys are registered. Signatures remain cryptographically valid but practitioner authority will be unconfirmed.</p>}</section>
                    </div>
                  ) : (
                    <section className="space-y-4"><VerificationProfilePresentation profile={undefined} authorization={profileAuthorization} /><div><p className="card-label">SUBMIT PROFILE FOR APPROVAL</p><h3 className="font-serif text-xl">Establish a policy boundary</h3><p className="mt-1 text-sm text-[#596561]">The profile remains inactive until a different administrator approves it. The maker cannot approve their own submission.</p></div><div><Label htmlFor="profile-name">Profile name</Label><Input id="profile-name" value={profileForm.name} onChange={event => setProfileForm(current => ({ ...current, name: event.target.value }))} placeholder="UK FSR pilot key register" /></div><div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="profile-jurisdiction">Jurisdiction</Label><Input id="profile-jurisdiction" value={profileForm.jurisdiction} onChange={event => setProfileForm(current => ({ ...current, jurisdiction: event.target.value }))} placeholder="United Kingdom" /></div><div><Label htmlFor="profile-policy">Policy version</Label><Input id="profile-policy" value={profileForm.policyVersion} onChange={event => setProfileForm(current => ({ ...current, policyVersion: event.target.value }))} placeholder="2026.1" /></div></div><div><Label htmlFor="profile-maker-note">Maker rationale</Label><Input id="profile-maker-note" value={profileForm.makerNote} onChange={event => setProfileForm(current => ({ ...current, makerNote: event.target.value }))} placeholder="Why this policy version is proposed" /></div><Button className="fieldbook-button" disabled={createProfile.isPending || !profileForm.name || !profileForm.jurisdiction || !profileForm.policyVersion} onClick={() => void saveProfile()}><ShieldCheck className="h-4 w-4" /> {createProfile.isPending ? "Submitting" : "Submit for approval"}</Button></section>
                  )}
                  <section className="space-y-3"><p className="card-label">YOUR APPROVAL REQUESTS</p>{approvalRequestsQuery.data?.length ? approvalRequestsQuery.data.map(request => <div key={request.id} className="rounded-lg border border-[#d6d5c8] bg-white/50 p-3"><div className="flex justify-between gap-2"><span className="text-sm font-medium">{request.approvalType === "profile_activation" ? "Profile activation" : "Signer-key activation"}</span><LevelBadge level={request.status === "approved" ? "pass" : request.status === "pending" ? "pending" : "attention"}>{request.status.toUpperCase()}</LevelBadge></div><p className="mt-1 text-xs text-[#596561]">Request #{request.id} · submitted {new Date(request.createdAt).toLocaleString()}</p></div>) : <p className="text-sm text-[#596561]">No profile approval requests have been submitted.</p>}</section>
                  {authQuery.data?.role === "admin" && <section className="space-y-3"><p className="card-label">ADMIN APPROVAL QUEUE</p>{approvalSummaryQuery.isLoading ? <p className="text-sm text-[#596561]">Checking independently actionable requests…</p> : actionablePendingApprovalCount ? <div className="rounded-lg border border-[#b9a98b] bg-[#fffdf4] p-3"><p className="font-medium">{actionablePendingApprovalCount} independently actionable request{actionablePendingApprovalCount === 1 ? "" : "s"} await review.</p><p className="mt-1 text-xs text-[#596561]">The dedicated queue orders requests by age and excludes changes you submitted yourself.</p><Button className="mt-3 subtle-button" onClick={() => { setProfileOpen(false); setLocation("/approval-queue"); }}>Open approval queue</Button></div> : <p className="text-sm text-[#596561]">No independently actionable approvals are awaiting review.</p>}</section>}
                  <DialogFooter><p className="mr-auto text-xs text-[#596561]">Profile approval is an organizational control. It does not independently prove professional status, accreditation, or real-world identity.</p></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </header>

          <section className="workspace-heading">
            <div>
              <div className="section-kicker"><Stamp className="h-4 w-4" /> SEAL / VALIDATION</div>
              <h1>Verify the seal.<br /><em>Preserve the record.</em></h1>
              <p>Inspect a practitioner sealing manifest, verify its Ed25519 signing envelope, and recompute the submitted custody ledger without sending source evidence beyond this browser.</p>
            </div>
            <div className="heading-art" aria-hidden="true"><img src="/manus-storage/aletheia-verification-seal_28d40bf7.jpg" alt="" /></div>
          </section>

          <section className="desk-grid">
            <div className="primary-column">
              <Card className="verification-card">
                <div className="card-topline"><div><p className="card-label">MANIFEST INTAKE</p><h2>Sealing manifest</h2></div><LevelBadge level={fileStatusLevel}>{fileStatus}</LevelBadge></div>

                {!manifest ? (
                  <div className="dropzone" onClick={() => manifestInputRef.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) parseManifest(file); }}>
                    <div className="dropzone-icon"><Upload className="h-5 w-5" /></div>
                    <div><h3>Open a sealing manifest</h3><p>Choose a <code>.json</code> manifest. Its signing envelope is evaluated with browser-native Web Crypto.</p></div>
                    <Button className="fieldbook-button" onClick={event => { event.stopPropagation(); manifestInputRef.current?.click(); }}><FolderOpen className="h-4 w-4" /> Select manifest</Button>
                    <button className="sample-link" onClick={event => { event.stopPropagation(); void openDemo(); }}>or generate a signed demonstration</button>
                  </div>
                ) : (
                  <div className="loaded-file"><div className="file-mark"><FileJson className="h-5 w-5" /></div><div className="file-copy"><strong>{fileName}</strong><span>{manifest.case_id ?? "Unidentified case"} · Parsed locally</span></div><Button variant="outline" className="subtle-button" onClick={() => manifestInputRef.current?.click()}><Upload className="h-4 w-4" /> Replace</Button><button className="remove-button" onClick={resetWorkspace} aria-label="Clear workspace"><X className="h-4 w-4" /></button></div>
                )}
                <input ref={manifestInputRef} type="file" accept="application/json,.json" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) parseManifest(file); }} />

                <div className="ledger-import">
                  <div><p className="card-label">CUSTODY LEDGER</p><h3>Recompute the chain</h3><p>Import the signed case ledger as JSONL or JSON. Each entry is recomputed with the Aletheia BLAKE3 linkage formula and compared to the manifest root.</p></div>
                  <div className="ledger-import-actions"><Button variant="outline" className="subtle-button" onClick={() => ledgerInputRef.current?.click()}><FileKey2 className="h-4 w-4" /> {ledgerName ? "Replace ledger" : "Select ledger"}</Button>{ledgerName && <span className="ledger-name">{ledgerName}</span>}<LevelBadge level={ledger.state === "verified" && rootMatches ? "pass" : ledger.state === "failed" || (ledger.state === "verified" && !rootMatches) ? "attention" : "pending"}>{ledger.state === "verified" && rootMatches ? "ROOT MATCHED" : ledger.state === "verified" ? "ROOT MISMATCH" : ledger.totalEntries ? "CHAIN FAILED" : "NO LEDGER"}</LevelBadge></div>
                  <input ref={ledgerInputRef} type="file" accept="application/json,.json,.jsonl" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) parseLedger(file); }} />
                </div>

                <Separator className="my-7 bg-[#d6d5c8]" />
                <div className="verification-summary"><div className="summary-title"><span className="status-orb">{completedCount}</span><div><p className="card-label">LOCAL INSPECTION</p><h3>{manifest ? (sealVerified ? "Cryptographic seal verified" : "Verification evidence incomplete") : "Awaiting sealing manifest"}</h3></div></div><p className="summary-note">{sealVerified ? "The manifest signature verifies and the recomputed ledger root matches the declared root." : "A final seal verdict requires a valid signing envelope and a complete ledger whose recomputed root matches the manifest."}</p></div>
              </Card>

              <section className="check-section"><div className="section-title-row"><div><p className="card-label">VERIFICATION RECORD</p><h2>Checks &amp; provenance</h2></div><span className="thin-rule" /></div><div className="check-list">{checks.map((check, index) => <article className="check-row" key={check.label}><div className="thread-node"><span>{index + 1}</span></div><div className="check-content"><h3>{check.label}</h3><p>{check.description}</p></div><div className="check-outcome"><LevelBadge level={check.level}>{check.level === "pass" ? "CHECKED" : check.level === "attention" ? "ACTION" : "LIMITED"}</LevelBadge><code>{check.value}</code></div></article>)}</div></section>
            </div>

            <aside className="evidence-column">
              <Card className="seal-card"><div className="seal-card-header"><div><p className="card-label">CASE SEAL</p><h2>{manifest?.case_id ?? "No case loaded"}</h2></div><Fingerprint className="h-5 w-5 text-[#1e6f68]" /></div><div className="seal-panel"><img src="/manus-storage/aletheia-split-seal-logo_d983f474.png" alt="" /><div className="seal-lines" /><LevelBadge level={fileStatusLevel}>{sealVerified ? "ROOT & SIGNATURE VALID" : manifest ? "NEEDS REVIEW" : "UNSEALED"}</LevelBadge></div><dl className="fact-list"><div><dt>Practitioner</dt><dd>{manifest?.practitioner_id ?? "—"}</dd></div><div><dt>Attested at</dt><dd>{manifest?.timestamp ? new Date(manifest.timestamp).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC" : "—"}</dd></div><div><dt>Ledger root</dt><dd><code>{shortHash(manifest?.ledger_root_hash)}</code></dd></div><div><dt>Signer</dt><dd><code>{signature.signerFingerprint ?? "—"}</code></dd></div></dl><div className="vault-save"><input type="password" value={vaultPassphrase} onChange={event => setVaultPassphrase(event.target.value)} placeholder="Vault passphrase (14+ characters)" aria-label="Vault passphrase" /><Button className="fieldbook-button" disabled={!manifest || saveCase.isPending} onClick={() => void saveToEncryptedVault()}><KeyRound className="h-4 w-4" /> {saveCase.isPending ? "Encrypting" : "Save vault"}</Button></div><p className="vault-note">AES-256-GCM encryption occurs in this browser. The passphrase is never transmitted or stored.</p><Button className="w-full fieldbook-button mt-4" onClick={exportResult}><ArrowDownToLine className="h-4 w-4" /> Export inspection record</Button></Card>
              <Card className="scope-card"><div className="scope-icon"><PanelRight className="h-4 w-4" /></div><div><p className="card-label">VERIFICATION AUTHORITY</p><h3>{profileAuthorization.state === "authorized" ? "Signer authority confirmed." : "Key possession is not authority."}</h3><p>{profileAuthorization.message} {profileAuthorization.state !== "authorized" && "Configure an approved key register before treating a signature as practitioner authorization."}</p></div></Card>
              <div className="artifact-note"><Hash className="h-4 w-4" /><span>Integrity statements should be independently reproducible.</span></div>
            </aside>
          </section>
        </main>
      </div>
    </DashboardLayout>
  );
}
