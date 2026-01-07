'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import Card from '@/components/ui/Card';
import { AlertTriangle, Shield } from 'lucide-react';

export default function EmergencyModeToggle() {
  const { emergencyMode, emergencyLevel, setEmergencyMode, setEmergencyLevel } = useAppStore();
  const [priorities, setPriorities] = useState<{
    normal: string;
    emergency: string;
  } | null>(null);

  useEffect(() => {
    // Fetch CMI priorities when emergency mode changes
    if (emergencyMode) {
      fetch(`/api/cmi?emergencyLevel=${emergencyLevel}`)
        .then(res => res.json())
        .then(data => {
          if (data.preservationPlan && data.preservationPlan.length > 0) {
            const topPriority = data.preservationPlan[0];
            setPriorities({
              normal: 'Optimizing for cost and flow.',
              emergency: `Optimizing for National Resilience. ${topPriority.reasoning || 'Cutting power to Commercial District B to preserve cooling for Regional Hospital & Military Base.'}`
            });
          }
        })
        .catch(() => {
          // Fallback if API not fully implemented
          setPriorities({
            normal: 'Optimizing for cost and flow.',
            emergency: 'Optimizing for National Resilience. Cutting power to Commercial District B to preserve cooling for Regional Hospital & Military Base.'
          });
        });
    } else {
      setPriorities({
        normal: 'Optimizing for cost and flow.',
        emergency: 'Optimizing for National Resilience. Cutting power to Commercial District B to preserve cooling for Regional Hospital & Military Base.'
      });
    }
  }, [emergencyMode, emergencyLevel]);

  const handleToggle = async () => {
    const newMode = !emergencyMode;
    
    try {
      if (newMode) {
        // Activate CMI Protocol
        const response = await fetch('/api/cmi/activate', { method: 'POST' });
        const data = await response.json();
        if (data.success) {
          setEmergencyMode(true);
          setEmergencyLevel('national_emergency');
        } else {
          console.error('Failed to activate CMI:', data);
        }
      } else {
        // Deactivate CMI Protocol
        const response = await fetch('/api/cmi/deactivate', { method: 'POST' });
        const data = await response.json();
        if (data.success) {
          setEmergencyMode(false);
          setEmergencyLevel('peacetime');
        } else {
          console.error('Failed to deactivate CMI:', data);
        }
      }
    } catch (error) {
      console.error('Error toggling CMI mode:', error);
      // Fallback to local state update
      setEmergencyMode(newMode);
      if (newMode) {
        setEmergencyLevel('national_emergency');
      } else {
        setEmergencyLevel('peacetime');
      }
    }
  };

  return (
    <Card className={`p-4 transition-all ${emergencyMode ? 'bg-red-950/30 border-red-500/50' : 'bg-base-900 border-base-700'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {emergencyMode ? (
            <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
          ) : (
            <Shield className="w-5 h-5 text-text-muted" />
          )}
          <div>
            <div className="text-label mono text-text-primary">
              {emergencyMode ? 'STATE OF EMERGENCY' : 'NORMAL OPERATION'}
            </div>
            <div className="text-body-mono mono text-text-muted">
              {emergencyMode ? 'Tactical Resource Orchestration' : 'Standard Operations'}
            </div>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={emergencyMode}
            onChange={handleToggle}
            className="sr-only peer"
          />
          <div className={`w-16 h-8 rounded-full transition-all ${
            emergencyMode 
              ? 'bg-red-600 peer-focus:ring-2 peer-focus:ring-red-500' 
              : 'bg-base-800 peer-focus:ring-2 peer-focus:ring-safety-cobalt'
          } peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all`}></div>
        </label>
      </div>

      {priorities && (
        <div className="space-y-2 pt-3 border-t border-base-700">
          <div className="text-label mono text-text-muted mb-1">CURRENT PRIORITY</div>
          <div className={`text-body mono p-3 rounded ${
            emergencyMode 
              ? 'bg-red-950/20 text-red-400 border border-red-500/30' 
              : 'bg-base-800 text-text-secondary'
          }`}>
            {emergencyMode ? priorities.emergency : priorities.normal}
          </div>
        </div>
      )}

      {emergencyMode && (
        <div className="mt-3 pt-3 border-t border-red-500/30">
          <div className="text-label mono text-red-400 mb-2">EMERGENCY LEVEL</div>
          <select
            value={emergencyLevel}
            onChange={(e) => setEmergencyLevel(e.target.value as any)}
            className="w-full bg-base-950 border border-red-500/30 rounded px-3 py-2 text-body-mono mono text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="minor_incident">Minor Incident</option>
            <option value="major_incident">Major Incident</option>
            <option value="national_emergency">National Emergency</option>
            <option value="war">War</option>
            <option value="existential_threat">Existential Threat</option>
          </select>
        </div>
      )}
    </Card>
  );
}

