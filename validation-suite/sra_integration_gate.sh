#!/usr/bin/env bash
set -euo pipefail

manifest="sra-library/schema/test_sra_manifest.json"

if [[ ! -f "$manifest" ]]; then
  echo "SRA integration fixture manifest is missing: $manifest" >&2
  exit 1
fi

echo "Validating pinned SRA fixture with Core Nexus BLAKE3 and SHA-256 checks"
cargo run --manifest-path core-nexus/Cargo.toml --bin sra_validate -- "$manifest"
python3 validation-suite/auto_validate.py --mode gate --manifest "$manifest"

tmp_manifest="$(mktemp sra-library/schema/.sra_corrupt.XXXXXX.json)"
traversal_manifest="$(mktemp sra-library/schema/.sra_traversal.XXXXXX.json)"
trap 'rm -f "$tmp_manifest" "$traversal_manifest"' EXIT

corrupt_declared_digest() {
  local label="$1"
  local original
  local replacement

  original="$(sed -n -E "s/.*\"${label}\": \"([0-9a-fA-F]{64})\".*/\1/p" "$tmp_manifest")"
  if [[ ! "$original" =~ ^[0-9a-fA-F]{64}$ ]]; then
    echo "Unable to locate a 64-character ${label} digest in $tmp_manifest" >&2
    exit 1
  fi

  if [[ "${original:0:1}" == "0" ]]; then
    replacement="1${original:1}"
  else
    replacement="0${original:1}"
  fi
  sed -i "s/${original}/${replacement}/" "$tmp_manifest"
}

# Keep the original artifact path while corrupting a declared digest. The validator
# must reject the manifest rather than treating format-only validity as integrity.
cp "$manifest" "$tmp_manifest"
corrupt_declared_digest "blake3"

if cargo run --manifest-path core-nexus/Cargo.toml --bin sra_validate -- "$tmp_manifest"; then
  echo "SRA validator accepted a deliberately corrupted digest" >&2
  exit 1
fi

# The Python gate checks the standard-library SHA-256 portion of the same fixture.
cp "$manifest" "$tmp_manifest"
corrupt_declared_digest "sha256"
if python3 validation-suite/auto_validate.py --mode gate --manifest "$tmp_manifest"; then
  echo "Python SRA gate accepted a deliberately corrupted digest" >&2
  exit 1
fi

# Artifact paths must remain inside the initialized SRA Library checkout after
# canonicalization; a manifest must not read arbitrary parent-repository files.
cp "$manifest" "$traversal_manifest"
sed -i 's|"artifact_path": "../fixtures/integration-artifact.txt"|"artifact_path": "../../README.md"|' "$traversal_manifest"
if cargo run --manifest-path core-nexus/Cargo.toml --bin sra_validate -- "$traversal_manifest"; then
  echo "SRA validator accepted an artifact path outside the SRA Library root" >&2
  exit 1
fi
if python3 validation-suite/auto_validate.py --mode gate --manifest "$traversal_manifest"; then
  echo "Python SRA gate accepted an artifact path outside the SRA Library root" >&2
  exit 1
fi

echo "SRA integration gate passed: valid fixture accepted; corrupted digests and traversal were rejected"
