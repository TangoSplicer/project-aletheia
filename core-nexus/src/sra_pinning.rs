use crate::crypto::{DualHash, Verifier};
use crate::ledger::{Ledger, EventType};
use crate::errors::ForensicError;
use serde::{Deserialize, Serialize};
use ed25519_dalek::{PublicKey, Signature, Verifier as EdVerifier};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SraPin {
    pub artifact_name: String,
    pub blake3_hash: String,
    pub sha256_hash: String,
    pub practitioner_id: String,
    pub jurisdiction: String,
}

pub struct PinningEngine;

impl PinningEngine {
    /// Validates a .sram manifest and pins it to the current session
    pub fn pin_artifact(
        raw_manifest: &[u8],
        ledger: &mut Ledger,
        policy: &ModelIntegrityPolicy
    ) -> Result<SraPin, ForensicError> {
        let manifest: FinalSraManifest = serde_json::from_slice(raw_manifest)
            .map_err(|_| ForensicError::ManifestMalformed)?;

        // 1. Status Gate
        if manifest.status != "SEALED_ATTESTED" {
            return Err(ForensicError::IllegalState("Manifest not sealed".into()));
        }

        // 2. Cryptographic Signature Verification
        let pub_key_bytes = base64::decode(&manifest.attestation.public_key)?;
        let sig_bytes = base64::decode(&manifest.attestation.signature)?;
        
        let public_key = PublicKey::from_bytes(&pub_key_bytes)
            .map_err(|_| ForensicError::CryptoFailure("Invalid Public Key".into()))?;
        let signature = Signature::from_bytes(&sig_bytes)
            .map_err(|_| ForensicError::CryptoFailure("Invalid Signature".into()))?;

        // Reconstruct the message that was signed (the verified draft state)
        // Note: Logic assumes the canonical JSON form used during export
        let signed_data = manifest.to_verifiable_bytes(); 
        
        public_key.verify(&signed_data, &signature)
            .map_err(|_| ForensicError::SignatureMismatch)?;

        // 3. Jurisdiction Enforcement
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

        // 4. Ledger Anchoring
        ledger.append(
            EventType::SRA_PINNED,
            &pin.practitioner_id,
            &pin.artifact_name,
            &pin.sha256_hash,
        )?;

        Ok(pin)
    }

    /// Enforcement Gate: Must be called before any forensic tool execution
    pub fn verify_execution_integrity(
        runtime_path: &std::path::Path,
        pin: &SraPin,
        policy: &ModelIntegrityPolicy
    ) -> Result<(), ForensicError> {
        let runtime_hashes = DualHash::compute(runtime_path)?;

        if runtime_hashes.blake3 != pin.blake3_hash || runtime_hashes.sha256 != pin.sha256_hash {
            match policy {
                ModelIntegrityPolicy::Strict => {
                    return Err(ForensicError::IntegrityViolation(
                        format!("Runtime hash mismatch for artifact: {}", pin.artifact_name)
                    ));
                }
                ModelIntegrityPolicy::AuditOnly => {
                    log::warn!("SRA Mismatch detected in AuditOnly mode for {}", pin.artifact_name);
                }
            }
        }
        Ok(())
    }
}
