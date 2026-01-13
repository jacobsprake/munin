"""
Test Approval Workflow for Carlisle Flood Coordination
Simulates EA Duty Officer single tick-box approval process.
"""
import json
import sys
from pathlib import Path
from datetime import datetime
import hashlib
import time

# Add engine directory to path
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from byzantine_resilience import (
    ByzantineResilienceEngine,
    MinistryType,
    QuorumLogicController
)
from audit_log import get_audit_log


def load_packet(packet_path: Path) -> dict:
    """Load a handshake packet."""
    with open(packet_path, 'r') as f:
        return json.load(f)


def save_packet(packet_path: Path, packet: dict):
    """Save an updated handshake packet."""
    with open(packet_path, 'w') as f:
        json.dump(packet, f, indent=2)


def approve_packet(
    packet: dict,
    role: str,
    operator_id: str,
    timestamp: datetime = None
) -> dict:
    """
    Approve a packet with a single tick-box approval.
    
    Args:
        packet: Handshake packet dictionary
        role: Role of the approver (e.g., "EA Duty Officer")
        operator_id: ID of the operator approving
        timestamp: Approval timestamp (default: now)
    
    Returns:
        Updated packet dictionary
    """
    if timestamp is None:
        timestamp = datetime.now()
    
    # Find the approval entry for this role
    approval_found = False
    for approval in packet.get('approvals', []):
        if approval.get('role') == role:
            if approval.get('signedTs'):
                print(f"⚠️  Warning: {role} has already signed this packet")
                return packet
            
            # Add signature
            approval['signerId'] = operator_id
            approval['signedTs'] = timestamp.isoformat()
            approval['signatureHash'] = hashlib.sha256(
                f"{packet['id']}:{role}:{operator_id}:{timestamp.isoformat()}".encode()
            ).hexdigest()
            approval_found = True
            
            # Set firstApprovalTs if this is the first approval
            if packet.get('firstApprovalTs') is None:
                packet['firstApprovalTs'] = timestamp.isoformat()
            
            break
    
    if not approval_found:
        print(f"⚠️  Warning: Role '{role}' not found in approvals list")
        return packet
    
    # Update multi-sig count
    signed_count = sum(1 for a in packet.get('approvals', []) if a.get('signedTs'))
    if 'multiSig' in packet:
        packet['multiSig']['currentSignatures'] = signed_count
    
    # Check if threshold is met
    multi_sig = packet.get('multiSig', {})
    threshold = multi_sig.get('threshold', len(packet.get('approvals', [])))
    
    # Get audit log
    audit_log = get_audit_log(packets_dir.parent)
    
    if signed_count >= threshold:
        packet['status'] = 'authorized'
        # Set authorizedTs and calculate timeToAuthorize
        authorized_ts = datetime.now()
        packet['authorizedTs'] = authorized_ts.isoformat()
        
        # Calculate time to authorize
        created_ts = datetime.fromisoformat(packet['createdTs'].replace('Z', '+00:00'))
        if packet['createdTs'].endswith('Z'):
            created_ts = created_ts.replace(tzinfo=None)
        time_to_authorize = (authorized_ts - created_ts).total_seconds()
        packet['timeToAuthorize'] = time_to_authorize
        
        # Log authorization to audit log
        audit_log.append(
            action='authorize',
            actor=operator_id,
            packet_id=packet['id'],
            metadata={
                'signatures_received': signed_count,
                'threshold': threshold,
                'time_to_authorize': time_to_authorize,
                'authorized_at': authorized_ts.isoformat()
            }
        )
        
        print(f"✅ Packet authorized! {signed_count}/{threshold} signatures received")
        print(f"   ⏱️  Time to authorize: {time_to_authorize:.1f} seconds ({time_to_authorize/60:.2f} minutes)")
    else:
        # Log approval to audit log
        audit_log.append(
            action='approve',
            actor=operator_id,
            packet_id=packet['id'],
            metadata={
                'role': role,
                'signatures_received': signed_count,
                'threshold': threshold,
                'remaining': threshold - signed_count
            }
        )
        
        print(f"📝 Approval recorded: {signed_count}/{threshold} signatures (need {threshold - signed_count} more)")
    
    return packet


