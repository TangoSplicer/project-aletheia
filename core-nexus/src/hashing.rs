use blake3::Hasher as Blake3Hasher;
use sha2::{Sha256, Digest};
use std::fs::File;
use std::io::{self, Read};

pub enum HashAlgorithm {
    Blake3,
    Sha256,
}

pub struct ForensicHash {
    pub algorithm: String,
    pub hex_digest: String,
}

pub fn hash_file(path: &str, algo: HashAlgorithm) -> io::Result<ForensicHash> {
    let mut file = File::open(path)?;
    let mut buffer = vec![0; 1048576]; // 1MB buffer for forensic throughput

    match algo {
        HashAlgorithm::Blake3 => {
            let mut hasher = Blake3Hasher::new();
            while let Ok(n) = file.read(&mut buffer) {
                if n == 0 { break; }
                hasher.update(&buffer[..n]);
            }
            Ok(ForensicHash {
                algorithm: "BLAKE3".to_string(),
                hex_digest: hasher.finalize().to_hex().to_string(),
            })
        },
        HashAlgorithm::Sha256 => {
            let mut hasher = Sha256::new();
            while let Ok(n) = file.read(&mut buffer) {
                if n == 0 { break; }
                hasher.update(&buffer[..n]);
            }
            Ok(ForensicHash {
                algorithm: "SHA256".to_string(),
                hex_digest: format!("{:x}", hasher.finalize()),
            })
        }
    }
}
