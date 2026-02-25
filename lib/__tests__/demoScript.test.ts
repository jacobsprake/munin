import { getDemoScript, getAllDemoScripts } from '../demoScript';

describe('Demo Script System', () => {
  it('getAllDemoScripts returns array', () => {
    const scripts = getAllDemoScripts();
    expect(Array.isArray(scripts)).toBe(true);
    expect(scripts.length).toBeGreaterThan(0);
  });

  it('getDemoScript returns null for unknown ID', () => {
    expect(getDemoScript('nonexistent')).toBeNull();
  });

  it('getDemoScript returns a script for a known ID', () => {
    const scripts = getAllDemoScripts();
    if (scripts.length > 0) {
      const found = getDemoScript(scripts[0].id);
      expect(found).not.toBeNull();
    }
  });

  it('scripts have id', () => {
    const scripts = getAllDemoScripts();
    for (const s of scripts) {
      expect(s.id).toBeTruthy();
    }
  });
});
