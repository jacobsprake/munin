"""
Human-in-the-Loop Biometric Key: Sovereign Handshake Tablet
2026 Reality Feature: Identity Crisis Solution

To prevent "Remote Treason," high-consequence commands must be physically authorized.

The Product: The Sovereign Handshake Tablet
- A proprietary, air-gapped tablet that uses Multi-Factor Biometrics (Iris + Palm)
- Physical Security Token (FIPS 140-3)
- The ONLY device that can authorize an "Authoritative Handshake"

The Monopoly Edge: You've solved the Identity Crisis.
A hacker in a distant country can't authorize a disaster because they don't have
the physical, biometric "Key of the State."
"""

import json
import hashlib
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from enum import Enum
import uuid


class BiometricType(Enum):
    """Types of biometric authentication."""
    IRIS = "iris"
    PALM = "palm"
    FINGERPRINT = "fingerprint"
    FACE = "face"


class TokenStatus(Enum):
    """Status of the FIPS 140-3 security token."""
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"
    LOCKED = "locked"  # Too many failed attempts


class BiometricEnrollment:
    """Represents a biometric enrollment for an operator."""
    
    def __init__(
        self,
        operator_id: str,
        biometric_type: BiometricType,
        biometric_template: str,  # Encrypted biometric template
        enrolled_at: datetime
    ):
        self.operator_id = operator_id
        self.biometric_type = biometric_type
        self.biometric_template = biometric_template
        self.enrolled_at = enrolled_at
        self.last_used: Optional[datetime] = None
        self.match_count = 0
        self.failed_attempts = 0
    
    def to_dict(self) -> Dict:
        """Convert enrollment to dictionary (without sensitive template)."""
        return {
            'operatorId': self.operator_id,
            'biometricType': self.biometric_type.value,
            'enrolledAt': self.enrolled_at.isoformat(),
            'lastUsed': self.last_used.isoformat() if self.last_used else None,
            'matchCount': self.match_count,
            'failedAttempts': self.failed_attempts
        }


class SecurityToken:
    """Represents a FIPS 140-3 compliant security token."""
    
    def __init__(
        self,
        token_id: str,
        operator_id: str,
        serial_number: str
    ):
        self.token_id = token_id
        self.operator_id = operator_id
        self.serial_number = serial_number
        self.status = TokenStatus.ACTIVE
        self.issued_at = datetime.now()
        self.expires_at = datetime.now() + timedelta(days=365)  # 1 year validity
        self.pin_hash: Optional[str] = None
        self.failed_pin_attempts = 0
        self.max_pin_attempts = 3
    
    def set_pin(self, pin: str) -> None:
        """Set the PIN for the token."""
        self.pin_hash = hashlib.sha256(pin.encode()).hexdigest()
    
    def verify_pin(self, pin: str) -> bool:
        """Verify the PIN."""
        if self.status != TokenStatus.ACTIVE:
            return False
        
        if self.pin_hash is None:
            return False
        
        pin_hash = hashlib.sha256(pin.encode()).hexdigest()
        if pin_hash == self.pin_hash:
            self.failed_pin_attempts = 0
            return True
        else:
            self.failed_pin_attempts += 1
            if self.failed_pin_attempts >= self.max_pin_attempts:
                self.status = TokenStatus.LOCKED
            return False
    
    def to_dict(self) -> Dict:
        """Convert token to dictionary."""
        return {
            'tokenId': self.token_id,
            'operatorId': self.operator_id,
            'serialNumber': self.serial_number,
            'status': self.status.value,
            'issuedAt': self.issued_at.isoformat(),
            'expiresAt': self.expires_at.isoformat()
        }


