# Media-Synth Technical Architecture

## 1. Signal Pipeline
The detection process is split into deterministic biological signal extraction to ensure reproducibility.

1.  **Frame Extraction:** Standardized extraction via `ffmpeg` (Local binary).
2.  **rPPG Extraction:** Remote Photoplethysmography (detecting pulse signals via pixel intensity changes in facial regions).
3.  **EAR Analysis:** Eye Aspect Ratio analysis for blink-rate consistency.
4.  **Signal Normalization:** Comparative analysis against baseline biological norms.
5.  **Explainability Layer:** Generation of heatmaps overlaying detected inconsistencies.

## 2. Explainability Guarantees
To satisfy **ISO/IEC 17025** and **FSR** requirements, the "Black Box" nature of neural networks is mitigated by:
- **Local Weight Verification:** AI weights are hashed and verified against the SRA Library before execution.
- **Signal Traces:** Raw pulse and blink data are output as CSV for independent expert review.
- **Probability Mapping:** Confidence scores are mapped to the Forensic Science Regulator's scale of verbal expressions.

## 3. Deployment
- **Offline Only:** All models reside in the container. No external API calls.
- **Hardware:** GPU-accelerated via local Vulkan/CUDA drivers; falls back to CPU for high-security, low-resource environments.
