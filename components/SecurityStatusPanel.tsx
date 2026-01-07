'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Shield, Lock, CheckCircle2 } from 'lucide-react';
import { getPQCSecurityStatus } from '@/lib/pqc';

export default function SecurityStatusPanel() {
  const [securityStatus, setSecurityStatus] = useState(getPQCSecurityStatus());

  useEffect(() => {
    // Refresh security status periodically
    const interval = setInterval(() => {
      setSecurityStatus(getPQCSecurityStatus());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="p-3 border-safety-emerald/30 bg-base-800/50">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-4 h-4 text-safety-emerald" />
        <div className="text-label mono text-text-muted">SECURITY STATUS</div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-text-secondary">ENCRYPTION:</span>
          <Badge status="ok" className="text-[10px]">
            {securityStatus.encryption}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-text-secondary">ALGORITHM:</span>
          <span className="text-xs font-mono text-safety-emerald">
            {securityStatus.algorithm}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-text-secondary">STANDARD:</span>
          <span className="text-xs font-mono text-text-primary">
            {securityStatus.standard}
          </span>
        </div>
        
        <div className="pt-2 border-t border-base-700 flex items-center gap-2">
          <CheckCircle2 className="w-3 h-3 text-safety-emerald" />
          <span className="text-[10px] font-mono text-safety-emerald">
            All handshakes use quantum-resistant cryptography
          </span>
        </div>
      </div>
    </Card>
  );
}