class SovereignHandshakeTablet:
    """
    Represents the Sovereign Handshake Tablet - the only device that can
    authorize high-consequence commands.
    """
    
    def __init__(
        self,
        tablet_id: str,
        serial_number: str,
        location: Dict[str, Any]
    ):
        self.tablet_id = tablet_id
        self.serial_number = serial_number
        self.location = location
        self.is_air_gapped = True  # Always air-gapped
        self.is_online = False  # Never connected to internet
        self.biometric_enrollments: Dict[str, List[BiometricEnrollment]] = {}  # operator_id -> enrollments
        self.tokens: Dict[str, SecurityToken] = {}  # token_id -> token
        self.authorization_history: List[Dict] = []
        self.created_at = datetime.now()
    
    def enroll_biometric(
        self,
        operator_id: str,
        biometric_type: BiometricType,
        biometric_data: str  # In production, this would be encrypted template
    ) -> Dict:
        """
        Enroll a biometric for an operator.
        In production, biometric_data would be an encrypted template.
        """
        if operator_id not in self.biometric_enrollments:
            self.biometric_enrollments[operator_id] = []
        
        # Check if already enrolled for this type
        existing = next(
            (e for e in self.biometric_enrollments[operator_id]
             if e.biometric_type == biometric_type),
            None
        )
        
        if existing:
            raise ValueError(f"Biometric {biometric_type.value} already enrolled for {operator_id}")
        
        # Create enrollment
        enrollment = BiometricEnrollment(
            operator_id=operator_id,
            biometric_type=biometric_type,
            biometric_template=biometric_data,  # In production, encrypt this
            enrolled_at=datetime.now()
        )
        
        self.biometric_enrollments[operator_id].append(enrollment)
        
        return {
            'status': 'enrolled',
            'operatorId': operator_id,
            'biometricType': biometric_type.value,
            'enrolledAt': enrollment.enrolled_at.isoformat()
        }
    
    def verify_biometric(
        self,
        operator_id: str,
        biometric_type: BiometricType,
        biometric_data: str
    ) -> Dict:
        """
        Verify a biometric match.
        In production, this would use actual biometric matching algorithms.
        """
        if operator_id not in self.biometric_enrollments:
            return {'match': False, 'reason': 'operator_not_enrolled'}
        
        enrollment = next(
            (e for e in self.biometric_enrollments[operator_id]
             if e.biometric_type == biometric_type),
            None
        )
        
        if not enrollment:
            return {'match': False, 'reason': 'biometric_type_not_enrolled'}
        
        # In production, use actual biometric matching
        # For demo, we'll do a simple hash comparison
        template_hash = hashlib.sha256(enrollment.biometric_template.encode()).hexdigest()
        provided_hash = hashlib.sha256(biometric_data.encode()).hexdigest()
        
        match = template_hash == provided_hash
        
        if match:
            enrollment.last_used = datetime.now()
            enrollment.match_count += 1
            enrollment.failed_attempts = 0
        else:
            enrollment.failed_attempts += 1
        
        return {
            'match': match,
            'operatorId': operator_id,
            'biometricType': biometric_type.value,
            'confidence': 0.99 if match else 0.0,
            'failedAttempts': enrollment.failed_attempts
        }
    
    def issue_token(
        self,
        operator_id: str,
        serial_number: str,
        pin: str
    ) -> SecurityToken:
        """Issue a FIPS 140-3 security token to an operator."""
        token_id = str(uuid.uuid4())
        token = SecurityToken(
            token_id=token_id,
            operator_id=operator_id,
            serial_number=serial_number
        )
        token.set_pin(pin)
        
        self.tokens[token_id] = token
        
        return token
    
    def verify_token(
        self,
        token_id: str,
        pin: str
    ) -> Dict:
        """Verify a security token and PIN."""
        if token_id not in self.tokens:
            return {'valid': False, 'reason': 'token_not_found'}
        
        token = self.tokens[token_id]
        
        if token.status != TokenStatus.ACTIVE:
            return {'valid': False, 'reason': f'token_{token.status.value}'}
        
        if datetime.now() > token.expires_at:
            token.status = TokenStatus.EXPIRED
            return {'valid': False, 'reason': 'token_expired'}
        
        pin_valid = token.verify_pin(pin)
        
        return {
            'valid': pin_valid,
            'tokenId': token_id,
            'operatorId': token.operator_id,
            'status': token.status.value,
            'reason': None if pin_valid else 'invalid_pin'
        }
    
    def authorize_handshake(
        self,
        packet_id: str,
        operator_id: str,
        iris_data: str,
        palm_data: str,
        token_id: str,
        token_pin: str
    ) -> Dict:
        """
        Authorize an Authoritative Handshake using multi-factor authentication.
        This is the ONLY way to authorize high-consequence commands.
        """
        # Step 1: Verify iris biometric
        iris_verify = self.verify_biometric(operator_id, BiometricType.IRIS, iris_data)
        if not iris_verify['match']:
            return {
                'authorized': False,
                'reason': 'iris_verification_failed',
                'packetId': packet_id
            }
        
        # Step 2: Verify palm biometric
        palm_verify = self.verify_biometric(operator_id, BiometricType.PALM, palm_data)
        if not palm_verify['match']:
            return {
                'authorized': False,
                'reason': 'palm_verification_failed',
                'packetId': packet_id
            }
        
        # Step 3: Verify security token
        token_verify = self.verify_token(token_id, token_pin)
        if not token_verify['valid']:
            return {
                'authorized': False,
                'reason': f'token_verification_failed: {token_verify.get("reason")}',
                'packetId': packet_id
            }
        
        # Step 4: Verify token belongs to operator
        if token_verify['operatorId'] != operator_id:
            return {
                'authorized': False,
                'reason': 'token_operator_mismatch',
                'packetId': packet_id
            }
        
        # All factors verified - authorization granted
        authorization = {
            'authorized': True,
            'packetId': packet_id,
            'operatorId': operator_id,
            'authorizedAt': datetime.now().isoformat(),
            'tabletId': self.tablet_id,
            'tabletSerialNumber': self.serial_number,
            'location': self.location,
            'authenticationFactors': {
                'iris': {'verified': True, 'confidence': iris_verify['confidence']},
                'palm': {'verified': True, 'confidence': palm_verify['confidence']},
                'token': {'verified': True, 'tokenId': token_id}
            },
            'signature': self._generate_authorization_signature(
                packet_id, operator_id, token_id
            )
        }
        
        # Record in authorization history
        self.authorization_history.append(authorization)
        
        return authorization
    
    def _generate_authorization_signature(
        self,
        packet_id: str,
        operator_id: str,
        token_id: str
    ) -> str:
        """Generate cryptographic signature for authorization."""
        signature_data = f"{packet_id}:{operator_id}:{token_id}:{self.tablet_id}:{datetime.now().isoformat()}"
        signature = hashlib.sha256(signature_data.encode()).hexdigest()
        return signature
    
    def get_status(self) -> Dict:
        """Get tablet status."""
        return {
            'tabletId': self.tablet_id,
            'serialNumber': self.serial_number,
            'location': self.location,
            'isAirGapped': self.is_air_gapped,
            'isOnline': self.is_online,
            'enrolledOperators': len(self.biometric_enrollments),
            'issuedTokens': len(self.tokens),
            'authorizationCount': len(self.authorization_history),
            'createdAt': self.created_at.isoformat()
        }
    
    def to_dict(self) -> Dict:
        """Convert tablet to dictionary."""
        return {
            'tabletId': self.tablet_id,
            'serialNumber': self.serial_number,
            'location': self.location,
            'status': self.get_status(),
            'enrollments': {
                op_id: [e.to_dict() for e in enrollments]
                for op_id, enrollments in self.biometric_enrollments.items()
            },
            'tokens': {
                token_id: token.to_dict()
                for token_id, token in self.tokens.items()
            },
            'recentAuthorizations': self.authorization_history[-10:]  # Last 10
        }


