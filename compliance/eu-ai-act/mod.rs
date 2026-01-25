pub const JURISDICTION: &str = "European Union";
pub const COMPLIANCE: &str = "EU AI Act - High Risk Systems";

pub fn get_transparency_obligations() -> Vec<&'static str> {
    vec![
        "Log of AI decision pathways",
        "Human-in-the-loop verification signatures",
        "Data governance logs"
    ]
}
	
