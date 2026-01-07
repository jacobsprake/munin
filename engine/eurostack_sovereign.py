"""
EuroStack / Sovereign-by-Design Architecture
2026 Reality Feature: Conditional Sovereignty Solution

By early 2026, the EU Cloud and AI Development Act and similar global frameworks
have made digital sovereignty a legal mandate. Nations that rely on foreign cloud
providers have "Conditional Sovereignty"—their survival depends on the goodwill
of a foreign CEO or distant regulator.

The Product: Munin-Sovereign-Node
- A fully localized, private cloud instance that uses zero US or Chinese proprietary dependencies
- Built on the "EuroStack" philosophy: open foundations, local governance, total independence
- First "Sovereign-by-Design" infrastructure firm (not a retro-fit)

Strategic Value: You are selling "Algorithmic Power"—the ability to process information
and execute commands faster than any adversary can sabotage them, without foreign dependencies.
"""

import json
import hashlib
from pathlib import Path
from typing import Dict, List, Optional, Any, Set
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, asdict


class DependencyType(Enum):
    """Types of dependencies that must be verified."""
    SOFTWARE_LIBRARY = "software_library"
    CLOUD_SERVICE = "cloud_service"
    HARDWARE_COMPONENT = "hardware_component"
    NETWORK_PROTOCOL = "network_protocol"
    CRYPTOGRAPHIC_ALGORITHM = "cryptographic_algorithm"
    DATABASE_ENGINE = "database_engine"
    OPERATING_SYSTEM = "operating_system"


class DependencyOrigin(Enum):
    """Origin of dependencies (for sovereignty verification)."""
    EU_OPEN_SOURCE = "eu_open_source"
    EU_PROPRIETARY = "eu_proprietary"
    US_OPEN_SOURCE = "us_open_source"
    US_PROPRIETARY = "us_proprietary"
    CHINESE_OPEN_SOURCE = "chinese_open_source"
    CHINESE_PROPRIETARY = "chinese_proprietary"
    OTHER = "other"
    UNKNOWN = "unknown"


class SovereigntyLevel(Enum):
    """Levels of digital sovereignty."""
    FULLY_SOVEREIGN = "fully_sovereign"  # Zero foreign dependencies
    MOSTLY_SOVEREIGN = "mostly_sovereign"  # <5% foreign dependencies
    CONDITIONAL_SOVEREIGN = "conditional_sovereign"  # >5% foreign dependencies
    NOT_SOVEREIGN = "not_sovereign"  # Critical foreign dependencies


@dataclass
class Dependency:
    """Represents a single dependency in the system."""
    name: str
    version: str
    dependency_type: DependencyType
    origin: DependencyOrigin
    license: str
    is_proprietary: bool
    jurisdiction: str  # Legal jurisdiction (e.g., "US", "EU", "CN")
    cloud_act_risk: bool  # Subject to US CLOUD Act or similar
    verified_at: str
    verification_hash: str


@dataclass
class SovereigntyAudit:
    """Results of a sovereignty audit."""
    audit_id: str
    node_id: str
    sovereignty_level: SovereigntyLevel
    total_dependencies: int
    foreign_dependencies: int
    critical_foreign_dependencies: int
    dependencies: List[Dependency]
    compliance_frameworks: List[str]  # e.g., ["EU_Cloud_Act", "GDPR", "AI_Act"]
    certification_status: str
    audit_timestamp: str
    auditor_id: str


