/**
 * Compliance Certificate Panel
 * Displays Legal-as-a-Service certificate (Liability Shield)
 * 
 * This component showcases Feature #4: Statutory Compliance Mapping
 */
'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { LegalCertificate } from '@/lib/compliance';
import { FileText, Shield, Download, CheckCircle2 } from 'lucide-react';

interface ComplianceCertificatePanelProps {
  packetId: string;
  playbookId: string;
  operatorId?: string;
  operatorRole?: string;
}

export default function ComplianceCertificatePanel({
  packetId,
  playbookId,
  operatorId,
  operatorRole
}: ComplianceCertificatePanelProps) {
  const [certificate, setCertificate] = useState<LegalCertificate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (packetId && operatorId && operatorRole) {
      loadCertificate();
    }
  }, [packetId, operatorId, operatorRole]);

  async function loadCertificate() {
    if (!operatorId || !operatorRole) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packetId,
          operatorId,
          operatorRole
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCertificate(data.certificate);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load certificate');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load certificate');
    } finally {
      setLoading(false);
    }
  }

  const handleDownload = () => {
    if (!certificate) return;
    
    const blob = new Blob([JSON.stringify(certificate, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${certificate.certificateId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card variant="packet">
        <div className="text-center py-4 text-text-muted text-sm font-mono">
          Loading compliance certificate...
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="packet" className="border-safety-amber/30">
        <div className="text-center py-4">
          <div className="text-sm font-mono text-safety-amber mb-2">{error}</div>
          {operatorId && operatorRole && (
            <Button variant="secondary" size="sm" onClick={loadCertificate}>
              Retry
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (!certificate) {
    return (
      <Card variant="packet">
        <div className="text-center py-4 text-text-muted text-sm font-mono">
          {operatorId && operatorRole 
            ? 'Certificate will be generated upon authorization'
            : 'Certificate requires operator authorization'}
        </div>
      </Card>
    );
  }

  const protectionLevel = certificate.liabilityProtection.level;
  const protectionColor = protectionLevel === 'FULL' 
    ? 'text-safety-emerald border-safety-emerald/30 bg-safety-emerald/10'
    : protectionLevel === 'PARTIAL'
    ? 'text-safety-cobalt border-safety-cobalt/30 bg-safety-cobalt/10'
    : 'text-safety-amber border-safety-amber/30 bg-safety-amber/10';

  return (
    <Card variant="packet" className={`border-2 ${protectionColor}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded ${protectionColor}`}>
            <Shield className={`w-5 h-5 ${protectionLevel === 'FULL' ? 'text-safety-emerald' : 'text-safety-cobalt'}`} />
          </div>
          <div>
            <div className="text-label mono text-text-muted mb-1">LEGAL CERTIFICATE</div>
            <div className="text-panel-title mono font-semibold text-text-primary">
              Liability Protection
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleDownload}>
          <Download className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-xs text-text-muted font-mono mb-2">PROTECTION LEVEL</div>
          <Badge status={protectionLevel === 'FULL' ? 'ok' : protectionLevel === 'PARTIAL' ? 'active' : 'warning'}>
            {protectionLevel} PROTECTION
          </Badge>
        </div>

        <div>
          <div className="text-xs text-text-muted font-mono mb-2">STATUTORY BASIS</div>
          <div className="space-y-2">
            {certificate.statutoryBasis.map((basis, idx) => (
              <div key={idx} className="bg-base-800 p-3 rounded border border-base-700">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-3 h-3 text-text-secondary" />
                  <span className="text-sm font-mono font-semibold text-text-primary">
                    {basis.statute.actName}
                  </span>
                </div>
                <div className="text-xs font-mono text-text-secondary">
                  {basis.statute.citation} - {basis.statute.section}
                </div>
                <div className="text-xs font-mono text-text-primary mt-1">
                  {basis.statute.requirement}
                </div>
                <div className="text-xs font-mono text-safety-emerald mt-1">
                  Action: {basis.actionCovered}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-base-800 p-3 rounded border border-base-700">
          <div className="text-xs text-text-muted font-mono mb-2">CERTIFICATION STATEMENT</div>
          <div className="text-sm font-mono text-text-primary leading-relaxed whitespace-pre-wrap">
            {certificate.certificationStatement}
          </div>
        </div>

        <div>
          <div className="text-xs text-text-muted font-mono mb-2">CONDITIONS</div>
          <div className="space-y-1">
            {certificate.liabilityProtection.conditions.map((condition, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-safety-emerald mt-0.5 flex-shrink-0" />
                <span className="text-xs font-mono text-text-primary">{condition}</span>
              </div>
            ))}
          </div>
        </div>

        {certificate.liabilityProtection.exclusions && certificate.liabilityProtection.exclusions.length > 0 && (
          <div>
            <div className="text-xs text-text-muted font-mono mb-2">EXCLUSIONS</div>
            <div className="space-y-1">
              {certificate.liabilityProtection.exclusions.map((exclusion, idx) => (
                <div key={idx} className="text-xs font-mono text-safety-amber">
                  • {exclusion}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-base-700">
          <div className="text-xs text-text-muted font-mono mb-1">CERTIFICATE ID</div>
          <div className="text-xs font-mono text-text-primary">{certificate.certificateId}</div>
          <div className="text-xs text-text-muted font-mono mt-1">
            Issued: {new Date(certificate.issuedAt).toLocaleString()}
          </div>
        </div>
      </div>
    </Card>
  );
}

