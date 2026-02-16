'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface ZKPSummary {
  reportId: string;
  auditType: string;
  publicSummary: {
    status: 'compliant' | 'non_compliant' | 'requires_attention';
    overallScore: number;
    lastVerified: string;
    verificationStatus: 'verified' | 'pending' | 'failed';
  };
  statementCount: number;
}

export default function RegulatorView() {
  const [zkpReports, setZkpReports] = useState<ZKPSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadZKPReports();
  }, []);

  const loadZKPReports = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/zkp/audit?action=reports');
      if (response.ok) {
        const data = await response.json();
        setZkpReports(data.reports || []);
      }
    } catch (error) {
      console.error('Failed to load ZKP reports:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="p-4">
          <div className="text-sm font-mono font-semibold text-text-primary mb-4">
            REGULATOR VIEW - ZERO-KNOWLEDGE PROOF AUDITS
          </div>
          <div className="text-xs font-mono text-text-muted mb-4">
            This view provides transparency without revealing national secrets.
            All data is verified via Zero-Knowledge Proofs.
          </div>

          {loading ? (
            <div className="text-center text-muted-foreground">Loading audit reports...</div>
          ) : zkpReports.length === 0 ? (
            <div className="text-center text-muted-foreground">No audit reports available</div>
          ) : (
            <div className="space-y-3">
              {zkpReports.map((report) => (
                <div key={report.reportId} className="border border-base-700 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-mono font-semibold text-text-primary">
                      {report.auditType.toUpperCase()}
                    </div>
                    <Badge
                      status={
                        report.publicSummary.status === 'compliant' ? 'ok' :
                        report.publicSummary.status === 'requires_attention' ? 'warning' :
                        'degraded'
                      }
                    >
                      {report.publicSummary.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div>
                      <div className="text-text-muted">Overall Score:</div>
                      <div className="text-text-primary">{report.publicSummary.overallScore}/100</div>
                    </div>
                    <div>
                      <div className="text-text-muted">Statements:</div>
                      <div className="text-text-primary">{report.statementCount}</div>
                    </div>
                    <div>
                      <div className="text-text-muted">Last Verified:</div>
                      <div className="text-text-primary">
                        {new Date(report.publicSummary.lastVerified).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-text-muted">Status:</div>
                      <div className="text-text-primary">{report.publicSummary.verificationStatus}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
