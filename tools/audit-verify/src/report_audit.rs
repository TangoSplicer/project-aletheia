use sha2::{Digest, Sha256};
use crate::ledger_audit::LedgerEntry;

pub fn verify_report_seal(report_bytes: &[u8], ledger: &[LedgerEntry]) -> Result<(), String> {
    // 1. Calculate current hash of the report file
    let current_hash = format!("{:x}", Sha256::digest(report_bytes));

    // 2. Locate REPORT_GENERATED event in ledger
    let seal_event = ledger.iter()
        .find(|e| e.event_type == "REPORT_GENERATED")
        .ok_or("No report seal found in ledger.")?;

    // 3. Cryptographic Comparison
    if seal_event.detail_hash != current_hash {
        return Err(format!("Report hash mismatch. Ledger expects {}, found {}.", seal_event.detail_hash, current_hash));
    }
    Ok(())
}
