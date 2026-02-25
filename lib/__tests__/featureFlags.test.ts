import { featureFlags, useFeatureFlag } from '../featureFlags';

describe('Feature Flags', () => {
  it('has default flags defined', () => {
    const flags = featureFlags.getAllFlags();
    expect(Object.keys(flags).length).toBeGreaterThan(0);
  });

  it('can check if a flag is enabled', () => {
    const enabled = featureFlags.isEnabled('advanced_counterfactuals');
    expect(typeof enabled).toBe('boolean');
  });

  it('returns false for unknown flags', () => {
    expect(featureFlags.isEnabled('nonexistent_flag')).toBe(false);
  });

  it('can enable a flag', () => {
    featureFlags.setFlag('satellite_verification', true);
    expect(featureFlags.isEnabled('satellite_verification')).toBe(true);
    featureFlags.setFlag('satellite_verification', false);
  });

  it('can disable a flag', () => {
    featureFlags.setFlag('advanced_counterfactuals', false);
    expect(featureFlags.isEnabled('advanced_counterfactuals')).toBe(false);
    featureFlags.setFlag('advanced_counterfactuals', true);
  });

  it('useFeatureFlag returns boolean', () => {
    expect(typeof useFeatureFlag('shadow_mode')).toBe('boolean');
  });
});
