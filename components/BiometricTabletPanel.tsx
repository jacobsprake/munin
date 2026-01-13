'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Tablet, Eye, Hand, Key, Shield } from 'lucide-react';

interface TabletStatus {
  tabletId: string;
  serialNumber: string;
  isAirGapped: boolean;
  enrolledOperators: number;
  issuedTokens: number;
  authorizationCount: number;
}

export default function BiometricTabletPanel() {
  const [tabletStatus, setTabletStatus] = useState<TabletStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authData, setAuthData] = useState({
    packetId: '',
    operatorId: '',
    irisData: '',
    palmData: '',
    tokenId: '',
    tokenPin: ''
  });

  useEffect(() => {
    loadTabletStatus();
  }, []);

  const loadTabletStatus = async () => {
    try {
      const response = await fetch('/api/sovereign/tablet?tabletId=TABLET-001&action=status');
      const data = await response.json();
      
      if (data.status === 'ok') {
        setTabletStatus(data.tablet.status);
      }
    } catch (error) {
      console.error('Failed to load tablet status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async () => {
    try {
      const response = await fetch('/api/sovereign/tablet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'authorize_handshake',
          ...authData
        })
      });

      const result = await response.json();
      
      if (result.status === 'ok' && result.authorization?.authorized) {
        alert('Handshake authorized successfully!');
        setShowAuthModal(false);
        setAuthData({
          packetId: '',
          operatorId: '',
          irisData: '',
          palmData: '',
          tokenId: '',
          tokenPin: ''
        });
        loadTabletStatus();
      } else {
        alert('Authorization failed: ' + (result.error || 'Invalid credentials'));
      }
    } catch (error) {
      console.error('Failed to authorize:', error);
      alert('Authorization failed');
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="text-text-muted">Loading tablet status...</div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Tablet className="w-5 h-5 text-safety-amber" />
        <h3 className="text-panel-title mono font-semibold text-text-primary">
          SOVEREIGN HANDSHAKE TABLET
        </h3>
      </div>

      <div className="text-body mono text-text-secondary">
        The ONLY device that can authorize high-consequence commands. Uses
        Multi-Factor Biometrics (Iris + Palm) and FIPS 140-3 Security Token.
        Prevents remote sabotage - hackers can't authorize disasters without
        the physical, biometric "Key of the State."
      </div>

      {tabletStatus ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-base-800 rounded border border-base-700">
            <div className="text-xs font-mono text-text-muted mb-1">ENROLLED OPERATORS</div>
            <div className="text-lg font-mono text-text-primary">{tabletStatus.enrolledOperators}</div>
          </div>
          <div className="p-3 bg-base-800 rounded border border-base-700">
            <div className="text-xs font-mono text-text-muted mb-1">ISSUED TOKENS</div>
            <div className="text-lg font-mono text-safety-cobalt">{tabletStatus.issuedTokens}</div>
          </div>
          <div className="p-3 bg-base-800 rounded border border-base-700">
            <div className="text-xs font-mono text-text-muted mb-1">AUTHORIZATIONS</div>
            <div className="text-lg font-mono text-safety-emerald">{tabletStatus.authorizationCount}</div>
          </div>
          <div className="p-3 bg-base-800 rounded border border-base-700">
            <div className="text-xs font-mono text-text-muted mb-1">AIR-GAPPED</div>
            <div className="text-lg font-mono text-safety-emerald">
              {tabletStatus.isAirGapped ? 'YES' : 'NO'}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-base-800 rounded border border-base-700">
          <div className="text-sm font-mono text-text-muted">
            Tablet not initialized. This is the physical device that authorizes
            Authoritative Handshakes.
          </div>
        </div>
      )}

      <div className="p-3 bg-base-800 rounded border border-safety-amber/30">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-safety-amber" />
          <div className="text-label mono text-safety-amber">MULTI-FACTOR AUTHENTICATION</div>
        </div>
        <div className="space-y-2 text-xs font-mono text-text-secondary">
          <div className="flex items-center gap-2">
            <Eye className="w-3 h-3 text-safety-emerald" />
            <span>Iris Biometric Verification</span>
          </div>
          <div className="flex items-center gap-2">
            <Hand className="w-3 h-3 text-safety-emerald" />
            <span>Palm Biometric Verification</span>
          </div>
          <div className="flex items-center gap-2">
            <Key className="w-3 h-3 text-safety-emerald" />
            <span>FIPS 140-3 Security Token + PIN</span>
          </div>
        </div>
      </div>

      <Button
        variant="secondary"
        onClick={() => setShowAuthModal(true)}
      >
        Authorize Handshake
      </Button>

      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-base-900 border border-base-700 rounded p-6 w-96 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-mono font-semibold text-text-primary mb-4 uppercase">
              SOVEREIGN HANDSHAKE AUTHORIZATION
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-text-muted font-mono mb-1">
                  PACKET ID
                </label>
                <input
                  type="text"
                  value={authData.packetId}
                  onChange={(e) => setAuthData({ ...authData, packetId: e.target.value })}
                  className="w-full px-3 py-2 bg-base-800 border border-base-700 text-text-primary font-mono text-sm rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted font-mono mb-1">
                  OPERATOR ID
                </label>
                <input
                  type="text"
                  value={authData.operatorId}
                  onChange={(e) => setAuthData({ ...authData, operatorId: e.target.value })}
                  className="w-full px-3 py-2 bg-base-800 border border-base-700 text-text-primary font-mono text-sm rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted font-mono mb-1">
                  IRIS BIOMETRIC DATA
                </label>
                <input
                  type="text"
                  value={authData.irisData}
                  onChange={(e) => setAuthData({ ...authData, irisData: e.target.value })}
                  className="w-full px-3 py-2 bg-base-800 border border-base-700 text-text-primary font-mono text-sm rounded"
                  placeholder="Iris scan data"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted font-mono mb-1">
                  PALM BIOMETRIC DATA
                </label>
                <input
                  type="text"
                  value={authData.palmData}
                  onChange={(e) => setAuthData({ ...authData, palmData: e.target.value })}
                  className="w-full px-3 py-2 bg-base-800 border border-base-700 text-text-primary font-mono text-sm rounded"
                  placeholder="Palm scan data"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted font-mono mb-1">
                  TOKEN ID
                </label>
                <input
                  type="text"
                  value={authData.tokenId}
                  onChange={(e) => setAuthData({ ...authData, tokenId: e.target.value })}
                  className="w-full px-3 py-2 bg-base-800 border border-base-700 text-text-primary font-mono text-sm rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted font-mono mb-1">
                  TOKEN PIN
                </label>
                <input
                  type="password"
                  value={authData.tokenPin}
                  onChange={(e) => setAuthData({ ...authData, tokenPin: e.target.value })}
                  className="w-full px-3 py-2 bg-base-800 border border-base-700 text-text-primary font-mono text-sm rounded"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowAuthModal(false)}
                  className="flex-1"
                >
                  CANCEL
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleAuthorize}
                  className="flex-1"
                >
                  AUTHORIZE
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}