def create_tablet(
    serial_number: str,
    location: Dict[str, Any]
) -> SovereignHandshakeTablet:
    """Create a new Sovereign Handshake Tablet."""
    tablet_id = f"tablet_{serial_number}"
    tablet = SovereignHandshakeTablet(
        tablet_id=tablet_id,
        serial_number=serial_number,
        location=location
    )
    return tablet


if __name__ == "__main__":
    # Example usage
    location = {
        'name': 'Control Room Alpha',
        'facility': 'Substation North 01',
        'lat': 40.7128,
        'lon': -74.0060
    }
    
    tablet = create_tablet("TABLET-001", location)
    
    # Enroll operator
    operator_id = "OP-001"
    tablet.enroll_biometric(operator_id, BiometricType.IRIS, "iris_template_data")
    tablet.enroll_biometric(operator_id, BiometricType.PALM, "palm_template_data")
    
    # Issue token
    token = tablet.issue_token(operator_id, "TOKEN-SN-001", "1234")
    
    # Authorize handshake
    authorization = tablet.authorize_handshake(
        packet_id="packet_001",
        operator_id=operator_id,
        iris_data="iris_template_data",
        palm_data="palm_template_data",
        token_id=token.token_id,
        token_pin="1234"
    )
    
    print(json.dumps(authorization, indent=2))
    print(f"\nTablet status: {json.dumps(tablet.get_status(), indent=2)}")

