'use client';

import { Edge, EvidenceWindow, GraphData } from '@/lib/types';
import { Download } from 'lucide-react';

interface EvidencePackExportButtonProps {
  edge: Edge;
  evidenceWindows: EvidenceWindow[];
  graphData: GraphData;
}

export default function EvidencePackExportButton({
  edge,
  evidenceWindows,
  graphData,
}: EvidencePackExportButtonProps) {
  const handleExport = () => {
    const relevantWindows = evidenceWindows.filter((w) => w.edgeId === edge.id);
    
    const sourceNode = graphData.nodes.find((n) => n.id === edge.source);
    const targetNode = graphData.nodes.find((n) => n.id === edge.target);
    
    const evidencePack = {
      edgeId: edge.id,
      edgeMetadata: {
        source: edge.source,
        target: edge.target,
        sourceNode: sourceNode
          ? {
              id: sourceNode.id,
              label: sourceNode.label,
              sector: sourceNode.sector,
              kind: sourceNode.kind,
            }
          : null,
        targetNode: targetNode
          ? {
              id: targetNode.id,
              label: targetNode.label,
              sector: targetNode.sector,
              kind: targetNode.kind,
            }
          : null,
        confidenceScore: edge.confidenceScore,
        inferredLagSeconds: edge.inferredLagSeconds,
        stabilityScore: edge.stabilityScore,
        isShadowLink: edge.isShadowLink,
        evidenceWindowCount: relevantWindows.length,
        confounderNotes: edge.confounderNotes || [],
      },
      windows: relevantWindows,
      aggregateMetrics: {
        averageCorrelation:
          relevantWindows.length > 0
            ? relevantWindows.reduce((sum, w) => sum + w.correlation, 0) / relevantWindows.length
            : 0,
        averageRobustness:
          relevantWindows.length > 0
            ? relevantWindows.reduce((sum, w) => sum + w.robustness, 0) / relevantWindows.length
            : 0,
        windowCount: relevantWindows.length,
      },
      provenance: {
        generatedAt: new Date().toISOString(),
        modelVersion: 'prototype_v1',
      },
    };
    
    const blob = new Blob([JSON.stringify(evidencePack, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidence_pack_${edge.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-3 py-2 bg-base-800 border border-base-700 text-text-primary text-xs font-mono rounded hover:bg-base-750 transition-colors"
    >
      <Download className="w-4 h-4" />
      Export Evidence Pack
    </button>
  );
}


