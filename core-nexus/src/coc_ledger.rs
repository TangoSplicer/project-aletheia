use crate::hashing::{hash_file, HashAlgorithm};
use serde::{Deserialize, Serialize};
use std::fs::{OpenOptions, File};
use std::io::{self, Write, BufReader, BufRead};
use chrono::{Utc, DateTime};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LedgerEntry {
    pub sequence_id: u64,
    pub timestamp: String,
    pub event_type: String,
    pub actor: String,
    pub object_ref: String,
    pub detail_hash: String,
    pub previous_hash: String,
    pub entry_hash: String,
}

pub struct CocLedger;

impl CocLedger {
    pub fn append(
        path: &str,
        event_type: &str,
        actor: &str,
        object_ref: &str,
        detail_hash: &str,
    ) -> io::Result<LedgerEntry> {
        let (last_seq, last_hash) = Self::get_last_entry_info(path)?;
        
        let mut entry = LedgerEntry {
            sequence_id: last_seq + 1,
            timestamp: Utc::now().to_rfc3339(),
            event_type: event_type.to_string(),
            actor: actor.to_string(),
            object_ref: object_ref.to_string(),
            detail_hash: detail_hash.to_string(),
            previous_hash: last_hash,
            entry_hash: String::new(),
        };

        // Calculate cryptographic link
        entry.entry_hash = Self::calculate_entry_hash(&entry);

        let json = serde_json::to_string(&entry)?;
        let mut file = OpenOptions::new().create(true).append(true).open(path)?;
        writeln!(file, "{}", json)?;
        
        Ok(entry)
    }

    fn get_last_entry_info(path: &str) -> io::Result<(u64, String)> {
        let file = match File::open(path) {
            Ok(f) => f,
            Err(_) => return Ok((0, "GENESIS".to_string())),
        };

        let reader = BufReader::new(file);
        let last_line = reader.lines().last();

        match last_line {
            Some(Ok(line)) => {
                let entry: LedgerEntry = serde_json::from_str(&line)?;
                Ok((entry.sequence_id, entry.entry_hash))
            }
            _ => Ok((0, "GENESIS".to_string())),
        }
    }

    fn calculate_entry_hash(entry: &LedgerEntry) -> String {
        // Deterministic string for hashing: Seq + PrevHash + Event + Obj + Data
        let input = format!(
            "{}{}{}{}{}",
            entry.sequence_id, entry.previous_hash, entry.event_type, entry.object_ref, entry.detail_hash
        );
        let hash = blake3::hash(input.as_bytes());
        hash.to_hex().to_string()
    }
}
