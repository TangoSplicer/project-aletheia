use serde::{Deserialize, Serialize};
use chrono::{Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PractitionerAttestation {
    pub practitioner_name: String,
    pub accreditation_ref: String,
    pub statement_of_truth: String,
    pub timestamp: String,
}

impl PractitionerAttestation {
    pub fn new(name: &str, acc_ref: &str) -> Self {
        Self {
            practitioner_name: name.to_string(),
            accreditation_ref: acc_ref.to_string(),
            statement_of_truth: "I confirm that the contents of this report are true to the best of my knowledge and belief and that I make it knowing that, if it is tendered in evidence, I shall be liable to prosecution if I have wilfully stated in it anything which I know to be false, or do not believe to be true.".to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    pub fn verify_consent(consent: bool) -> Result<(), String> {
        if !consent {
            return Err("Practitioner attestation refused. Sealing halted.".to_string());
        }
        Ok(())
    }
}
