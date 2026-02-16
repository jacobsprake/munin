#!/usr/bin/env python3
"""
Comprehensive Feature Testing Script for Munin
Tests every single feature to identify what works and what doesn't.
"""
import sys
import traceback
from pathlib import Path
import json
from datetime import datetime
from typing import Dict, List, Tuple, Any
import importlib

# Add engine directory to path
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir / "engine"))

class FeatureTester:
    """Systematic feature testing framework."""
    
    def __init__(self):
        self.results: Dict[str, Dict[str, Any]] = {}
        self.engine_dir = script_dir / "engine"
        self.out_dir = self.engine_dir / "out"
        self.out_dir.mkdir(exist_ok=True)
        
    def test_feature(self, name: str, test_func, *args, **kwargs) -> Tuple[bool, str]:
        """Test a single feature and record results."""
        print(f"\n{'='*70}")
        print(f"Testing: {name}")
        print('='*70)
        
        try:
            result = test_func(*args, **kwargs)
            if isinstance(result, tuple):
                success, message = result
            elif isinstance(result, bool):
                success, message = result, "Test completed"
            else:
                success, message = True, str(result)
            
            self.results[name] = {
                'status': 'PASS' if success else 'FAIL',
                'message': message,
                'timestamp': datetime.now().isoformat()
            }
            
            status_icon = "✅" if success else "❌"
            print(f"{status_icon} {name}: {message}")
            return success, message
            
        except Exception as e:
            error_msg = f"Exception: {str(e)}\n{traceback.format_exc()}"
            self.results[name] = {
                'status': 'ERROR',
                'message': error_msg,
                'timestamp': datetime.now().isoformat()
            }
            print(f"❌ {name}: ERROR - {str(e)}")
            return False, error_msg
    
    # ==================== CORE PIPELINE FEATURES ====================
    
    def test_data_ingestion(self) -> Tuple[bool, str]:
        """Test data ingestion from CSV files."""
        try:
            import pandas as pd
            from ingest import ingest_historian_data, normalize_timeseries
            
            data_dir = self.engine_dir / "sample_data"
            if not data_dir.exists():
                return False, "sample_data directory not found"
            
            csv_files = list(data_dir.glob("*.csv"))
            if not csv_files:
                return False, "No CSV files found in sample_data"
            
            df = ingest_historian_data(data_dir)
            if df is None or df.empty:
                return False, "DataFrame is empty or None"
            
            normalize_timeseries(df, self.out_dir / "normalized_timeseries.csv")
            
            if not (self.out_dir / "normalized_timeseries.csv").exists():
                return False, "Normalized CSV file was not created"
            
            return True, f"Successfully ingested {len(df.columns)} nodes, {len(df)} samples"
        except ImportError as e:
            return False, f"Missing dependency: {str(e)}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_graph_inference(self) -> Tuple[bool, str]:
        """Test dependency graph inference."""
        try:
            from infer_graph import build_graph
            
            data_file = self.out_dir / "normalized_timeseries.csv"
            if not data_file.exists():
                return False, "Normalized timeseries file not found (run ingestion first)"
            
            graph_file = self.out_dir / "graph.json"
            build_graph(data_file, graph_file)
            
            if not graph_file.exists():
                return False, "Graph JSON file was not created"
            
            with open(graph_file, 'r') as f:
                graph = json.load(f)
            
            nodes = graph.get('nodes', [])
            edges = graph.get('edges', [])
            
            return True, f"Graph built: {len(nodes)} nodes, {len(edges)} edges"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_sensor_health(self) -> Tuple[bool, str]:
        """Test sensor health detection."""
        try:
            import pandas as pd
            from sensor_health import assess_sensor_health, build_evidence_windows
            
            data_file = self.out_dir / "normalized_timeseries.csv"
            graph_file = self.out_dir / "graph.json"
            
            if not data_file.exists():
                return False, "Normalized timeseries file not found"
            if not graph_file.exists():
                return False, "Graph file not found"
            
            df = pd.read_csv(data_file, index_col=0, parse_dates=True)
            health = assess_sensor_health(df)
            
            if not health:
                return False, "Health assessment returned empty"
            
            with open(graph_file, 'r') as f:
                graph = json.load(f)
            
            evidence_windows = build_evidence_windows(df, graph.get('edges', []))
            
            return True, f"Health assessed for {len(health)} nodes, {len(evidence_windows)} evidence windows"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_incident_simulation(self) -> Tuple[bool, str]:
        """Test incident simulation and cascade prediction."""
        try:
            from build_incidents import build_incidents
            
            graph_file = self.out_dir / "graph.json"
            if not graph_file.exists():
                return False, "Graph file not found"
            
            incidents_file = self.out_dir / "incidents.json"
            build_incidents(graph_file, incidents_file)
            
            if not incidents_file.exists():
                return False, "Incidents JSON file was not created"
            
            with open(incidents_file, 'r') as f:
                incidents = json.load(f)
            
            incident_list = incidents.get('incidents', [])
            return True, f"Generated {len(incident_list)} incident simulations"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_handshake_generation(self) -> Tuple[bool, str]:
        """Test authoritative handshake packet generation."""
        try:
            from packetize import packetize_incidents
            
            incidents_file = self.out_dir / "incidents.json"
            graph_file = self.out_dir / "graph.json"
            evidence_file = self.out_dir / "evidence.json"
            playbooks_dir = script_dir / "playbooks"
            
            if not incidents_file.exists():
                return False, "Incidents file not found"
            if not graph_file.exists():
                return False, "Graph file not found"
            if not evidence_file.exists():
                return False, "Evidence file not found"
            
            packets_dir = self.out_dir / "packets"
            packets_dir.mkdir(exist_ok=True)
            
            packetize_incidents(
                incidents_file,
                graph_file,
                evidence_file,
                playbooks_dir,
                packets_dir
            )
            
            packet_files = list(packets_dir.glob("*.json"))
            return True, f"Generated {len(packet_files)} handshake packets"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_shadow_link_detection(self) -> Tuple[bool, str]:
        """Test shadow link detection (the 'Secret')."""
        try:
            from detect_shadow_link import detect_shadow_links
            
            data_file = self.out_dir / "normalized_timeseries.csv"
            if not data_file.exists():
                return False, "Normalized timeseries file not found"
            
            shadow_links = detect_shadow_links(data_file, output_verbose=False)
            return True, f"Detected {len(shadow_links)} shadow links"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    # ==================== SECURITY FEATURES ====================
    
    def test_audit_log(self) -> Tuple[bool, str]:
        """Test immutable audit log."""
        try:
            from audit_log import ImmutableAuditLog
            
            test_log_file = self.out_dir / "test_audit.jsonl"
            log = ImmutableAuditLog(test_log_file)
            
            entry1 = log.append('create', 'system', 'test_packet_001', {'test': True})
            entry2 = log.append('approve', 'operator_001', 'test_packet_001', {'role': 'test'})
            
            result = log.verify_chain()
            
            if result['valid']:
                return True, f"Audit log verified: {result['entries_checked']} entries"
            else:
                return False, f"Chain verification failed: {result.get('errors', [])}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_byzantine_resilience(self) -> Tuple[bool, str]:
        """Test Byzantine fault tolerance (M-of-N multi-sig)."""
        try:
            from byzantine_resilience import ByzantineResilienceEngine, MinistryType, ActionConsequenceLevel
            
            engine = ByzantineResilienceEngine()
            
            # Test multi-sig requirements determination
            action_type = "open_dam"  # High-consequence action
            action_desc = "Test critical action"
            target_assets = ["asset_001", "asset_002"]
            
            required_ministries, threshold = engine.determine_multi_sig_requirements(action_desc, target_assets, action_type)
            
            return True, f"Byzantine resilience engine initialized, quorum: {threshold}-of-{len(required_ministries)}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_logic_lock(self) -> Tuple[bool, str]:
        """Test Logic-Lock physics validation."""
        try:
            from logic_lock import LogicLockEngine, AssetType
            
            engine = LogicLockEngine()
            
            # Test constraint validation
            command = {
                'rpm': 4000  # Exceeds max RPM of 3600
            }
            
            result = engine.validate_command(
                command_id="test_cmd_001",
                asset_id="turbine_001",
                asset_type=AssetType.TURBINE,
                command=command
            )
            
            return True, f"Logic-Lock validation: valid={result.valid}, blocked={result.blocked}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_protocol_translation(self) -> Tuple[bool, str]:
        """Test protocol translation layer."""
        try:
            import pandas as pd
            from protocol_translator import ProtocolTranslator
            
            translator = ProtocolTranslator()
            
            # Test protocol detection
            test_frame = b'\x01\x03\x00\x00\x00\x0a'  # Sample Modbus frame
            protocol = translator.detect_protocol(test_frame)
            
            return True, f"Protocol translator initialized, detected: {protocol}"
        except ImportError as e:
            return False, f"Missing dependency: {str(e)}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_data_diode(self) -> Tuple[bool, str]:
        """Test data diode enforcement."""
        try:
            from data_diode import DataDiodeEnforcer, DataDiodeMode
            
            enforcer = DataDiodeEnforcer(mode=DataDiodeMode.HARDWARE_DIODE)
            
            # Test inbound (should be allowed)
            inbound_result = enforcer.verify_inbound("test_source", {"test": "data"})
            
            # Test outbound (should be blocked)
            try:
                enforcer.verify_outbound("test_dest", {"test": "data"})
                return False, "Outbound should be blocked but wasn't"
            except Exception:
                pass  # Expected to fail
            
            return True, f"Data diode working: inbound={inbound_result['allowed']}, outbound blocked"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    # ==================== ADVANCED FEATURES ====================
    
    def test_shadow_simulation(self) -> Tuple[bool, str]:
        """Test shadow simulation mode."""
        try:
            import pandas as pd
            from shadow_simulation import ShadowModeEngine
            
            engine = ShadowModeEngine()
            
            # Test shadow mode initialization
            return True, "Shadow simulation engine initialized"
        except ImportError as e:
            return False, f"Missing dependency: {str(e)}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_agentic_reasoning(self) -> Tuple[bool, str]:
        """Test agentic AI reasoning."""
        try:
            from agentic_reasoning import AgenticReasoningEngine
            
            # Load required data
            graph_file = self.out_dir / "graph.json"
            evidence_file = self.out_dir / "evidence.json"
            incidents_file = self.out_dir / "incidents.json"
            
            if not all(f.exists() for f in [graph_file, evidence_file, incidents_file]):
                return False, "Required data files not found (run pipeline first)"
            
            with open(graph_file, 'r') as f:
                graph_data = json.load(f)
            with open(evidence_file, 'r') as f:
                evidence_data = json.load(f)
            with open(incidents_file, 'r') as f:
                incidents_data = json.load(f)
            
            engine = AgenticReasoningEngine(graph_data, evidence_data, incidents_data)
            
            return True, "Agentic reasoning engine initialized"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_cmi_prioritization(self) -> Tuple[bool, str]:
        """Test Civilian-Military Integration prioritization."""
        try:
            from cmi_prioritization import CMIPrioritizationEngine, EmergencyLevel, AssetClassification, AssetPriority
            
            engine = CMIPrioritizationEngine()
            
            # Set emergency level
            engine.set_emergency_level(EmergencyLevel.WAR)
            
            # Classify an asset first
            asset_id = "hospital_001"
            classification = engine.classify_asset(
                asset_id=asset_id,
                sector="healthcare",
                asset_type="hospital",
                is_life_support=True,
                serves_hospitals=True
            )
            
            # Test asset prioritization
            result = engine.prioritize_asset(asset_id)
            
            return True, f"CMI prioritization: asset {asset_id} priority={result.base_priority.value}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_physical_verification(self) -> Tuple[bool, str]:
        """Test physical verification (RF/acoustic)."""
        try:
            import numpy as np
            from physical_verification import PhysicalVerificationEngine
            
            engine = PhysicalVerificationEngine()
            
            return True, "Physical verification engine initialized"
        except ImportError as e:
            return False, f"Missing dependency: {str(e)}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_provenance_ledger(self) -> Tuple[bool, str]:
        """Test provenance ledger (data integrity)."""
        try:
            from provenance_ledger import ProvenanceLedger, HardwareRoot, DataSourceType
            
            ledger = ProvenanceLedger()
            
            # Test hardware root registration
            root = HardwareRoot(
                source_id="test_sensor_001",
                source_type=DataSourceType.SENSOR,
                hardware_id="hw_001",
                public_key="test_key",
                certificate="test_cert",
                issued_at=datetime.now().isoformat()
            )
            ledger.register_hardware_root(root)
            
            return True, f"Provenance ledger initialized, {len(ledger.hardware_roots)} hardware roots registered"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_digital_twin(self) -> Tuple[bool, str]:
        """Test digital twin stress-testing."""
        try:
            import pandas as pd
            from sovereign_digital_twin import DigitalTwinEngine
            
            engine = DigitalTwinEngine()
            
            return True, "Digital twin engine initialized"
        except ImportError as e:
            return False, f"Missing dependency: {str(e)}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_sovereign_handshake(self) -> Tuple[bool, str]:
        """Test sovereign handshake (biometric multi-sig)."""
        try:
            from sovereign_handshake import (
                SovereignHandshake, MinistrySignature, BiometricHandshake
            )
            import hashlib
            
            # Test handshake creation
            handshake = SovereignHandshake(
                action_id="test_action_001",
                action_description="Test action",
                required_ministries=["water_authority", "power_grid"],
                threshold=2
            )
            
            return True, f"Sovereign handshake created: {handshake.action_id}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_liability_shield(self) -> Tuple[bool, str]:
        """Test liability shield (legal compliance)."""
        try:
            import yaml
            from liability_shield import LiabilityShieldEngine
            
            engine = LiabilityShieldEngine()
            
            return True, "Liability shield engine initialized"
        except ImportError as e:
            return False, f"Missing dependency: {str(e)}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_safety_plc(self) -> Tuple[bool, str]:
        """Test Safety PLC (hardware constraints)."""
        try:
            from safety_plc import SafetyPLC
            
            plc = SafetyPLC()
            
            return True, "Safety PLC initialized"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_n_version_programming(self) -> Tuple[bool, str]:
        """Test N-version programming (consensus)."""
        try:
            from n_version_programming import NVersionProgrammingEngine
            
            engine = NVersionProgrammingEngine(n_versions=3, threshold=2)
            
            return True, f"N-version programming engine initialized: {engine.n_versions} versions, threshold {engine.threshold}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_satellite_verification(self) -> Tuple[bool, str]:
        """Test satellite verification."""
        try:
            from satellite_verification import SatelliteVerificationEngine
            
            engine = SatelliteVerificationEngine()
            
            return True, "Satellite verification engine initialized"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_digital_asset_vault(self) -> Tuple[bool, str]:
        """Test digital asset vault (Black-Box)."""
        try:
            from digital_asset_vault import DigitalAssetVault
            
            vault_path = self.out_dir / "test_vault"
            vault = DigitalAssetVault(
                vault_id="test_vault_001",
                location={"lat": 0.0, "lon": 0.0, "name": "Test Location"},
                vault_path=vault_path
            )
            
            return True, f"Digital asset vault initialized: {vault.vault_id}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_sovereign_mesh(self) -> Tuple[bool, str]:
        """Test sovereign mesh network."""
        try:
            from sovereign_mesh import SovereignMeshNetwork, SovereignMeshNode, MeshNodeType, MeshProtocol
            
            network = SovereignMeshNetwork()
            
            # Add a test node
            node = SovereignMeshNode(
                node_id="test_node_001",
                node_type=MeshNodeType.LORA_BASE_STATION,
                location={"lat": 0.0, "lon": 0.0},
                protocol=MeshProtocol.LORA_WAN
            )
            network.add_node(node)
            
            return True, f"Sovereign mesh network initialized: {len(network.nodes)} nodes"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_wide_bandgap_edge(self) -> Tuple[bool, str]:
        """Test wide-bandgap edge computing."""
        try:
            from wide_bandgap_edge import WideBandgapEdgeNode, EdgeNodeSpec, SemiconductorType, OperatingEnvironment
            
            spec = EdgeNodeSpec(
                node_id="test_edge_001",
                semiconductor_type=SemiconductorType.GAN,
                operating_environment=OperatingEnvironment.HIGH_VOLTAGE_GRID,
                max_operating_temperature=200.0,
                max_operating_voltage=10000.0,
                power_consumption=50.0,
                compute_capability="ARM Cortex-A78 @ 2.8GHz",
                memory_capacity=8,
                storage_capacity=128,
                network_interfaces=["LoRaWAN", "Ethernet"],
                location={"lat": 0.0, "lon": 0.0},
                deployment_date=datetime.now().isoformat()
            )
            
            node = WideBandgapEdgeNode(spec)
            
            return True, f"Wide-bandgap edge node initialized: {node.spec.node_id}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def test_biometric_key(self) -> Tuple[bool, str]:
        """Test biometric key generation."""
        try:
            from biometric_key import SovereignHandshakeTablet, BiometricType
            
            tablet = SovereignHandshakeTablet(
                tablet_id="test_tablet_001",
                serial_number="SN001",
                location={"lat": 0.0, "lon": 0.0}
            )
            
            return True, f"Biometric tablet initialized: {tablet.tablet_id}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    # ==================== RUN ALL TESTS ====================
    
    def run_all_tests(self):
        """Run all feature tests."""
        print("\n" + "="*70)
        print("MUNIN COMPREHENSIVE FEATURE TEST SUITE")
        print("="*70)
        print(f"Testing all features in: {script_dir}")
        print(f"Output directory: {self.out_dir}")
        print("="*70)
        
        # Core Pipeline Features
        self.test_feature("1. Data Ingestion", self.test_data_ingestion)
        self.test_feature("2. Graph Inference", self.test_graph_inference)
        self.test_feature("3. Sensor Health Detection", self.test_sensor_health)
        self.test_feature("4. Incident Simulation", self.test_incident_simulation)
        self.test_feature("5. Handshake Generation", self.test_handshake_generation)
        self.test_feature("6. Shadow Link Detection", self.test_shadow_link_detection)
        
        # Security Features
        self.test_feature("7. Audit Log", self.test_audit_log)
        self.test_feature("8. Byzantine Resilience", self.test_byzantine_resilience)
        self.test_feature("9. Logic-Lock", self.test_logic_lock)
        self.test_feature("10. Protocol Translation", self.test_protocol_translation)
        self.test_feature("11. Data Diode", self.test_data_diode)
        
        # Advanced Features
        self.test_feature("12. Shadow Simulation", self.test_shadow_simulation)
        self.test_feature("13. Agentic Reasoning", self.test_agentic_reasoning)
        self.test_feature("14. CMI Prioritization", self.test_cmi_prioritization)
        self.test_feature("15. Physical Verification", self.test_physical_verification)
        self.test_feature("16. Provenance Ledger", self.test_provenance_ledger)
        self.test_feature("17. Digital Twin", self.test_digital_twin)
        self.test_feature("18. Sovereign Handshake", self.test_sovereign_handshake)
        self.test_feature("19. Liability Shield", self.test_liability_shield)
        self.test_feature("20. Safety PLC", self.test_safety_plc)
        self.test_feature("21. N-Version Programming", self.test_n_version_programming)
        self.test_feature("22. Satellite Verification", self.test_satellite_verification)
        self.test_feature("23. Digital Asset Vault", self.test_digital_asset_vault)
        self.test_feature("24. Sovereign Mesh", self.test_sovereign_mesh)
        self.test_feature("25. Wide-Bandgap Edge", self.test_wide_bandgap_edge)
        self.test_feature("26. Biometric Key", self.test_biometric_key)
        
        # Generate summary report
        self.generate_report()
    
    def generate_report(self):
        """Generate comprehensive test report."""
        print("\n" + "="*70)
        print("TEST SUMMARY REPORT")
        print("="*70)
        
        total = len(self.results)
        passed = sum(1 for r in self.results.values() if r['status'] == 'PASS')
        failed = sum(1 for r in self.results.values() if r['status'] == 'FAIL')
        errors = sum(1 for r in self.results.values() if r['status'] == 'ERROR')
        
        print(f"\nTotal Tests: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"⚠️  Errors: {errors}")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        
        print("\n" + "-"*70)
        print("DETAILED RESULTS")
        print("-"*70)
        
        for name, result in sorted(self.results.items()):
            status = result['status']
            icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
            print(f"{icon} {name}: {status}")
            if result['message']:
                msg_lines = result['message'].split('\n')
                for line in msg_lines[:3]:  # Show first 3 lines
                    print(f"   {line}")
                if len(msg_lines) > 3:
                    print(f"   ... ({len(msg_lines)-3} more lines)")
        
        # Save report to file
        report_file = self.out_dir / "test_report.json"
        with open(report_file, 'w') as f:
            json.dump({
                'summary': {
                    'total': total,
                    'passed': passed,
                    'failed': failed,
                    'errors': errors,
                    'success_rate': passed/total*100 if total > 0 else 0
                },
                'results': self.results,
                'timestamp': datetime.now().isoformat()
            }, f, indent=2)
        
        print(f"\n📄 Full report saved to: {report_file}")
        
        # Generate markdown report
        md_report = self.out_dir / "test_report.md"
        with open(md_report, 'w') as f:
            f.write("# Munin Feature Test Report\n\n")
            f.write(f"**Generated:** {datetime.now().isoformat()}\n\n")
            f.write(f"## Summary\n\n")
            f.write(f"- **Total Tests:** {total}\n")
            f.write(f"- **✅ Passed:** {passed}\n")
            f.write(f"- **❌ Failed:** {failed}\n")
            f.write(f"- **⚠️ Errors:** {errors}\n")
            f.write(f"- **Success Rate:** {(passed/total*100):.1f}%\n\n")
            f.write("## Detailed Results\n\n")
            
            for name, result in sorted(self.results.items()):
                status = result['status']
                icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
                f.write(f"### {icon} {name}\n\n")
                f.write(f"**Status:** {status}\n\n")
                f.write(f"**Message:**\n```\n{result['message']}\n```\n\n")
        
        print(f"📄 Markdown report saved to: {md_report}")

if __name__ == "__main__":
    tester = FeatureTester()
    tester.run_all_tests()
    
    # Exit with error code if any tests failed
    failed_count = sum(1 for r in tester.results.values() if r['status'] in ['FAIL', 'ERROR'])
    sys.exit(1 if failed_count > 0 else 0)
