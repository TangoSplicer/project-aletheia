use aletheia_core_nexus::model_verification::{ModelVerifier, VerificationError};
use aletheia_core_nexus::hashing::HashAlgorithm;
use std::fs;

#[test]
fn test_positive_integrity_verification() {
    let model_mock = "mock_model.pb";
    let mock_data = b"MODEL_WEIGHTS_V1_VERIFIED";
    fs::write(model_mock, mock_data).unwrap();
    
    let expected = "e87f7481f44053995878d655f56b3e9a7e6d034b07f300c14480e608f6583995"; // SHA-256
    let log_file = "test_integrity_pass.jsonl";

    let result = ModelVerifier::verify_and_log(
        model_mock,
        expected,
        "SRA-UK-MEDIA-001",
        HashAlgorithm::Sha256,
        log_file
    );

    assert!(result.is_ok());
    fs::remove_file(model_mock).unwrap();
    fs::remove_file(log_file).unwrap();
}

#[test]
fn test_negative_integrity_failure() {
    let model_mock = "malicious_model.pb";
    let mock_data = b"TAMPERED_WEIGHTS";
    fs::write(model_mock, mock_data).unwrap();
    
    let expected = "e87f7481f44053995878d655f56b3e9a7e6d034b07f300c14480e608f6583995";
    let log_file = "test_integrity_fail.jsonl";

    let result = ModelVerifier::verify_and_log(
        model_mock,
        expected,
        "SRA-UK-MEDIA-001",
        HashAlgorithm::Sha256,
        log_file
    );

    match result {
        Err(VerificationError::HashMismatch) => assert!(true),
        _ => panic!("Expected HashMismatch error"),
    }

    let log_content = fs::read_to_string(log_file).unwrap();
    assert!(log_content.contains("\"status\":\"FAIL\""));

    fs::remove_file(model_mock).unwrap();
    fs::remove_file(log_file).unwrap();
}
