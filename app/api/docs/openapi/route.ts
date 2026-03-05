/**
 * GET /api/docs/openapi
 * OpenAPI 3.0 specification for Munin API
 */
import { NextResponse } from 'next/server';

export async function GET() {
  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'Munin Sovereign Infrastructure API',
      version: '0.9.3',
      description: 'Decision support for critical infrastructure operators. Air-gapped compliant.',
    },
    servers: [{ url: '/api', description: 'API base' }],
    paths: {
      '/graph': {
        get: {
          summary: 'Get dependency graph',
          responses: { 200: { description: 'Graph with nodes and edges' } },
        },
      },
      '/evidence': {
        get: {
          summary: 'Get evidence windows',
          responses: { 200: { description: 'Evidence windows' } },
        },
      },
      '/incidents': {
        get: {
          summary: 'Get incident simulations',
          responses: { 200: { description: 'Incidents' } },
        },
      },
      '/packets': {
        get: {
          summary: 'Get handshake packets',
          responses: { 200: { description: 'Packets' } },
        },
      },
      '/decisions': {
        get: {
          summary: 'List decisions',
          responses: { 200: { description: 'Decisions' } },
        },
      },
      '/authorize': {
        post: {
          summary: 'Authorize handshake packet',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['packetId', 'operatorId', 'passphrase'],
                  properties: {
                    packetId: { type: 'string' },
                    operatorId: { type: 'string' },
                    passphrase: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Authorization result' } },
        },
      },
      '/events': {
        get: {
          summary: 'Poll events (JSON)',
          responses: { 200: { description: 'Recent events' } },
        },
      },
      '/events/sse': {
        get: {
          summary: 'Server-Sent Events stream',
          parameters: [
            {
              name: 'Accept',
              in: 'header',
              required: true,
              schema: { type: 'string', example: 'text/event-stream' },
            },
          ],
          responses: { 200: { description: 'SSE stream' } },
        },
      },
      '/threshold/check': {
        get: {
          summary: 'Run threshold monitor',
          responses: { 200: { description: 'Breached thresholds and triggered playbooks' } },
        },
      },
      '/alerts': {
        get: {
          summary: 'List alerts',
          responses: { 200: { description: 'Alerts' } },
        },
        post: {
          summary: 'Create alert',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['type', 'title'],
                  properties: {
                    type: { type: 'string' },
                    severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                    title: { type: 'string' },
                    message: { type: 'string' },
                    resource_id: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Alert created' } },
        },
      },
      '/audit/log': {
        get: {
          summary: 'Fetch audit log',
          responses: { 200: { description: 'Audit entries' } },
        },
      },
      '/readiness': {
        get: {
          summary: 'Get readiness metrics',
          responses: { 200: { description: 'Readiness metrics' } },
        },
      },
    },
  };
  return NextResponse.json(spec);
}
