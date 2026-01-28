# Module: Media-Synth (Synthetic Media Detection)

## ⚖️ Forensic Purpose
This module is designed to assist the Forensic Practitioner in the triage and detection of synthetic or manipulated media (Deepfakes). In accordance with the **UK FSR Statutory Code v2**, this tool does not provide a definitive "Pass/Fail" verdict. Instead, it identifies biological and digital inconsistencies that are indicative of synthetic generation.

## 🔍 Forensic Principles
- **Explainability:** All AI-driven detections must be accompanied by a visual signal trace or heatmap.
- **Human-in-the-Loop:** Findings are presented as observations for the Practitioner to evaluate and incorporate into their expert witness statement.
- **Non-Destructive:** Analysis is performed on bit-stream copies; the original evidence remains unaltered.

## ⚠️ Disclosure & Limitations
- **Error Rates:** Practitioners must refer to the current Validation Report in `docs/validation/` for the known False Positive/Negative rates on the specific hardware used.
- **Environmental Factors:** Low-light or highly compressed source material may degrade detection accuracy.
- **Admissibility:** This module provides technical observations. The legal burden of proof remains with the expert witness.

## 🛠 Usage in Court
When preparing a report for the **Crown Prosecution Service (CPS)** or equivalent, results from this module should be described as "inconsistencies consistent with synthetic manipulation" rather than "proof of a deepfake."
