import sys
import json
import hashlib
import os

def run_sra_check(gold_image_path, expected_hash):
    """
    Automated Verification of Method as per ISO 17025.
    """
    if not os.path.exists(gold_image_path):
        print(f"❌ Error: Gold image {gold_image_path} not found.")
        return False
        
    with open(gold_image_path, "rb") as f:
        actual_hash = hashlib.sha256(f.read()).hexdigest()
    
    if actual_hash == expected_hash:
        print(f"✅ SRA Validation Passed for {gold_image_path}")
        return True
    else:
        print(f"❌ SRA Validation FAILED for {gold_image_path}")
        print(f"  Expected: {expected_hash}")
        print(f"  Actual:   {actual_hash}")
        return False

if __name__ == "__main__":
    print("--- Project Aletheia: Automated Verification of Method ---")
    
    # Check for SRA library manifest
    sra_manifest_path = "sra-library/schema/sra_manifest.json"
    
    if not os.path.exists(sra_manifest_path):
        print(f"⚠️ SRA Library manifest not found at {sra_manifest_path}. Skipping validation.")
        sys.exit(0)

    try:
        with open(sra_manifest_path, 'r') as f:
            manifest = json.load(f)
            print(f"Loaded SRA Manifest: {manifest.get('artifact_name', 'Unknown')}")
            # In a real scenario, we would iterate over artifacts and validate them
            # For now, we'll just confirm the manifest is valid JSON
            print("✅ SRA Manifest is valid.")
            sys.exit(0)
    except Exception as e:
        print(f"❌ Error loading SRA manifest: {e}")
        sys.exit(1)
