# Core Nexus and SRA Library Compatibility Matrix

## Purpose

This matrix records the supported relationship between Project Aletheia Core Nexus and the Aletheia SRA Library submodule. It is a source and validation compatibility statement, not an accreditation, method-validation, practitioner-authorization, or legal-admissibility statement.

The parent repository intentionally pins an exact SRA Library commit through the `sra-library` Gitlink. A clean checkout must initialize that submodule before running framework or SRA checks.

```bash
git submodule update --init --recursive
bash validation-suite/sra_integration_gate.sh
```

## Current supported compatibility

| Parent component | Supported state | SRA requirement | Validation gate | Release implication |
|---|---|---|---|---|
| Core Nexus v1 baseline | `core-nexus/` with the repository lockfile and stable Rust toolchain | Submodule commit `122e120befa544eb786d6a7c225298119a13238e` or the commit recorded by the parent Gitlink | `cargo test --manifest-path core-nexus/Cargo.toml --test hash_validation` and `bash validation-suite/sra_integration_gate.sh` | The parent commit and submodule commit must be recorded together. |
| SRA integration fixture schema | `schema_version: "1.0"` in `sra-library/schema/test_sra_manifest.json` | A tracked regular-file fixture with declared size, BLAKE3, and SHA-256 values | Core Nexus validates field presence, paths, size, BLAKE3, and SHA-256; the Python gate independently validates the structural and SHA-256 portions. | Changes to the fixture schema require a compatibility review and updated negative tests. |
| Production SRA artifact package | Not yet declared as a supported package contract | Do **not** treat `schema/sra_manifest.json` placeholder digests as integrity evidence. | A production package must add a real artifact, explicit package schema/version, real digests, provenance, and independently reviewed release evidence. | Introducing the production package format is a controlled method and release change. |
| Dashboard sealing intake | Manifest/ledger compatibility remains governed by the dashboard contract | The dashboard does not automatically consume arbitrary SRA artifacts from the submodule. | Dashboard CI and its own manifest/ledger tests remain separate. | Any new Core/SRA/dashboard interchange must add shared fixtures and explicit version support. |

## Integration contract

The deterministic test manifest is intentionally narrow. It contains the following required fields:

| Field | Constraint | Why it matters |
|---|---|---|
| `schema_version` | Non-empty, versioned string | Supports compatibility decisions instead of implicit parsing. |
| `artifact_name`, `artifact_type`, `verification_method`, `attestation` | Non-empty descriptive strings | Records the declared fixture context without granting authority. |
| `artifact_path` | Relative path that canonically resolves inside `sra-library/` to a regular file | Prevents a fixture manifest, including one using traversal or a symlinked path, from silently pointing outside the pinned SRA checkout. |
| `size_bytes` | Exact positive file size | Detects truncation and unrecorded content change. |
| `hashes.blake3` and `hashes.sha256` | 64-character hexadecimal digests matching the artifact | Provides dual deterministic integrity checks. |

The gate accepts the valid fixture and then corrupts the declared digests in a temporary manifest. The Core Nexus validator must reject the BLAKE3 mismatch; the standard-library Python validation must reject the SHA-256 mismatch. It also changes the artifact path to a parent-repository file, which both validators must reject after canonical path-containment checks. A successful run therefore proves positive, digest-negative, and traversal-negative paths for the pinned fixture.

## Required change process

| Change | Required actions before merge | Required release record |
|---|---|---|
| Submodule pin update | Initialize the proposed submodule revision, run Core hash test and SRA integration gate, inspect schema/fixture changes, and update this matrix. | Parent commit SHA, SRA commit SHA/tag, commands and outcomes, reviewer. |
| Fixture or validator update | Update positive and negative coverage, ensure placeholder digests remain rejected, and run the full validation gate. | Schema/fixture version, expected digest change rationale, reviewer. |
| New SRA artifact type | Define schema semantics, artifact provenance, signature/authorization model, path/size/hash policy, and failure behavior. | Method-change decision, threat review, validation evidence, rollback plan. |
| Core hashing or parser change | Re-run Core hash regression, all SRA integration checks, and compatibility review. | Core version, dependency/lockfile delta, compatibility decision. |
| Dashboard/Core/SRA interchange | Add shared versioned fixtures and explicit acceptance/rejection cases in both relevant projects. | Supported-version matrix and migration or fallback behavior. |

## CI release gates

The Project Aletheia validation workflow checks out submodules recursively, uses the current stable Rust toolchain, runs the Core hash regression, and invokes `validation-suite/sra_integration_gate.sh`. The gate fails when the SRA submodule, fixture manifest, artifact path, declared size, or declared digest is missing or inconsistent.

CI completion is necessary but not sufficient for method or operational release. Before a release, complete the quality, governance, SRA provenance, security, migration, and operational reviews applicable to the proposed change. See [`ROADMAP_TO_V2.md`](../ROADMAP_TO_V2.md) and [`dashboard/RELEASE_POLICY.md`](../dashboard/RELEASE_POLICY.md) for the broader release sequence.

## Current limitations and next review

The checked-in `sra_manifest.json` uses placeholder hashes and is not a production integrity package. The current fixture proves only that the parent/submodule path and validator contracts work. Before representing a real SRA artifact package as verified, implement and review real artifact provenance, immutable package identity, digest/signature verification, authorization evidence, retention, and compatibility handling.

Review this matrix whenever the parent Gitlink changes, the SRA Library changes schema or release policy, Core Nexus hashing changes, a dashboard interchange is introduced, or a security incident affects integrity assumptions.
