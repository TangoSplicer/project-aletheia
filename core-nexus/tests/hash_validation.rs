use aletheia_core_nexus::hashing::{hash_file, HashAlgorithm};
use std::fs;

#[test]
fn test_iso17025_hash_precision() {
    let test_file = "test_artifact.bin";
    let data = b"ISO/IEC 17025 Verification Content";
    fs::write(test_file, data).unwrap();

    let result = hash_file(test_file, HashAlgorithm::Sha256).unwrap();
    // Known SHA-256 for the string above
    assert_eq!(result.hex_digest, "2f8f19093c73a6e29c794b784f039e2b4e1e851be5ef35733df8331a058e1049");
    
    fs::remove_file(test_file).unwrap();
}
