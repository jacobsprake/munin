/**
 * Feature Flags System
 * 
 * Simple toggle system for experimental modules without cloud dependencies.
 * Flags are stored in memory and can be configured via environment variables or config file.
 */

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  experimental: boolean;
}

const DEFAULT_FLAGS: Record<string, FeatureFlag> = {
  satellite_verification: {
    name: 'satellite_verification',
    enabled: false,
    description: 'Satellite-based infrastructure verification',
    experimental: true,
  },
  wide_bandgap_edge: {
    name: 'wide_bandgap_edge',
    enabled: false,
    description: 'Wide-bandgap semiconductor edge computing',
    experimental: true,
  },
  quantum_sensors: {
    name: 'quantum_sensors',
    enabled: false,
    description: 'Quantum sensor integration',
    experimental: true,
  },
  advanced_counterfactuals: {
    name: 'advanced_counterfactuals',
    enabled: true,
    description: 'Advanced counterfactual analysis',
    experimental: false,
  },
  shadow_mode: {
    name: 'shadow_mode',
    enabled: true,
    description: 'Shadow mode passive observation',
    experimental: false,
  },
  cmi_prioritization: {
    name: 'cmi_prioritization',
    enabled: true,
    description: 'Civilian-Military Integration prioritization',
    experimental: false,
  },
};

class FeatureFlagService {
  private flags: Record<string, FeatureFlag> = { ...DEFAULT_FLAGS };

  constructor() {
    // Load from environment variables
    this.loadFromEnvironment();
  }

  private loadFromEnvironment() {
    // Check for FEATURE_FLAG_* environment variables
    Object.keys(this.flags).forEach((key) => {
      const envKey = `FEATURE_FLAG_${key.toUpperCase()}`;
      const envValue = process.env[envKey];
      if (envValue !== undefined) {
        this.flags[key].enabled = envValue === 'true' || envValue === '1';
      }
    });
  }

  isEnabled(flagName: string): boolean {
    return this.flags[flagName]?.enabled ?? false;
  }

  setFlag(flagName: string, enabled: boolean): void {
    if (this.flags[flagName]) {
      this.flags[flagName].enabled = enabled;
    } else {
      // Create new flag
      this.flags[flagName] = {
        name: flagName,
        enabled,
        description: `Custom flag: ${flagName}`,
        experimental: true,
      };
    }
  }

  getAllFlags(): FeatureFlag[] {
    return Object.values(this.flags);
  }

  getFlag(flagName: string): FeatureFlag | null {
    return this.flags[flagName] || null;
  }
}

export const featureFlags = new FeatureFlagService();

/**
 * React hook for feature flags (client-side)
 */
export function useFeatureFlag(flagName: string): boolean {
  // In a real implementation, would fetch from API
  // For now, return default value
  return featureFlags.isEnabled(flagName);
}
