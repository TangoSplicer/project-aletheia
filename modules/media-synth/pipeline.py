import os
import yaml
from signals.rppg import PulseAnalyzer
from signals.blink import BlinkAnalyzer
from explainability.heatmap import HeatmapGenerator
from report_adapter import CourtReportAdapter

class MediaSynthPipeline:
    def __init__(self, config_path):
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        self.pulse_engine = PulseAnalyzer(self.config)
        self.blink_engine = BlinkAnalyzer(self.config)
        self.visualizer = HeatmapGenerator(self.config)
        self.reporter = CourtReportAdapter(self.config)

    def process_video(self, video_path, output_dir):
        """
        Forensic Triage Pipeline: Orchestrates biological signal extraction.
        """
        # 1. Biological Signal Extraction
        pulse_data = self.pulse_engine.extract_signal(video_path)
        blink_data = self.blink_engine.analyze_rate(video_path)
        
        # 2. Generate Heatmaps (Visual Evidence)
        heatmap_paths = self.visualizer.generate(video_path, pulse_data, blink_data, output_dir)
        
        # 3. Create Court-Ready Summary
        report = self.reporter.format_findings(pulse_data, blink_data, heatmap_paths)
        
        return report
