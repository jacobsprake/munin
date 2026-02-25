import { alertingService, alertIncidentDetected, alertPacketPending, alertSystemHealth } from '../alerting';

describe('Alerting System', () => {
  it('alertingService is defined', () => {
    expect(alertingService).toBeDefined();
  });

  it('alertIncidentDetected resolves without error', async () => {
    await expect(alertIncidentDetected('inc_001', 'flood')).resolves.not.toThrow();
  });

  it('alertPacketPending resolves without error', async () => {
    await expect(alertPacketPending('pkt_001', 'playbook_001')).resolves.not.toThrow();
  });

  it('alertSystemHealth resolves without error', async () => {
    await expect(alertSystemHealth('database', 'healthy')).resolves.not.toThrow();
  });
});
