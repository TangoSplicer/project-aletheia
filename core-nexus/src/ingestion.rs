use crate::hashing::{hash_file, HashAlgorithm};

pub struct IngestionEvent {
    pub source_path: String,
    pub primary_hash: String,
    pub secondary_hash: String,
}

pub fn ingest_evidence(path: &str) -> IngestionEvent {
    let blake3 = hash_file(path, HashAlgorithm::Blake3).unwrap();
    let sha256 = hash_file(path, HashAlgorithm::Sha256).unwrap();
    
    IngestionEvent {
        source_path: path.to_string(),
        primary_hash: blake3.hex_digest,
        secondary_hash: sha256.hex_digest,
    }
}
