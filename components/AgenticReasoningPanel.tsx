'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Brain, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface ReasoningStep {
  step: number;
  action: string;
  reasoning: string;
  confidence?: number;
  sources?: string[];
  affected_nodes?: string[];
  time_to_cascade?: number;
  steps?: any[];
  agencies?: string[];
  coordination_plan?: any[];
}

interface AgenticReasoningResult {
  incident_id: string;
  reasoning_steps: ReasoningStep[];
  recommended_action: string;
  confidence: number;
  generated_at: string;
}

interface AgenticReasoningPanelProps {
  incidentId: string;
  brokenSensorId?: string;
}

export default function AgenticReasoningPanel({ incidentId, brokenSensorId }: AgenticReasoningPanelProps) {
  const [reasoning, setReasoning] = useState<AgenticReasoningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (incidentId) {
      fetchReasoning();
    }
  }, [incidentId, brokenSensorId]);

  const fetchReasoning = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/agentic/reason', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId, brokenSensorId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch agentic reasoning');
      }
      
      const data = await response.json();
      setReasoning(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-body-mono mono">Agent reasoning through incident...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-red-500/30">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-body-mono mono">Error: {error}</span>
        </div>
      </Card>
    );
  }

  if (!reasoning) {
    return null;
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-safety-cobalt" />
          <h3 className="text-panel-title mono font-semibold text-text-primary">
            AGENTIC AI REASONING
          </h3>
        </div>
        <Badge status="active">
          {Math.round(reasoning.confidence * 100)}% Confidence
        </Badge>
      </div>

      <div className="space-y-3">
        {reasoning.reasoning_steps.map((step, idx) => (
          <div
            key={idx}
            className="p-3 bg-base-800 rounded border border-base-700 space-y-2"
          >
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-safety-cobalt/20 border border-safety-cobalt flex items-center justify-center">
                <span className="text-xs font-mono text-safety-cobalt">{step.step}</span>
              </div>
              <div className="flex-1">
                <div className="text-body-mono mono font-semibold text-text-primary mb-1">
                  {step.action}
                </div>
                <div className="text-body mono text-text-secondary leading-relaxed">
                  {step.reasoning}
                </div>
                
                {step.sources && step.sources.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="text-label mono text-text-muted">Data Sources:</div>
                    {step.sources.map((source, sidx) => (
                      <div key={sidx} className="text-xs font-mono text-safety-emerald flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {source}
                      </div>
                    ))}
                  </div>
                )}
                
                {step.steps && step.steps.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <div className="text-label mono text-text-muted">Recovery Steps:</div>
                    {step.steps.map((subStep: any, sidx: number) => (
                      <div key={sidx} className="pl-3 border-l-2 border-base-700 space-y-1">
                        <div className="text-xs font-mono text-text-primary">
                          Step {subStep.step}: {subStep.action}
                        </div>
                        <div className="text-xs font-mono text-text-muted">
                          Target: {subStep.target}
                        </div>
                        <div className="text-xs font-mono text-safety-emerald">
                          Expected: {subStep.expected_outcome}
                        </div>
                        {subStep.automated ? (
                          <Badge status="active" className="text-[10px]">AUTOMATED</Badge>
                        ) : (
                          <Badge status="warning" className="text-[10px]">
                            REQUIRES APPROVAL: {subStep.requires_approval?.join(', ')}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {step.agencies && step.agencies.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="text-label mono text-text-muted">Coordinating Agencies:</div>
                    {step.agencies.map((agency, aidx) => (
                      <div key={aidx} className="text-xs font-mono text-safety-cobalt">
                        • {agency}
                      </div>
                    ))}
                  </div>
                )}
                
                {step.confidence !== undefined && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-label mono text-text-muted">Confidence:</span>
                    <div className="flex-1 h-1.5 bg-base-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-safety-cobalt"
                        style={{ width: `${step.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-text-secondary">
                      {Math.round(step.confidence * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-base-700">
        <div className="text-label mono text-text-muted mb-2">RECOMMENDED ACTION</div>
        <div className="text-body mono font-semibold text-safety-cobalt bg-base-800 p-3 rounded border border-safety-cobalt/30">
          {reasoning.recommended_action}
        </div>
      </div>
    </Card>
  );
}

