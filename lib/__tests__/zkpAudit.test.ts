import {
  generateWaterSafetyZKP,
  generateGridStabilityZKP,
  verifyZKPStatement,
} from '../zkp_audit';

describe('Zero-Knowledge Proof Audit', () => {
  it('generates water safety ZKP', async () => {
    const zkp = await generateWaterSafetyZKP(
      [3.5, 3.8, 4.0, 3.2],
      2.0,
      ['pump_01', 'pump_02']
    );
    expect(zkp).toBeDefined();
    expect(zkp.claim).toBeTruthy();
    expect(zkp.proof).toBeTruthy();
    expect(zkp.verificationKey).toBeTruthy();
  });

  it('generates grid stability ZKP', async () => {
    const zkp = await generateGridStabilityZKP(
      [50.0, 50.1, 49.9, 50.0],
      49.5,
      50.5
    );
    expect(zkp).toBeDefined();
    expect(zkp.claim).toBeTruthy();
    expect(zkp.proof).toBeTruthy();
  });

  it('verifies a valid ZKP', async () => {
    const zkp = await generateWaterSafetyZKP(
      [3.5, 3.8, 4.0],
      2.0,
      ['pump_01']
    );
    const result = await verifyZKPStatement(zkp);
    expect(result.valid).toBe(true);
  });
});
