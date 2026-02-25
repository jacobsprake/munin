import { NATIONAL_STATUTES, searchStatutes } from '../compliance';

describe('Statutory Compliance', () => {
  it('has national statutes defined', () => {
    expect(NATIONAL_STATUTES.length).toBeGreaterThan(0);
  });

  it('each statute has required fields', () => {
    for (const statute of NATIONAL_STATUTES) {
      expect(statute.id).toBeTruthy();
      expect(statute.title).toBeTruthy();
      expect(statute.jurisdiction).toBeTruthy();
    }
  });

  it('searches statutes by keyword', () => {
    const results = searchStatutes('flood');
    expect(Array.isArray(results)).toBe(true);
  });

  it('returns empty array for no matches', () => {
    const results = searchStatutes('xyznonexistent');
    expect(results).toHaveLength(0);
  });

  it('searches with different terms', () => {
    const r1 = searchStatutes('emergency');
    const r2 = searchStatutes('water');
    expect(typeof r1.length).toBe('number');
    expect(typeof r2.length).toBe('number');
  });
});