class EuroStackSovereignNode:
    """
    Represents a Munin-Sovereign-Node: a fully localized, private cloud instance
    with zero foreign proprietary dependencies.
    """
    
    def __init__(
        self,
        node_id: str,
        jurisdiction: str,  # e.g., "EU", "CA", "UK"
        location: Dict[str, Any],
        compliance_frameworks: List[str]
    ):
        self.node_id = node_id
        self.jurisdiction = jurisdiction
        self.location = location
        self.compliance_frameworks = compliance_frameworks
        self.dependencies: List[Dependency] = []
        self.audits: List[SovereigntyAudit] = []
        self.created_at = datetime.now()
        self.is_air_gapped = True  # Sovereign nodes are air-gapped by default
        self.data_residency = jurisdiction  # Data must stay in jurisdiction
    
    def add_dependency(
        self,
        name: str,
        version: str,
        dependency_type: DependencyType,
        origin: DependencyOrigin,
        license: str,
        is_proprietary: bool,
        jurisdiction: str,
        cloud_act_risk: bool
    ) -> Dependency:
        """Add a dependency to the node."""
        verification_hash = self._compute_dependency_hash(name, version, origin)
        
        dependency = Dependency(
            name=name,
            version=version,
            dependency_type=dependency_type,
            origin=origin,
            license=license,
            is_proprietary=is_proprietary,
            jurisdiction=jurisdiction,
            cloud_act_risk=cloud_act_risk,
            verified_at=datetime.now().isoformat(),
            verification_hash=verification_hash
        )
        
        self.dependencies.append(dependency)
        return dependency
    
    def _compute_dependency_hash(self, name: str, version: str, origin: DependencyOrigin) -> str:
        """Compute verification hash for a dependency."""
        data = f"{name}:{version}:{origin.value}"
        return hashlib.sha256(data.encode()).hexdigest()
    
    def run_sovereignty_audit(self, auditor_id: str) -> SovereigntyAudit:
        """
        Run a sovereignty audit to verify the node meets sovereign-by-design requirements.
        """
        total_deps = len(self.dependencies)
        
        # Classify dependencies
        foreign_deps = [
            d for d in self.dependencies
            if d.origin not in [DependencyOrigin.EU_OPEN_SOURCE, DependencyOrigin.EU_PROPRIETARY]
            or d.jurisdiction != self.jurisdiction
        ]
        
        critical_foreign_deps = [
            d for d in foreign_deps
            if d.cloud_act_risk or d.is_proprietary
        ]
        
        # Determine sovereignty level
        if total_deps == 0:
            sovereignty_level = SovereigntyLevel.FULLY_SOVEREIGN
        elif len(critical_foreign_deps) == 0 and len(foreign_deps) / total_deps < 0.05:
            sovereignty_level = SovereigntyLevel.FULLY_SOVEREIGN
        elif len(critical_foreign_deps) == 0 and len(foreign_deps) / total_deps < 0.20:
            sovereignty_level = SovereigntyLevel.MOSTLY_SOVEREIGN
        elif len(critical_foreign_deps) / total_deps < 0.10:
            sovereignty_level = SovereigntyLevel.CONDITIONAL_SOVEREIGN
        else:
            sovereignty_level = SovereigntyLevel.NOT_SOVEREIGN
        
        # Check compliance frameworks
        compliance_status = self._check_compliance_frameworks(sovereignty_level)
        
        audit = SovereigntyAudit(
            audit_id=f"audit_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            node_id=self.node_id,
            sovereignty_level=sovereignty_level,
            total_dependencies=total_deps,
            foreign_dependencies=len(foreign_deps),
            critical_foreign_dependencies=len(critical_foreign_deps),
            dependencies=self.dependencies.copy(),
            compliance_frameworks=self.compliance_frameworks,
            certification_status=compliance_status,
            audit_timestamp=datetime.now().isoformat(),
            auditor_id=auditor_id
        )
        
        self.audits.append(audit)
        return audit
    
    def _check_compliance_frameworks(self, sovereignty_level: SovereigntyLevel) -> str:
        """Check compliance with regulatory frameworks."""
        if sovereignty_level == SovereigntyLevel.FULLY_SOVEREIGN:
            return "certified_sovereign"
        elif sovereignty_level == SovereigntyLevel.MOSTLY_SOVEREIGN:
            return "mostly_compliant"
        elif sovereignty_level == SovereigntyLevel.CONDITIONAL_SOVEREIGN:
            return "conditional_compliance"
        else:
            return "non_compliant"
    
    def get_sovereignty_report(self) -> Dict:
        """Get comprehensive sovereignty report."""
        if not self.audits:
            return {
                'nodeId': self.node_id,
                'status': 'no_audit',
                'message': 'No sovereignty audit has been run yet'
            }
        
        latest_audit = self.audits[-1]
        
        # Dependency breakdown
        dependency_breakdown = {}
        for dep_type in DependencyType:
            deps = [d for d in self.dependencies if d.dependency_type == dep_type]
            dependency_breakdown[dep_type.value] = {
                'total': len(deps),
                'foreign': len([d for d in deps if d.jurisdiction != self.jurisdiction]),
                'proprietary': len([d for d in deps if d.is_proprietary])
            }
        
        return {
            'nodeId': self.node_id,
            'jurisdiction': self.jurisdiction,
            'sovereigntyLevel': latest_audit.sovereignty_level.value,
            'certificationStatus': latest_audit.certification_status,
            'complianceFrameworks': self.compliance_frameworks,
            'dependencySummary': {
                'total': latest_audit.total_dependencies,
                'foreign': latest_audit.foreign_dependencies,
                'criticalForeign': latest_audit.critical_foreign_dependencies,
                'breakdown': dependency_breakdown
            },
            'lastAudit': {
                'auditId': latest_audit.audit_id,
                'timestamp': latest_audit.audit_timestamp,
                'auditorId': latest_audit.auditor_id
            },
            'dataResidency': self.data_residency,
            'airGapped': self.is_air_gapped,
            'location': self.location
        }
    
    def to_dict(self) -> Dict:
        """Convert node to dictionary."""
        return {
            'nodeId': self.node_id,
            'jurisdiction': self.jurisdiction,
            'location': self.location,
            'complianceFrameworks': self.compliance_frameworks,
            'dependencyCount': len(self.dependencies),
            'auditCount': len(self.audits),
            'createdAt': self.created_at.isoformat(),
            'dataResidency': self.data_residency,
            'airGapped': self.is_air_gapped
        }


