use crate::sra_pinning::SraPin;
use crate::ledger::{Ledger, EventType, LedgerEntry};
use crate::errors::ForensicError;
use serde::Serialize;
use sha2::{Digest, Sha256};

#[derive(Serialize)]
pub struct ForensicReport {
    pub case_id: String,
    pub generation_timestamp: String,
    pub authorized_methods: Vec<MethodExhibit>,
    pub chain_of_custody_narrative: Vec<NarrativeEvent>,
    pub system_attestation: String,
}

#[derive(Serialize)]
pub struct MethodExhibit {
    pub artifact_name: String,
    pub sha256_hash: String,
    pub practitioner_id: String,
    pub jurisdiction: String,
    pub ledger_sequence: u64,
}

#[derive(Serialize)]
pub struct NarrativeEvent {
    pub sequence: u64,
    pub event_type: EventType,
    pub description: String,
    pub hash_anchor: String,
}

pub struct ReportEngine;

impl ReportEngine {
    pub fn generate_final_report(
        case_id: &str,
        ledger: &mut Ledger,
        active_pins: &[SraPin],
    ) -> Result<ForensicReport, ForensicError> {
        // 1. Enforcement Gate: Refuse report if no authorized methods exist
        if active_pins.is_empty() {
            return Err(ForensicError::IllegalState("No SRA pins detected. Reporting inhibited for unverified methods.".into()));
        }

        // 2. Enumerate Authorized Methods
        let authorized_methods: Vec<MethodExhibit> = active_pins.iter().map(|pin| {
            let event = ledger.find_event(EventType::SRA_PINNED, &pin.artifact_name)
                .ok_or(ForensicError::LedgerInconsistency)?;
            
            Ok(MethodExhibit {
                artifact_name: pin.artifact_name.clone(),
                sha256_hash: pin.sha256_hash.clone(),
                practitioner_id: pin.practitioner_id.clone(),
                jurisdiction: pin.jurisdiction.clone(),
                ledger_sequence: event.sequence_id,
            })
        }).collect::<Result<Vec<_>, ForensicError>>()?;

        // 3. Construct Linear CoC Narrative
        let narrative = ledger.entries().iter()
            .filter(|e| matches!(e.event_type, 
                EventType::SRA_PINNED | 
                EventType::ANALYSIS_START | 
                EventType::ANALYSIS_END))
            .map(|e| NarrativeEvent {
                sequence: e.sequence_id,
                event_type: e.event_type.clone(),
                description: e.detail.clone(),
                hash_anchor: e.event_hash.clone(),
            })
            .collect();

        let report = ForensicReport {
            case_id: case_id.to_string(),
            generation_timestamp: chrono::Utc::now().to_rfc3339(),
            authorized_methods,
            chain_of_custody_narrative: narrative,
            system_attestation: "No forensic processing occurred without a pinned, practitioner-authorized method.".into(),
        };

        // 4. Ledger Sealing
        let report_json = serde_json::to_string(&report).map_err(|_| ForensicError::SerializationFailure)?;
        let report_hash = format!("{:x}", Sha256::digest(report_json.as_bytes()));
        
        ledger.append(
            EventType::REPORT_GENERATED,
            "SYSTEM",
            case_id,
            &report_hash
        )?;

        Ok(report)
    }
}
