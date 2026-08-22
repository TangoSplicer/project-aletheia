"""Structural and SHA-256 checks for the pinned Project Aletheia SRA fixture.

The companion Core Nexus `sra_validate` binary validates both BLAKE3 and SHA-256.
This standard-library gate deliberately validates the same fixture's path, schema,
size, and SHA-256 digest so CI fails closed when the SRA submodule or fixture is
missing or malformed.
"""

import argparse
import hashlib
import json
import logging
import re
import sys
from pathlib import Path

LOGGER = logging.getLogger("aletheia.sra_validation")
SRA_ROOT = Path("sra-library")
FIXTURE_MANIFEST = SRA_ROOT / "schema" / "test_sra_manifest.json"
REQUIRED_FIELDS = (
    "schema_version",
    "artifact_name",
    "artifact_path",
    "artifact_type",
    "verification_method",
    "size_bytes",
    "hashes",
    "attestation",
)
HEX_DIGEST = re.compile(r"^[0-9a-fA-F]{64}$")


def sha256_file(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as artifact:
        for block in iter(lambda: artifact.read(1024 * 1024), b""):
            hasher.update(block)
    return hasher.hexdigest()


def validate_fixture(manifest_path: Path = FIXTURE_MANIFEST) -> bool:
    try:
        with manifest_path.open("r", encoding="utf-8") as handle:
            manifest = json.load(handle)
    except (OSError, json.JSONDecodeError) as error:
        LOGGER.error("Could not load SRA fixture manifest (%s): %s", type(error).__name__, error)
        return False

    missing = [field for field in REQUIRED_FIELDS if field not in manifest]
    if missing:
        LOGGER.error("SRA fixture manifest is missing required fields: %s", ", ".join(missing))
        return False

    hashes = manifest["hashes"]
    if not isinstance(hashes, dict) or not all(HEX_DIGEST.fullmatch(str(hashes.get(algorithm, ""))) for algorithm in ("blake3", "sha256")):
        LOGGER.error("SRA fixture manifest requires 64-character hexadecimal BLAKE3 and SHA-256 digests")
        return False

    try:
        declared_size = int(manifest["size_bytes"])
    except (TypeError, ValueError):
        LOGGER.error("SRA fixture manifest size_bytes must be an integer")
        return False

    root = SRA_ROOT.resolve()
    artifact_path = (manifest_path.parent / str(manifest["artifact_path"])).resolve()
    if root not in artifact_path.parents or not artifact_path.is_file():
        LOGGER.error("SRA fixture artifact path is invalid or outside the SRA submodule: %s", artifact_path)
        return False

    if artifact_path.stat().st_size != declared_size:
        LOGGER.error("SRA fixture size mismatch: expected %s, found %s", declared_size, artifact_path.stat().st_size)
        return False

    actual_sha256 = sha256_file(artifact_path)
    if actual_sha256.lower() != hashes["sha256"].lower():
        LOGGER.error("SRA fixture SHA-256 mismatch")
        return False

    LOGGER.info("SRA fixture structural and SHA-256 validation passed: %s", manifest["artifact_name"])
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate a pinned Project Aletheia SRA fixture manifest")
    parser.add_argument("--mode", default="gate", choices=("gate",), help="Retained for CI command compatibility")
    parser.add_argument("--manifest", type=Path, default=FIXTURE_MANIFEST, help="Path to the SRA manifest to validate")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    LOGGER.info("Project Aletheia SRA integration validation")
    return 0 if validate_fixture(args.manifest) else 1


if __name__ == "__main__":
    sys.exit(main())
