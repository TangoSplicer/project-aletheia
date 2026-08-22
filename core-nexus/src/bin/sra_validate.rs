use aletheia_core_nexus::hashing::{hash_file, HashAlgorithm};
use serde::Deserialize;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Deserialize)]
struct SraManifest {
    schema_version: String,
    artifact_name: String,
    artifact_path: String,
    artifact_type: String,
    verification_method: String,
    size_bytes: u64,
    hashes: SraHashes,
    attestation: String,
}

#[derive(Debug, Deserialize)]
struct SraHashes {
    blake3: String,
    sha256: String,
}

fn is_digest(value: &str) -> bool {
    value.len() == 64 && value.bytes().all(|byte| byte.is_ascii_hexdigit())
}

fn print_digests(path: &Path) -> Result<(), String> {
    let path_text = path.to_string_lossy();
    let blake3 = hash_file(&path_text, HashAlgorithm::Blake3).map_err(|error| error.to_string())?;
    let sha256 = hash_file(&path_text, HashAlgorithm::Sha256).map_err(|error| error.to_string())?;
    println!("BLAKE3={}", blake3.hex_digest);
    println!("SHA256={}", sha256.hex_digest);
    Ok(())
}

fn validate_manifest(path: &Path) -> Result<(), String> {
    let text = fs::read_to_string(path).map_err(|error| format!("cannot read manifest: {error}"))?;
    let manifest: SraManifest = serde_json::from_str(&text).map_err(|error| format!("invalid JSON manifest: {error}"))?;

    for (label, value) in [
        ("schema_version", manifest.schema_version.as_str()),
        ("artifact_name", manifest.artifact_name.as_str()),
        ("artifact_path", manifest.artifact_path.as_str()),
        ("artifact_type", manifest.artifact_type.as_str()),
        ("verification_method", manifest.verification_method.as_str()),
        ("attestation", manifest.attestation.as_str()),
    ] {
        if value.trim().is_empty() {
            return Err(format!("manifest field {label} must not be empty"));
        }
    }

    if !is_digest(&manifest.hashes.blake3) || !is_digest(&manifest.hashes.sha256) {
        return Err("manifest requires 64-character hexadecimal BLAKE3 and SHA-256 digests; placeholder values are not valid".into());
    }

    let manifest_directory = path.parent().ok_or("manifest has no parent directory")?;
    let sra_root = manifest_directory
        .parent()
        .ok_or("manifest directory has no SRA Library root")?
        .canonicalize()
        .map_err(|error| format!("cannot resolve SRA Library root: {error}"))?;
    let artifact_path = manifest_directory
        .join(&manifest.artifact_path)
        .canonicalize()
        .map_err(|error| format!("cannot resolve artifact path: {error}"))?;
    if !artifact_path.starts_with(&sra_root) {
        return Err(format!(
            "artifact path {} resolves outside the SRA Library root {}",
            artifact_path.display(),
            sra_root.display()
        ));
    }
    let metadata = fs::metadata(&artifact_path).map_err(|error| format!("cannot stat artifact {}: {error}", artifact_path.display()))?;
    if !metadata.is_file() {
        return Err(format!("artifact path {} is not a regular file", artifact_path.display()));
    }
    if metadata.len() != manifest.size_bytes {
        return Err(format!("size mismatch for {}: expected {}, found {}", artifact_path.display(), manifest.size_bytes, metadata.len()));
    }

    let artifact_text = artifact_path.to_string_lossy();
    let actual_blake3 = hash_file(&artifact_text, HashAlgorithm::Blake3).map_err(|error| error.to_string())?;
    let actual_sha256 = hash_file(&artifact_text, HashAlgorithm::Sha256).map_err(|error| error.to_string())?;
    if !actual_blake3.hex_digest.eq_ignore_ascii_case(&manifest.hashes.blake3) {
        return Err(format!("BLAKE3 mismatch for {}", artifact_path.display()));
    }
    if !actual_sha256.hex_digest.eq_ignore_ascii_case(&manifest.hashes.sha256) {
        return Err(format!("SHA-256 mismatch for {}", artifact_path.display()));
    }

    println!("SRA artifact validation passed: {}", manifest.artifact_name);
    println!("Schema: {} | Type: {} | Method: {}", manifest.schema_version, manifest.artifact_type, manifest.verification_method);
    Ok(())
}

fn usage() -> &'static str {
    "usage: sra_validate <manifest.json> | sra_validate --print-digests <artifact>"
}

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    let result = match args.as_slice() {
        [flag, artifact] if flag == "--print-digests" => print_digests(&PathBuf::from(artifact)),
        [manifest] => validate_manifest(&PathBuf::from(manifest)),
        _ => Err(usage().into()),
    };
    if let Err(error) = result {
        eprintln!("SRA validation failed: {error}");
        std::process::exit(1);
    }
}