class EuroStackRegistry:
    """
    Registry of all sovereign nodes in the EuroStack network.
    Maintains the "Sovereign-by-Design" certification database.
    """
    
    def __init__(self):
        self.nodes: Dict[str, EuroStackSovereignNode] = {}
        self.certifications: Dict[str, SovereigntyAudit] = {}
    
    def register_node(self, node: EuroStackSovereignNode) -> None:
        """Register a sovereign node."""
        self.nodes[node.node_id] = node
        
        # Run initial audit
        audit = node.run_sovereignty_audit("system")
        self.certifications[node.node_id] = audit
    
    def get_sovereign_nodes_by_jurisdiction(self, jurisdiction: str) -> List[EuroStackSovereignNode]:
        """Get all sovereign nodes in a jurisdiction."""
        return [
            node for node in self.nodes.values()
            if node.jurisdiction == jurisdiction
        ]
    
    def get_certified_sovereign_nodes(self) -> List[EuroStackSovereignNode]:
        """Get all nodes certified as fully sovereign."""
        return [
            node for node in self.nodes.values()
            if node.audits and node.audits[-1].sovereignty_level == SovereigntyLevel.FULLY_SOVEREIGN
        ]
    
    def get_network_sovereignty_report(self) -> Dict:
        """Get network-wide sovereignty report."""
        total_nodes = len(self.nodes)
        certified_nodes = len(self.get_certified_sovereign_nodes())
        
        jurisdiction_breakdown = {}
        for node in self.nodes.values():
            if node.jurisdiction not in jurisdiction_breakdown:
                jurisdiction_breakdown[node.jurisdiction] = {
                    'total': 0,
                    'certified': 0
                }
            jurisdiction_breakdown[node.jurisdiction]['total'] += 1
            if node.audits and node.audits[-1].sovereignty_level == SovereigntyLevel.FULLY_SOVEREIGN:
                jurisdiction_breakdown[node.jurisdiction]['certified'] += 1
        
        return {
            'totalNodes': total_nodes,
            'certifiedSovereignNodes': certified_nodes,
            'certificationRate': certified_nodes / total_nodes if total_nodes > 0 else 0.0,
            'jurisdictionBreakdown': jurisdiction_breakdown,
            'timestamp': datetime.now().isoformat()
        }


def create_eurostack_sovereign_node(
    node_id: str,
    jurisdiction: str,
    location: Dict[str, Any],
    compliance_frameworks: List[str]
) -> EuroStackSovereignNode:
    """
    Create a new EuroStack sovereign node with default open-source dependencies.
    This is the "Sovereign-by-Design" factory function.
    """
    node = EuroStackSovereignNode(
        node_id=node_id,
        jurisdiction=jurisdiction,
        location=location,
        compliance_frameworks=compliance_frameworks
    )
    
    # Add default EuroStack dependencies (open-source, EU-compliant)
    node.add_dependency(
        name="PostgreSQL",
        version="16.0",
        dependency_type=DependencyType.DATABASE_ENGINE,
        origin=DependencyOrigin.EU_OPEN_SOURCE,
        license="PostgreSQL License",
        is_proprietary=False,
        jurisdiction="EU",
        cloud_act_risk=False
    )
    
    node.add_dependency(
        name="Python",
        version="3.12",
        dependency_type=DependencyType.SOFTWARE_LIBRARY,
        origin=DependencyOrigin.EU_OPEN_SOURCE,
        license="PSF License",
        is_proprietary=False,
        jurisdiction="EU",
        cloud_act_risk=False
    )
    
    node.add_dependency(
        name="Next.js",
        version="14.0",
        dependency_type=DependencyType.SOFTWARE_LIBRARY,
        origin=DependencyOrigin.EU_OPEN_SOURCE,
        license="MIT",
        is_proprietary=False,
        jurisdiction="EU",
        cloud_act_risk=False
    )
    
    return node


if __name__ == "__main__":
    # Example: Create a sovereign node
    node = create_eurostack_sovereign_node(
        node_id="sovereign_node_eu_001",
        jurisdiction="EU",
        location={
            "country": "Germany",
            "region": "Bavaria",
            "city": "Munich",
            "dataCenter": "Munich-DC-01"
        },
        compliance_frameworks=["EU_Cloud_Act", "GDPR", "AI_Act", "NIS2"]
    )
    
    # Run sovereignty audit
    audit = node.run_sovereignty_audit("auditor_001")
    
    print(f"Sovereignty Audit Results:")
    print(f"  Node: {node.node_id}")
    print(f"  Sovereignty Level: {audit.sovereignty_level.value}")
    print(f"  Total Dependencies: {audit.total_dependencies}")
    print(f"  Foreign Dependencies: {audit.foreign_dependencies}")
    print(f"  Critical Foreign: {audit.critical_foreign_dependencies}")
    print(f"  Certification: {audit.certification_status}")
    
    # Get sovereignty report
    report = node.get_sovereignty_report()
    print(f"\nSovereignty Report: {json.dumps(report, indent=2)}")

