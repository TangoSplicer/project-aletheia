import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VerificationProfilePresentation } from "./VerificationProfilePresentation";

describe("VerificationProfilePresentation", () => {
  it("renders a distinct unconfigured authority state", () => {
    const html = renderToStaticMarkup(<VerificationProfilePresentation profile={undefined} authorization={{ state: "unconfigured", message: "No active profile" }} />);
    expect(html).toContain("No active verification profile is configured");
    expect(html).toContain("signature");
  });

  it("renders active policy, key-register count, and a separate authorization verdict", () => {
    const html = renderToStaticMarkup(<VerificationProfilePresentation profile={{ id: 2, name: "Pilot register", jurisdiction: "United Kingdom", policyVersion: "2026.1", status: "active", reviewedAt: null, keys: [{ id: 8, practitionerId: "P-1", practitionerName: null, publicKeyDigest: "a".repeat(64), validFrom: null, validUntil: null, status: "active", revocationReason: null }] }} authorization={{ state: "authorized", message: "Signer approved", signerKeyDigest: "a".repeat(64), matchedKeyId: 8 }} />);
    expect(html).toContain("Pilot register");
    expect(html).toContain("Active signer keys: 1");
    expect(html).toContain("Authority verdict");
    expect(html).toContain("Signer approved");
  });
});
