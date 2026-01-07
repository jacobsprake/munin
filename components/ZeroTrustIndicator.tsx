'use client';

import { Node } from '@/lib/types';
import Badge from '@/components/ui/Badge';
import { Shield, ShieldCheck, ShieldX, ShieldAlert } from 'lucide-react';
import { getVerificationStatusColor } from '@/lib/zeroTrust';

interface ZeroTrustIndicatorProps {
  node: Node;
  showDetails?: boolean;
}

export default function ZeroTrustIndicator({ node, showDetails = false }: ZeroTrustIndicatorProps) {
  if (!node.zeroTrust) {
    return (
      <div className="flex items-center gap-2">
        <ShieldX className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-mono text-text-muted">NOT VERIFIED</span>
      </div>
    );
  }

  const { verified, verificationStatus, lastVerified, certificateExpiry } = node.zeroTrust;
  const statusColor = getVerificationStatusColor(verificationStatus);

  const getIcon = () => {
    switch (verificationStatus) {
      case 'verified':
        return <ShieldCheck className="w-4 h-4 text-safety-emerald" />;
      case 'unverified':
      case 'revoked':
        return <ShieldX className="w-4 h-4 text-red-400" />;
      case 'expired':
        return <ShieldAlert className="w-4 h-4 text-safety-amber" />;
      case 'pending':
        return <Shield className="w-4 h-4 text-slate-400" />;
      default:
        return <Shield className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {getIcon()}
        <Badge status={verificationStatus === 'verified' ? 'ok' : 'warning'} className="text-[10px]">
          {verificationStatus.toUpperCase()}
        </Badge>
      </div>
      
      {showDetails && (
        <div className="text-xs font-mono text-text-muted space-y-1">
          {lastVerified && (
            <div>Last Verified: {new Date(lastVerified).toLocaleString()}</div>
          )}
          {certificateExpiry && (
            <div>Cert Expires: {new Date(certificateExpiry).toLocaleDateString()}</div>
          )}
          {node.zeroTrust.deviceIdentity && (
            <div className="text-[10px] break-all">
              Identity: {node.zeroTrust.deviceIdentity.substring(0, 32)}...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

