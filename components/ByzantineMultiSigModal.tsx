'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Shield, CheckCircle2, XCircle } from 'lucide-react';

interface MinistrySignature {
  id: string;
  name: string;
  role: string;
  signed: boolean;
  timestamp?: string;
}

interface ByzantineMultiSigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthorize: () => void;
  requiredSignatures?: number;
  totalSignatures?: number;
}

export default function ByzantineMultiSigModal({
  isOpen,
  onClose,
  onAuthorize,
  requiredSignatures = 2,
  totalSignatures = 3,
}: ByzantineMultiSigModalProps) {
  const [ministries, setMinistries] = useState<MinistrySignature[]>([
    { id: 'water', name: 'MINISTRY OF WATER', role: 'Primary Authority', signed: false },
    { id: 'grid', name: 'GRID OPS', role: 'Infrastructure Coordination', signed: false },
    { id: 'defense', name: 'CIVIL DEFENSE', role: 'Emergency Response', signed: false },
  ]);

  const signedCount = ministries.filter(m => m.signed).length;
  const canProceed = signedCount >= requiredSignatures;

  const handleSign = (id: string) => {
    setMinistries(prev => prev.map(m => 
      m.id === id 
        ? { ...m, signed: true, timestamp: new Date().toISOString() }
        : m
    ));
  };

  const handleAuthorize = () => {
    if (canProceed) {
      onAuthorize();
      onClose();
    }
  };

  const handleReset = () => {
    setMinistries(prev => prev.map(m => ({ ...m, signed: false, timestamp: undefined })));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="COMMAND AUTHORIZATION">
      <div className="space-y-6">
        <div className="p-4 bg-base-800 rounded border border-base-700">
          <div className="text-label mono text-text-primary mb-2">
            BYZANTINE FAULT TOLERANCE QUORUM
          </div>
          <div className="text-body-mono mono text-text-secondary">
            {requiredSignatures} of {totalSignatures} signatures required to authorize command.
            System will reject commands if {totalSignatures - requiredSignatures + 1} or more ministries are compromised.
          </div>
        </div>

        <div className="space-y-3">
          {ministries.map((ministry) => (
            <div
              key={ministry.id}
              className={`p-4 rounded border transition-all ${
                ministry.signed
                  ? 'bg-safety-emerald/10 border-safety-emerald/50'
                  : 'bg-base-800 border-base-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {ministry.signed ? (
                    <CheckCircle2 className="w-5 h-5 text-safety-emerald" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-base-600" />
                  )}
                  <div>
                    <div className="text-label mono text-text-primary">
                      {ministry.name}
                    </div>
                    <div className="text-body-mono mono text-text-muted">
                      {ministry.role}
                    </div>
                  </div>
                </div>
                {!ministry.signed && (
                  <Button
                    onClick={() => handleSign(ministry.id)}
                    variant="secondary"
                    className="text-xs"
                  >
                    SIGN
                  </Button>
                )}
              </div>
              {ministry.signed && ministry.timestamp && (
                <div className="mt-2 pt-2 border-t border-base-700">
                  <div className="text-body-mono mono text-text-muted">
                    Signed: {new Date(ministry.timestamp).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 bg-base-800 rounded border border-base-700">
          <div className="flex items-center justify-between mb-2">
            <div className="text-label mono text-text-primary">
              QUORUM STATUS
            </div>
            <div className={`text-body-mono mono font-bold ${
              canProceed ? 'text-safety-emerald' : 'text-safety-amber'
            }`}>
              {signedCount} / {requiredSignatures} SIGNATURES
            </div>
          </div>
          <div className="w-full bg-base-900 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full transition-all ${
                canProceed ? 'bg-safety-emerald' : 'bg-safety-amber'
              }`}
              style={{ width: `${(signedCount / requiredSignatures) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleAuthorize}
            disabled={!canProceed}
            variant="primary"
            className="flex-1"
          >
            {canProceed ? (
              <>
                <Shield className="w-4 h-4" />
                AUTHORIZE COMMAND
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                INSUFFICIENT SIGNATURES
              </>
            )}
          </Button>
          <Button
            onClick={handleReset}
            variant="ghost"
          >
            RESET
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
          >
            CANCEL
          </Button>
        </div>
      </div>
    </Modal>
  );
}


