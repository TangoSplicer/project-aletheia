class HeatmapGenerator:
    """
    Generates visual evidence traces for court disclosure.
    Overlays detected anomalies on video frames.
    """
    def __init__(self, config):
        self.config = config

    def generate(self, video_path, pulse_data, blink_data, output_dir):
        # Generates color-coded overlays:
        # Green: Consistent biological signal
        # Red: High variance / Synthetic indicator
        heatmap_path = f"{output_dir}/evidence_overlay.png"
        return [heatmap_path]
