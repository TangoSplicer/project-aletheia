use aletheia_core_nexus::coc_ledger::{CocLedger, LedgerEntry};
use std::fs;
use std::io::BufRead;

#[test]
fn test_ledger_append_and_chaining() {
    let ledger_path = "test_coc.jsonl";
    if fs::metadata(ledger_path).is_ok() { fs::remove_file(ledger_path).unwrap(); }

    // Event 1: Ingestion
    let e1 = CocLedger::append(ledger_path, "INGESTION", "practitioner_01", "evidence_001.e01", "hash_a").unwrap();
    assert_eq!(e1.sequence_id, 1);
    assert_eq!(e1.previous_hash, "GENESIS");

    // Event 2: AI Verification
    let e2 = CocLedger::append(ledger_path, "AI_VERIFY", "system", "media_synth_v1", "hash_b").unwrap();
    assert_eq!(e2.sequence_id, 2);
    assert_eq!(e2.previous_hash, e1.entry_hash);

    fs::remove_file(ledger_path).unwrap();
}

#[test]
fn test_tamper_evidence() {
    let ledger_path = "test_tamper.jsonl";
    CocLedger::append(ledger_path, "EVENT_1", "act", "obj", "hash_1").unwrap();
    let e2 = CocLedger::append(ledger_path, "EVENT_2", "act", "obj", "hash_2").unwrap();

    // Verify chain integrity manually
    let file = fs::File::open(ledger_path).unwrap();
    let lines: Vec<String> = std::io::BufReader::new(file).lines().map(|l| l.unwrap()).collect();
    
    let entry1: LedgerEntry = serde_json::from_str(&lines[0]).unwrap();
    let entry2: LedgerEntry = serde_json::from_str(&lines[1]).unwrap();

    assert_eq!(entry2.previous_hash, entry1.entry_hash);
    
    fs::remove_file(ledger_path).unwrap();
}
