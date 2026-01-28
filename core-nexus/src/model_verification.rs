use crate::hashing::{hash_file, HashAlgorithm};
use serde::{Deserialize, Serialize};
use std::time::SystemTime;
use std::fs::OpenOptions;
use std::io::Write;

#[derive(Debug, Serialize, Deserialize)]
pub struct VerificationLog {
    pub timestamp: u64,
    pub model_name: String,
    pub algorithm: String,
    pub actual_hash: String,
    pub expected_hash: String,
    pub status: String,
    pub sra_reference: String,
}

pub enum VerificationError {
    HashMismatch,
    IoError(String),
    SraReferenceNotFound,
}

pub struct ModelVerifier;

impl ModelVerifier {
    pub fn verify_and_log(
        model_path: &str,
        expected_hash: &str,
        sra_ref: &str,
        algo: HashAlgorithm,
        log_path: &str,
    ) -> Result<(), VerificationError> {
        let hash_result = hash_file(model_path, algo)
            .map_err(|e| VerificationError.IoError(e.to_string()))?;
        
        let status = if hash_result.hex_digest == expected_hash {
            "PASS"
        } else {
            "FAIL"
        };

        let log_entry = VerificationLog {
            timestamp: SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            model_name: model_path.to_string(),
            algorithm: hash_result.algorithm,
            actual_hash: hash_result.hex_digest.clone(),
            expected_hash: expected_hash.to_string(),
            status: status.to_string(),
            sra_reference: sra_ref.to_string(),
        };

        Self::write_log(log_path, &log_entry)?;

        if status == "FAIL" {
            return Err(VerificationError::HashMismatch);
        }

        Ok(())
    }

    fn write_log(path: &str, entry: &VerificationLog) -> Result<(), VerificationError> {
        let json = serde_json::to_string(entry).map_err(|e| VerificationError.IoError(e.to_string()))?;
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
            .map_err(|e| VerificationError.IoError(e.to_string()))?;
        
        writeln!(file, "{}", json).map_err(|e| VerificationError.IoError(e.to_string()))
    }
}
