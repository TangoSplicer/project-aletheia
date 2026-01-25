pub const JURISDICTION: &str = "USA";
pub const STANDARD: &str = "NIST SP 800-86";

pub fn get_daubert_checklist() -> Vec<&'static str> {
    vec![
        "Peer review of underlying algorithms",
        "Standards controlling the technique's operation",
        "General acceptance in the scientific community"
    ]
}
