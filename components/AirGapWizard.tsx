'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Shield, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface VerificationTest {
  test: string;
  passed: boolean;
  details: string;
}

interface AirGapVerification {
  certifiedAirGapped: boolean;
  verificationTests: VerificationTest[];
  certificationStatement?: string;
}

export default function AirGapWizard() {
  const [step, setStep] = useState(1);
  const [verification, setVerification] = useState<AirGapVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [certificate, setCertificate] = useState<any>(null);

  const runVerification = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/airgap/verify');
      if (response.ok) {
        const data = await response.json();
        setVerification(data.verification);
        if (data.verification.certifiedAirGapped) {
          setStep(3);
        } else {
          setStep(2);
        }
      }
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCertificate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/airgap/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'hardware_diode' }),
      });
      if (response.ok) {
        const data = await response.json();
        setCertificate(data.certificate);
        setStep(4);
      }
    } catch (error) {
      console.error('Certificate generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="p-6">
        <div className="text-sm font-mono font-semibold text-text-primary mb-4">
          AIR-GAP VERIFICATION WIZARD
        </div>
        <div className="text-xs font-mono text-text-muted mb-6">
          Verify that Munin is operating in true air-gapped mode with hardware data diode enforcement.
        </div>

        {/* Step 1: Introduction */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-safety-emerald" />
              <div className="text-sm font-mono font-semibold text-text-primary">
                Step 1: Air-Gap Verification Setup
              </div>
            </div>
            <div className="text-xs font-mono text-text-muted space-y-2">
              <p>This wizard will verify that your Munin deployment is operating in air-gapped mode.</p>
              <p>The verification checks:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>DNS resolution (should fail in air-gap)</li>
                <li>External connectivity (should fail)</li>
                <li>Network interface configuration</li>
                <li>Data diode hardware presence</li>
              </ul>
            </div>
            <button
              onClick={runVerification}
              disabled={loading}
              className="px-4 py-2 bg-safety-emerald text-white rounded text-xs font-mono hover:bg-safety-emerald/80 disabled:opacity-50"
            >
              {loading ? 'Running verification...' : 'Start Verification'}
            </button>
          </div>
        )}

        {/* Step 2: Verification Results */}
        {step === 2 && verification && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-safety-amber" />
              <div className="text-sm font-mono font-semibold text-text-primary">
                Step 2: Verification Results
              </div>
            </div>

            <div className="space-y-3">
              {verification.verificationTests.map((test, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-base-800 rounded">
                  <div className="flex items-center gap-2">
                    {test.passed ? (
                      <CheckCircle className="w-4 h-4 text-safety-emerald" />
                    ) : (
                      <XCircle className="w-4 h-4 text-safety-amber" />
                    )}
                    <div>
                      <div className="text-xs font-mono text-text-primary">{test.test}</div>
                      <div className="text-xs font-mono text-text-muted">{test.details}</div>
                    </div>
                  </div>
                  <Badge status={test.passed ? 'ok' : 'warning'}>
                    {test.passed ? 'PASS' : 'FAIL'}
                  </Badge>
                </div>
              ))}
            </div>

            {!verification.certifiedAirGapped && (
              <div className="p-3 bg-safety-amber/20 border border-safety-amber/50 rounded">
                <div className="text-xs font-mono text-safety-amber">
                  ⚠️ Air-gap verification failed. Please check your network configuration and data diode hardware.
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-base-700 text-text-primary rounded text-xs font-mono hover:bg-base-600"
              >
                Retry Verification
              </button>
              {verification.certifiedAirGapped && (
                <button
                  onClick={generateCertificate}
                  disabled={loading}
                  className="px-4 py-2 bg-safety-emerald text-white rounded text-xs font-mono hover:bg-safety-emerald/80 disabled:opacity-50"
                >
                  Generate Certificate
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Certificate Generation */}
        {step === 3 && verification?.certifiedAirGapped && !certificate && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-safety-emerald" />
              <div className="text-sm font-mono font-semibold text-text-primary">
                Step 3: Generate Security Certificate
              </div>
            </div>
            <div className="text-xs font-mono text-text-muted mb-4">
              All verification tests passed. Generate a security certificate proving air-gapped operation.
            </div>
            <button
              onClick={generateCertificate}
              disabled={loading}
              className="px-4 py-2 bg-safety-emerald text-white rounded text-xs font-mono hover:bg-safety-emerald/80 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Certificate'}
            </button>
          </div>
        )}

        {/* Step 4: Certificate Display */}
        {step === 4 && certificate && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-safety-emerald" />
              <div className="text-sm font-mono font-semibold text-text-primary">
                Step 4: Security Certificate
              </div>
            </div>

            <div className="p-4 bg-base-800 rounded border border-safety-emerald/50">
              <div className="text-xs font-mono text-text-primary mb-2">
                CERTIFIED AIR-GAPPED OPERATION
              </div>
              <div className="text-xs font-mono text-text-muted space-y-2">
                <p>{certificate.certificationStatement || certificate.certification_statement}</p>
                <div className="mt-4 pt-4 border-t border-base-700">
                  <div>Issued: {new Date(certificate.issued).toLocaleString()}</div>
                  <div>Mode: {certificate.securityModel?.dataDiodeMode || certificate.dataDiodeMode || 'hardware_diode'}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setStep(1);
                  setVerification(null);
                  setCertificate(null);
                }}
                className="px-4 py-2 bg-base-700 text-text-primary rounded text-xs font-mono hover:bg-base-600"
              >
                Start Over
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(certificate, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `airgap_certificate_${Date.now()}.json`;
                  a.click();
                }}
                className="px-4 py-2 bg-safety-cobalt text-white rounded text-xs font-mono hover:bg-safety-cobalt/80"
              >
                Download Certificate
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
