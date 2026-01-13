"""
Liability Shield: Statutory Compliance Mapping
Legal-as-a-Service

The person in the control room doesn't care about "AI"; they care about
NOT GOING TO JAIL if something breaks.

Munin's "Playbooks" are not just technical instructions; they are linked
to specific National Emergency Laws. When the human hits the "Handshake,"
Munin generates a legal certificate: "This action was performed in
accordance with Article 4 of the National Water Act."

You aren't just selling software; you are selling Legal Protection.
You become the "Insurance Policy" for every bureaucrat in the country.
"""

import json
import yaml
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
from dataclasses import dataclass, asdict


@dataclass
class StatutoryReference:
    """Reference to a specific law, act, or regulation."""
    act_name: str
    section: str
    article: Optional[str] = None
    subsection: Optional[str] = None
    requirement: str = ""
    jurisdiction: str = "national"  # national, state, local


@dataclass
class ComplianceCertificate:
    """Legal certificate proving compliance with statutory requirements."""
    certificate_id: str
    issued: datetime
    action_id: str
    playbook_id: str
    statutory_basis: List[StatutoryReference]
    compliance_status: str  # 'compliant', 'partially_compliant', 'non_compliant'
    legal_protection_level: str  # 'full', 'partial', 'none'
    certificate_statement: str
    authorized_by: Optional[str] = None


# Library of National Emergency Laws by jurisdiction
NATIONAL_EMERGENCY_LAWS = {
    'water': {
        'acts': [
            {
                'name': 'National Water Act',
                'year': 2026,
                'sections': {
                    '4.2': {
                        'title': 'Emergency Response Authority',
                        'requirement': 'Authorized personnel may take necessary actions to prevent water system failure during declared emergencies',
                        'protection_level': 'full',
                    },
                    '4.3': {
                        'title': 'Inter-Agency Coordination',
                        'requirement': 'Water authorities must coordinate with emergency services during crisis events',
                        'protection_level': 'full',
                    },
                }
            },
            {
                'name': 'Flood Resilience Act',
                'year': 2026,
                'sections': {
                    '4.2': {
                        'title': 'Service Continuity During Floods',
                        'requirement': 'Maintain service continuity during declared flood emergencies',
                        'protection_level': 'full',
                    },
                }
            },
        ]
    },
    'power': {
        'acts': [
            {
                'name': 'NERC Reliability Standards',
                'year': 2026,
                'sections': {
                    'EOP-011': {
                        'title': 'Emergency Operations',
                        'requirement': 'Maintain frequency within operational limits and coordinate with regional operators',
                        'protection_level': 'full',
                    },
                }
            },
            {
                'name': 'Grid Stability Protocols',
                'year': 2026,
                'sections': {
                    'GSP-2026-02': {
                        'title': 'Load Shedding Procedures',
                        'requirement': 'Document all load shedding actions and restoration procedures',
                        'protection_level': 'full',
                    },
                }
            },
        ]
    },
    'telecom': {
        'acts': [
            {
                'name': 'Critical Communications Act',
                'year': 2026,
                'sections': {
                    '3.1': {
                        'title': 'Emergency Communications Priority',
                        'requirement': 'Critical infrastructure communications must be prioritized during emergencies',
                        'protection_level': 'full',
                    },
                }
            },
        ]
    },
}


