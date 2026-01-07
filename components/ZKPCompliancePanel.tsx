'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Shield, CheckCircle2, Lock } from 'lucide-react';

export default function ZKPCompliancePanel() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [proofGenerated, setProofGenerated] = useState(false);
  const [proofMessage, setProofMessage] = useState<string | null>(null);

  const generateProof = async () => {
    setIsGenerating(true);
    
    // Simulate ZKP generation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setProofMessage(
      "Verification successful: System within safe operational parameters (Data masked for National Security)."
    );
    setProofGenerated(true);
    setIsGenerating(false);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Lock className="w-5 h-5 text-safety-cobalt" />
        <div>
          <div className="text-label mono text-text-primary">
            ZERO-KNOWLEDGE PROOF (ZKP)
          </div>
          <div className="text-body-mono mono text-text-muted">
            Public Assurance Compliance
          </div>
        </div>
      </div>

      <div className="p-4 bg-base-800 rounded border border-base-700 space-y-2">
        <div className="text-label mono text-text-primary mb-2">
          PUBLIC SAFETY PROOF
        </div>
        <div className="text-body-mono mono text-text-secondary">
          Generate a cryptographic proof that the system operates within safe parameters
          without revealing sensitive operational data.
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="zkp-toggle"
          checked={proofGenerated}
          onChange={(e) => {
            if (!e.target.checked) {
              setProofGenerated(false);
              setProofMessage(null);
            }
          }}
          className="w-4 h-4"
        />
        <label htmlFor="zkp-toggle" className="text-label mono text-text-primary cursor-pointer">
          Generate Public Safety Proof
        </label>
      </div>

      {proofGenerated && !proofMessage && (
        <Button
          onClick={generateProof}
          disabled={isGenerating}
          variant="primary"
          className="w-full"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Generating Proof...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" />
              GENERATE PROOF
            </>
          )}
        </Button>
      )}

      {proofMessage && (
        <div className="p-4 bg-safety-emerald/10 border border-safety-emerald/30 rounded space-y-2">
          <div className="flex items-center gap-2 text-safety-emerald text-label mono">
            <CheckCircle2 className="w-4 h-4" />
            PROOF GENERATED
          </div>
          <div className="text-body mono text-text-primary italic">
            {proofMessage}
          </div>
          <div className="pt-2 border-t border-safety-emerald/30">
            <Badge status="ok" className="text-xs">
              PUBLICLY VERIFIABLE
            </Badge>
          </div>
        </div>
      )}
    </Card>
  );
}

