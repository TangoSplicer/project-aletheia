#[test]
fn test_valid_sram_pinning() {
    let mut ledger = Ledger::init_in_memory();
    let valid_manifest = include_bytes!("test_data/valid.sram");
    let result = PinningEngine::pin_artifact(valid_manifest, &mut ledger, &ModelIntegrityPolicy::Strict);
    assert!(result.is_ok());
    assert_eq!(ledger.last_event().event_type, EventType::SRA_PINNED);
}

#[test]
fn test_tampered_manifest_rejection() {
    let mut ledger = Ledger::init_in_memory();
    let mut tampered_manifest = include_bytes!("test_data/valid.sram").to_vec();
    // Flip a byte in the hash string
    tampered_manifest[200] ^= 0xFF; 
    
    let result = PinningEngine::pin_artifact(&tampered_manifest, &mut ledger, &ModelIntegrityPolicy::Strict);
    assert!(matches!(result, Err(ForensicError::SignatureMismatch | ForensicError::ManifestMalformed)));
}

#[test]
fn test_runtime_hash_mismatch_fails_execution() {
    let pin = SraPin { /* ... valid hashes ... */ };
    let corrupted_file = create_temp_file("corrupted data");
    
    let result = PinningEngine::verify_execution_integrity(
        &corrupted_file, 
        &pin, 
        &ModelIntegrityPolicy::Strict
    );
    assert!(result.is_err());
}
