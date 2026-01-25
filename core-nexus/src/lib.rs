pub mod hashing;
pub mod ingestion;

pub struct ForensicMetadata {
    pub case_id: String,
    pub investigator: String,
    pub timestamp: String,
}
