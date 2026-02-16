/**
 * Alerting System
 * 
 * Provides abstractions for sending alerts via multiple channels:
 * - Email (SMTP)
 * - SMS (via on-prem gateway)
 * - On-prem notification gateways
 * 
 * All implementations are air-gap compatible (no cloud dependencies).
 */

export type AlertChannel = 'email' | 'sms' | 'on_prem_gateway' | 'internal';

export interface AlertConfig {
  email?: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromAddress: string;
  };
  sms?: {
    gatewayUrl: string;
    apiKey: string;
  };
  onPremGateway?: {
    endpoint: string;
    apiKey: string;
  };
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  channels: AlertChannel[];
  metadata?: Record<string, any>;
}

class AlertingService {
  private config: AlertConfig | null = null;

  configure(config: AlertConfig) {
    this.config = config;
  }

  async sendAlert(alert: Alert): Promise<void> {
    if (!this.config) {
      console.warn('Alerting not configured. Alert:', alert);
      return;
    }

    const promises: Promise<void>[] = [];

    for (const channel of alert.channels) {
      switch (channel) {
        case 'email':
          if (this.config.email) {
            promises.push(this.sendEmail(alert, this.config.email));
          }
          break;
        case 'sms':
          if (this.config.sms) {
            promises.push(this.sendSMS(alert, this.config.sms));
          }
          break;
        case 'on_prem_gateway':
          if (this.config.onPremGateway) {
            promises.push(this.sendToGateway(alert, this.config.onPremGateway));
          }
          break;
        case 'internal':
          // Internal alerts are always sent (logged)
          promises.push(this.sendInternal(alert));
          break;
      }
    }

    await Promise.allSettled(promises);
  }

  private async sendEmail(alert: Alert, config: AlertConfig['email']): Promise<void> {
    // In production, would use nodemailer or similar
    console.log(`[EMAIL] ${alert.severity.toUpperCase()}: ${alert.title}`);
    console.log(`To: ${config?.fromAddress}`);
    console.log(`Message: ${alert.message}`);
  }

  private async sendSMS(alert: Alert, config: AlertConfig['sms']): Promise<void> {
    // In production, would call SMS gateway API
    try {
      const response = await fetch(config.gatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          to: alert.metadata?.phoneNumber || '',
          message: `${alert.severity.toUpperCase()}: ${alert.title}\n${alert.message}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`SMS gateway returned ${response.status}`);
      }
    } catch (error) {
      console.error('SMS alert failed:', error);
      // Fallback to internal logging
      await this.sendInternal(alert);
    }
  }

  private async sendToGateway(alert: Alert, config: AlertConfig['onPremGateway']): Promise<void> {
    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(alert),
      });

      if (!response.ok) {
        throw new Error(`Gateway returned ${response.status}`);
      }
    } catch (error) {
      console.error('Gateway alert failed:', error);
      // Fallback to internal logging
      await this.sendInternal(alert);
    }
  }

  private async sendInternal(alert: Alert): Promise<void> {
    // Log to internal audit log
    console.log(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.title} - ${alert.message}`);
    
    // In production, would write to audit log
    // await appendAuditLogEntry({
    //   event_type: 'ALERT_SENT',
    //   payload: alert,
    // });
  }
}

export const alertingService = new AlertingService();

/**
 * Helper function to send alerts for common scenarios.
 */
export async function alertIncidentDetected(incidentId: string, incidentType: string): Promise<void> {
  await alertingService.sendAlert({
    id: `incident_${incidentId}`,
    severity: 'critical',
    title: `Incident Detected: ${incidentType}`,
    message: `A new ${incidentType} incident has been detected (ID: ${incidentId})`,
    timestamp: new Date().toISOString(),
    channels: ['internal', 'on_prem_gateway'],
    metadata: { incidentId, incidentType },
  });
}

export async function alertPacketPending(packetId: string, playbookId: string): Promise<void> {
  await alertingService.sendAlert({
    id: `packet_${packetId}`,
    severity: 'warning',
    title: `Packet Pending Approval: ${playbookId}`,
    message: `A handshake packet requires approval (ID: ${packetId})`,
    timestamp: new Date().toISOString(),
    channels: ['internal', 'email'],
    metadata: { packetId, playbookId },
  });
}

export async function alertSystemHealth(component: string, status: string): Promise<void> {
  await alertingService.sendAlert({
    id: `health_${component}_${Date.now()}`,
    severity: status === 'degraded' ? 'warning' : status === 'down' ? 'error' : 'info',
    title: `System Health: ${component}`,
    message: `Component ${component} status: ${status}`,
    timestamp: new Date().toISOString(),
    channels: ['internal'],
    metadata: { component, status },
  });
}
