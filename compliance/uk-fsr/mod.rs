pub const JURISDICTION: &str = "United Kingdom";
pub const REGULATOR: &str = "Forensic Science Regulator";
pub const CODE_VERSION: &str = "v2.0 (2025/2026)";

pub fn get_fsr_rules() -> Vec<&'static str> {
    vec![
        "Verification against Standard Reference Artifacts (SRA)",
        "Documentation of error rates",
        "Personnel competency logs"
    ]
}
