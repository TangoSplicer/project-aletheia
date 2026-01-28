pub struct SraConfig {
    pub local_path: &'static str,
    pub validation_enabled: bool,
    pub model_policy: ModelIntegrityPolicy,
}

pub enum ModelIntegrityPolicy {
    Strict,
    AuditOnly,
}

pub const SRA_LINK: SraConfig = SraConfig {
    local_path: "./sra-library/artifacts/",
    validation_enabled: true,
    model_policy: ModelIntegrityPolicy::Strict,
};

pub const INTEGRITY_LOG_PATH: &str = "./logs/model_integrity.jsonl";
pub const COC_LEDGER_PATH: &str = "./logs/chain_of_custody.jsonl";

pub fn get_sra_path(jurisdiction: &str) -> String {
    format!("{}{}/", SRA_LINK.local_path, jurisdiction.to_lowercase())
}