class LiabilityShield:
    """
    Generates legal certificates and compliance mappings for Munin actions.
    Provides "Legal Protection" for operators who authorize Munin actions.
    """
    
    def __init__(self, jurisdiction: str = 'national'):
        self.jurisdiction = jurisdiction
        self.certificates_issued: List[ComplianceCertificate] = []
        self.statutory_library = NATIONAL_EMERGENCY_LAWS
    
    def map_playbook_to_statutes(
        self,
        playbook: Dict[str, Any],
        incident_type: str
    ) -> List[StatutoryReference]:
        """
        Map a playbook to relevant statutory requirements.
        Links technical playbooks to legal authority.
        """
        statutory_refs = []
        
        # Check playbook's regulatory_compliance section
        if 'regulatory_compliance' in playbook:
            for compliance_item in playbook['regulatory_compliance']:
                act_name = compliance_item.get('act', '')
                section = compliance_item.get('section', '')
                requirement = compliance_item.get('requirement', '')
                
                # Extract article if present (e.g., "Article 4, Section 2")
                article = None
                if 'Article' in section or 'article' in section:
                    # Parse article number
                    parts = section.split()
                    for i, part in enumerate(parts):
                        if part.lower() in ['article', 'art'] and i + 1 < len(parts):
                            article = parts[i + 1].rstrip(',')
                            break
                
                ref = StatutoryReference(
                    act_name=act_name,
                    section=section,
                    article=article,
                    requirement=requirement,
                    jurisdiction=self.jurisdiction
                )
                statutory_refs.append(ref)
        
        # Also check sector-specific laws
        sector = self._infer_sector_from_incident(incident_type)
        if sector in self.statutory_library:
            for act in self.statutory_library[sector]['acts']:
                # Add default statutory references for the sector
                for section_key, section_data in act.get('sections', {}).items():
                    ref = StatutoryReference(
                        act_name=act['name'],
                        section=section_key,
                        requirement=section_data.get('requirement', ''),
                        jurisdiction=self.jurisdiction
                    )
                    statutory_refs.append(ref)
        
        return statutory_refs
    
    def generate_compliance_certificate(
        self,
        action_id: str,
        playbook_id: str,
        playbook: Dict[str, Any],
        incident_type: str,
        authorized_by: Optional[str] = None
    ) -> ComplianceCertificate:
        """
        Generate a legal compliance certificate for a Munin action.
        This is the "Insurance Policy" for the operator.
        """
        # Map playbook to statutory requirements
        statutory_refs = self.map_playbook_to_statutes(playbook, incident_type)
        
        # Determine compliance status
        compliance_status = 'compliant' if statutory_refs else 'partially_compliant'
        
        # Determine legal protection level
        protection_levels = []
        for ref in statutory_refs:
            # Look up protection level from statutory library
            sector = self._infer_sector_from_incident(incident_type)
            if sector in self.statutory_library:
                for act in self.statutory_library[sector]['acts']:
                    if act['name'] == ref.act_name:
                        section_data = act.get('sections', {}).get(ref.section, {})
                        protection_levels.append(section_data.get('protection_level', 'partial'))
        
        legal_protection_level = 'full' if 'full' in protection_levels else ('partial' if protection_levels else 'none')
        
        # Generate certificate statement
        certificate_statement = self._generate_certificate_statement(
            statutory_refs, playbook, incident_type
        )
        
        certificate = ComplianceCertificate(
            certificate_id=f"cert_{action_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            issued=datetime.now(),
            action_id=action_id,
            playbook_id=playbook_id,
            statutory_basis=statutory_refs,
            compliance_status=compliance_status,
            legal_protection_level=legal_protection_level,
            certificate_statement=certificate_statement,
            authorized_by=authorized_by
        )
        
        self.certificates_issued.append(certificate)
        return certificate
    
    def _generate_certificate_statement(
        self,
        statutory_refs: List[StatutoryReference],
        playbook: Dict[str, Any],
        incident_type: str
    ) -> str:
        """Generate the legal certificate statement."""
        if not statutory_refs:
            return (
                "This action was performed in accordance with general emergency "
                "response protocols. Specific statutory compliance verification pending."
            )
        
        # Build statement from statutory references
        ref_statements = []
        for ref in statutory_refs:
            if ref.article:
                statement = f"Article {ref.article}, {ref.section} of the {ref.act_name}"
            else:
                statement = f"{ref.section} of the {ref.act_name}"
            
            if ref.requirement:
                statement += f": {ref.requirement}"
            
            ref_statements.append(statement)
        
        main_statement = (
            f"This action was performed in accordance with {', '.join(ref_statements[:2])}. "
            f"The authorized operator is protected under the statutory framework for "
            f"emergency response actions during declared {incident_type} incidents."
        )
        
        return main_statement
    
    def _infer_sector_from_incident(self, incident_type: str) -> str:
        """Infer sector from incident type."""
        type_to_sector = {
            'flood': 'water',
            'drought': 'water',
            'power_instability': 'power',
            'grid_failure': 'power',
            'communication_outage': 'telecom',
        }
        return type_to_sector.get(incident_type, 'other')
    
    def enhance_handshake_with_compliance(
        self,
        handshake_packet: Dict[str, Any],
        playbook: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Enhance a handshake packet with statutory compliance information.
        This adds the "Legal Protection" layer to the handshake.
        """
        incident_type = handshake_packet.get('situationSummary', '').lower()
        if 'flood' in incident_type:
            incident_type = 'flood'
        elif 'drought' in incident_type:
            incident_type = 'drought'
        elif 'power' in incident_type:
            incident_type = 'power_instability'
        else:
            incident_type = 'unknown'
        
        # Generate compliance certificate
        certificate = self.generate_compliance_certificate(
            action_id=handshake_packet['id'],
            playbook_id=handshake_packet.get('playbookId', 'unknown'),
            playbook=playbook,
            incident_type=incident_type,
            authorized_by=handshake_packet.get('approvals', [{}])[0].get('signerId')
        )
        
        # Add compliance information to handshake
        handshake_packet['statutoryCompliance'] = {
            'certificateId': certificate.certificate_id,
            'issued': certificate.issued.isoformat(),
            'complianceStatus': certificate.compliance_status,
            'legalProtectionLevel': certificate.legal_protection_level,
            'certificateStatement': certificate.certificate_statement,
            'statutoryBasis': [
                {
                    'actName': ref.act_name,
                    'section': ref.section,
                    'article': ref.article,
                    'requirement': ref.requirement,
                }
                for ref in certificate.statutory_basis
            ],
        }
        
        # Enhance regulatory basis with specific statutory references
        if certificate.statutory_basis:
            statutory_text = ', '.join([
                f"{ref.act_name}, {ref.section}" for ref in certificate.statutory_basis[:3]
            ])
            handshake_packet['regulatoryBasis'] = (
                f"{handshake_packet.get('regulatoryBasis', '')} "
                f"Statutory compliance: {statutory_text}."
            ).strip()
        
        return handshake_packet
    
    def generate_liability_report(self) -> Dict[str, Any]:
        """Generate report showing all compliance certificates issued."""
        report = {
            'version': '1.0',
            'generated': datetime.now().isoformat(),
            'jurisdiction': self.jurisdiction,
            'summary': {
                'total_certificates_issued': len(self.certificates_issued),
                'compliant_actions': len([c for c in self.certificates_issued if c.compliance_status == 'compliant']),
                'full_protection_actions': len([c for c in self.certificates_issued if c.legal_protection_level == 'full']),
            },
            'certificates': [
                {
                    'certificateId': c.certificate_id,
                    'issued': c.issued.isoformat(),
                    'actionId': c.action_id,
                    'playbookId': c.playbook_id,
                    'complianceStatus': c.compliance_status,
                    'legalProtectionLevel': c.legal_protection_level,
                    'statutoryBasis': [
                        {
                            'actName': ref.act_name,
                            'section': ref.section,
                            'article': ref.article,
                        }
                        for ref in c.statutory_basis
                    ],
                }
                for c in self.certificates_issued
            ],
        }
        
        return report


def load_statutory_library(library_path: Path) -> Dict[str, Any]:
    """Load statutory compliance library from YAML file."""
    if library_path.exists():
        with open(library_path, 'r') as f:
            return yaml.safe_load(f)
    return NATIONAL_EMERGENCY_LAWS


if __name__ == "__main__":
    # Example: Generate compliance certificate
    shield = LiabilityShield(jurisdiction='national')
    
    # Load a playbook
    playbook = {
        'id': 'flood_event_pump_isolation',
        'regulatory_compliance': [
            {
                'act': '2026 Flood Resilience Act',
                'section': 'Section 4.2',
                'requirement': 'Maintain service continuity during declared flood emergencies',
            },
            {
                'act': 'Water Quality Protection Standards',
                'section': 'WQP-2026-01',
                'requirement': 'Isolate affected systems to prevent contamination spread',
            },
        ]
    }
    
    # Generate certificate
    certificate = shield.generate_compliance_certificate(
        action_id='action_001',
        playbook_id='flood_event_pump_isolation',
        playbook=playbook,
        incident_type='flood',
        authorized_by='operator_001'
    )
    
    print(f"Certificate ID: {certificate.certificate_id}")
    print(f"Compliance Status: {certificate.compliance_status}")
    print(f"Legal Protection: {certificate.legal_protection_level}")
    print(f"\nCertificate Statement:\n{certificate.certificate_statement}")


