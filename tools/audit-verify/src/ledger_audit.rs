pub fn verify_ledger_chain(entries: &[LedgerEntry]) -> Result<(), String> {
    for i in 1..entries.len() {
        let prev = &entries[i-1];
        let curr = &entries[i];

        // Verify the hash chain (Current event includes previous event hash)
        if curr.previous_hash != prev.event_hash {
            return Err(format!("Ledger chain broken at sequence {}", curr.sequence_id));
        }
    }
    Ok(())
}