def test_carlisle_approval_workflow(packets_dir: Path):
    """
    Test the approval workflow for Carlisle flood coordination packets.
    """
    print("=" * 60)
    print("CARLISLE APPROVAL WORKFLOW TEST")
    print("=" * 60)
    
    # Find flood coordination packet
    flood_packets = list(packets_dir.glob("packet_incident_flood_*.json"))
    
    if not flood_packets:
        print("❌ No flood packets found")
        return
    
    packet_path = flood_packets[0]
    print(f"\n📦 Loading packet: {packet_path.name}")
    packet = load_packet(packet_path)
    
    print(f"\n📋 Packet Details:")
    print(f"   ID: {packet['id']}")
    print(f"   Status: {packet['status']}")
    print(f"   Playbook: {packet.get('playbookId', 'N/A')}")
    print(f"   Proposed Action: {packet.get('proposedAction', 'N/A')[:60]}...")
    
    # Show current approvals
    print(f"\n👥 Current Approvals:")
    for approval in packet.get('approvals', []):
        status = "✅ SIGNED" if approval.get('signedTs') else "⏳ PENDING"
        print(f"   - {approval.get('role', 'Unknown')}: {status}")
        if approval.get('signedTs'):
            print(f"     Signed by: {approval.get('signerId', 'N/A')}")
            print(f"     Signed at: {approval.get('signedTs', 'N/A')}")
    
    # Show multi-sig requirements
    multi_sig = packet.get('multiSig', {})
    byzantine = packet.get('byzantineMultiSig', {})
    print(f"\n🔐 Multi-Signature Requirements:")
    print(f"   Standard Multi-Sig: {multi_sig.get('currentSignatures', 0)}/{multi_sig.get('threshold', 0)}")
    print(f"   Byzantine Multi-Sig: {byzantine.get('currentSignatures', 0)}/{byzantine.get('threshold', 0)}")
    print(f"   Required Ministries: {', '.join(byzantine.get('requiredMinistries', []))}")
    
    # Test approval workflow
    print(f"\n" + "=" * 60)
    print("TESTING APPROVAL WORKFLOW")
    print("=" * 60)
    
    # Step 1: EA Duty Officer approval (single tick-box)
    # Note: The packet may have "Senior Operator" which maps to EA Duty Officer in playbook
    print(f"\n[Step 1] EA Duty Officer Approval (Single Tick-Box)")
    start_time = time.time()
    
    # Try EA Duty Officer first, fallback to Senior Operator
    role_to_use = "EA Duty Officer"
    if not any(a.get('role') == role_to_use for a in packet.get('approvals', [])):
        role_to_use = "Senior Operator"  # Fallback to what's in the packet
    
    packet = approve_packet(
        packet=packet,
        role=role_to_use,
        operator_id="ea_duty_officer_001"
    )
    
    approval_time = time.time() - start_time
    
    print(f"   ⏱️  Approval time: {approval_time:.3f} seconds")
    print(f"   📝 Status: {packet['status']}")
    
    # Check if authorized (for Carlisle, EA Duty Officer is minimum sign-off)
    # According to playbook: minimum_sign_off: true for EA Duty Officer
    if packet['status'] == 'authorized':
        print(f"\n✅ AUTHORIZED - Ready for execution!")
        print(f"   Time-to-authorize: {approval_time:.3f} seconds")
        print(f"   Target: < 2 minutes")
        print(f"   Baseline: 2-6 hours")
        print(f"   Improvement: {((2*3600 - approval_time) / (2*3600) * 100):.1f}% faster than 2-hour baseline")
    else:
        print(f"\n⏳ Still pending additional approvals")
        print(f"   Current: {multi_sig.get('currentSignatures', 0)}/{multi_sig.get('threshold', 0)}")
    
    # Save updated packet
    output_path = packet_path.parent / f"{packet_path.stem}_approved.json"
    save_packet(output_path, packet)
    print(f"\n💾 Updated packet saved to: {output_path.name}")
    
    # Show final status
    print(f"\n" + "=" * 60)
    print("FINAL STATUS")
    print("=" * 60)
    print(f"   Packet ID: {packet['id']}")
    print(f"   Status: {packet['status']}")
    print(f"   Approvals:")
    for approval in packet.get('approvals', []):
        if approval.get('signedTs'):
            print(f"     ✅ {approval.get('role')} - {approval.get('signerId')} at {approval.get('signedTs')}")
        else:
            print(f"     ⏳ {approval.get('role')} - PENDING")
    
    return packet


if __name__ == "__main__":
    script_dir = Path(__file__).parent
    packets_dir = script_dir / "out" / "carlisle_demo" / "packets"
    
    if not packets_dir.exists():
        print(f"❌ Packets directory not found: {packets_dir}")
        print("   Run carlisle_demo.py first to generate packets")
        sys.exit(1)
    
    test_carlisle_approval_workflow(packets_dir)
