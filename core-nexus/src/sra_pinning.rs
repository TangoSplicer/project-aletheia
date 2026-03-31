use crate::coc_ledger::CocLedger;
use crate::{ForensicError, ModelIntegrityPolicy};
use crate::hashing::{hash_file, HashAlgorithm};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SraPin {
    pub artifact_name: String,
    pub blake3_hash: String,
    pub sha256_hash: String,
    pub practitioner_id: String,
    pub jurisdiction: String,
}

#[derive(Serialize, Deserialize)]
pub struct FinalSraManifest {
    pub artifact_name: String,
    pub hashes: SraHashes,
    pub jurisdiction: String,
    pub status: String,
    pub attestation: SraAttestation,
}

#[derive(Serialize, Deserialize)]
pub struct SraHashes {
    pub blake3: String,
    pub sha256: String,
}

#[derive(Serialize, Deserialize)]
pub struct SraAttestation {
    pub public_key: String,
    pub signature: String,
    pub practitioner: PractitionerInfo,
}

#[derive(Serialize, Deserialize)]
pub struct PractitionerInfo {
    pub id: String,
    pub jurisdiction: String,
}

pub struct PinningEngine;

impl PinningEngine {
    /// Validates a .sram manifest and pins it to the current session
    pub fn pin_artifact(
        raw_manifest: &[u8],
        ledger_path: &str,
        policy: &ModelIntegrityPolicy
    ) -> Result<SraPin, ForensicError> {
        let manifest: FinalSraManifest = serde_json::from_slice(raw_manifest)
            .map_err(|_| ForensicError::ManifestMalformed)?;

        // 1. Status Gate
        if manifest.status != "SEALED_ATTESTED" {
            return Err(ForensicError::IllegalState("Manifest not sealed".into()));
        }

        // 2. Jurisdiction Enforcement
        if manifest.attestation.practitioner.jurisdiction != "UK (FSR v2)" {
            if let ModelIntegrityPolicy::Strict = policy {
                return Err(ForensicError::JurisdictionViolation);
            }
        }

        let pin = SraPin {
            artifact_name: manifest.artifact_name.clone(),
            blake3_hash: manifest.hashes.blake3.clone(),
            sha256_hash: manifest.hashes.sha256.clone(),
            practitioner_id: manifest.attestation.practitioner.id.clone(),
            jurisdiction: manifest.attestation.practitioner.jurisdiction.clone(),
        };

        // 3. Ledger Anchoring
        CocLedger::append(
            ledger_path,
            "SRA_PINNED",
            &pin.practitioner_id,
            &pin.artifact_name,
            &pin.sha256_hash,
        ).map_err(ForensicError::IoError)?;

        Ok(pin)
    }

    /// Enforcement Gate: Must be called before any forensic tool execution
    pub fn verify_execution_integrity(
        runtime_path: &Path,
        pin: &SraPin,
        policy: &ModelIntegrityPolicy
    ) -> Result<(), ForensicError> {
        let path_str = runtime_path.to_str().ok_or_else(|| {
            ForensicError::IllegalState("Invalid path encoding".into())
        })?;

        let actual_blake3 = hash_file(path_str, HashAlgorithm::Blake3)
            .map_err(ForensicError::IoError)?;
        let actual_sha256 = hash_file(path_str, HashAlgorithm::Sha256)
            .map_err(ForensicError::IoError)?;

        if actual_blake3.hex_digest != pin.blake3_hash || actual_sha256.hex_digest != pin.sha256_hash {
            match policy {
                ModelIntegrityPolicy::Strict => {
                    return Err(ForensicError::IntegrityFailure(
                        format!("Runtime hash mismatch for artifact: {}", pin.artifact_name)
                    ));
                }
                ModelIntegrityPolicy::AuditOnly => {
                    println!("[AUDIT-WARN] SRA Mismatch detected in AuditOnly mode for {}", pin.artifact_name);
                }
            }
        }
        Ok(())
    }
}
