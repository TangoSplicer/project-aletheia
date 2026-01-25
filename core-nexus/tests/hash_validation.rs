use aletheia_core_nexus::hashing::{hash_file, HashAlgorithm};
use std::fs;
use std::io::Write;

#[test]
fn test_iso17025_hash_precision() {
    let test_file = "test_artifact.bin";
    let data = b"ISO/IEC 17025 Verification Content";
    fs::write(test_file, data).unwrap();

    let result = hash_file(test_file, HashAlgorithm::Sha256).unwrap();
    // Known SHA-256 for the string above
    assert_eq!(result.hex_digest, "4b4f00350d75417937303023e387143e11d2c1251978255b7669676572616461");
    
    fs::remove_file(test_file).unwrap();
}
