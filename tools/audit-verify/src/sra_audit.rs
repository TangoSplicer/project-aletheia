use ed25519_dalek::{PublicKey, Signature, Verifier};

pub fn verify_method_authority(sram_bytes: &[u8]) -> Result<String, String> {
    let manifest: FinalSraManifest = serde_json::from_slice(sram_bytes).map_err(|e| e.to_string())?;

    // Ed25519 verification
    let pub_key = PublicKey::from_bytes(&base64::decode(&manifest.attestation.public_key).unwrap()).unwrap();
    let sig = Signature::from_bytes(&base64::decode(&manifest.attestation.signature).unwrap()).unwrap();
    let signed_data = manifest.to_verifiable_bytes();

    pub_key.verify(&signed_data, &sig).map_err(|_| "Invalid practitioner signature on SRA manifest.")?;

    Ok(manifest.attestation.practitioner.id)
}
