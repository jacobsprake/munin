'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface CMITier {
  tier: 1 | 2 | 3;
  name: string;
  priority: string;
  color: string;
  nodes: string[];
  action: 'PRESERVE' | 'MAINTAIN' | 'SHED';
}

interface CMITierVisualizationProps {
  incidentId?: string;
  impactedNodes?: string[];
}

export default function CMITierVisualization({
  incidentId,
  impactedNodes = []
}: CMITierVisualizationProps) {
  const [cmiTiers, setCmiTiers] = useState<CMITier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCMITiers();
  }, [incidentId, impactedNodes]);

  const loadCMITiers = async () => {
    setLoading(true);
    try {
      // In production, would fetch from API
      // For now, simulate based on node IDs
      const tiers: CMITier[] = [
        {
          tier: 1,
          name: 'Tier 1: Preserve',
          priority: 'CRITICAL_LIFE_SUPPORT / MILITARY_ESSENTIAL',
          color: 'emerald',
          nodes: impactedNodes.filter(n => 
            n.includes('hospital') || 
            n.includes('military') || 
            n.includes('emergency')
          ),
          action: 'PRESERVE'
        },
        {
          tier: 2,
          name: 'Tier 2: Maintain',
          priority: 'CRITICAL_INFRASTRUCTURE / ESSENTIAL_SERVICES',
          color: 'cobalt',
          nodes: impactedNodes.filter(n => 
            (n.includes('substation') || n.includes('pump') || n.includes('reservoir')) &&
            !n.includes('hospital') && !n.includes('military')
          ),
          action: 'MAINTAIN'
        },
        {
          tier: 3,
          name: 'Tier 3: Shed',
          priority: 'COMMERCIAL / INDUSTRIAL_NON_ESSENTIAL',
          color: 'amber',
          nodes: impactedNodes.filter(n => 
            !n.includes('hospital') &&
            !n.includes('military') &&
            !n.includes('substation') &&
            !n.includes('pump') &&
            !n.includes('reservoir')
          ),
          action: 'SHED'
        }
      ];

      setCmiTiers(tiers.filter(t => t.nodes.length > 0));
    } catch (error) {
      console.error('Failed to load CMI tiers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="p-4 text-center text-muted-foreground">Loading CMI tiers...</div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4">
        <div className="text-sm font-mono font-semibold text-text-primary mb-4">
          CMI PRIORITIZATION TIERS
        </div>
        
        <div className="space-y-4">
          {cmiTiers.map((tier) => (
            <div key={tier.tier} className="border-l-4 pl-3" style={{
              borderColor: tier.tier === 1 ? '#10b981' : tier.tier === 2 ? '#3b82f6' : '#f59e0b'
            }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-mono font-semibold text-text-primary">
                    {tier.name}
                  </div>
                  <div className="text-xs font-mono text-text-muted mt-1">
                    {tier.priority}
                  </div>
                </div>
                <Badge 
                  status={tier.tier === 1 ? 'ok' : tier.tier === 2 ? 'warning' : 'degraded'}
                  className="text-[10px]"
                >
                  {tier.action}
                </Badge>
              </div>
              
              <div className="text-xs font-mono text-text-muted mb-1">
                Nodes ({tier.nodes.length}):
              </div>
              <div className="flex flex-wrap gap-1">
                {tier.nodes.slice(0, 5).map((nodeId, idx) => (
                  <Badge key={idx} status="ok" className="text-[10px]">
                    {nodeId}
                  </Badge>
                ))}
                {tier.nodes.length > 5 && (
                  <Badge status="ok" className="text-[10px]">
                    +{tier.nodes.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          ))}
          
          {cmiTiers.length === 0 && (
            <div className="text-xs font-mono text-text-muted text-center py-4">
              No CMI tier data available
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
