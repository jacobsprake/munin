/**
 * GET /api/docs - Generate OpenAPI specification
 * Air-gapped compliant: internal documentation only
 */
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Munin API',
        version: '1.0.0',
        description: 'Sovereign Infrastructure Orchestration Platform API - Air-gapped compliant, internal-only'
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Local development server'
        }
      ],
      paths: {
        '/api/graph': {
          get: {
            summary: 'Get dependency graph',
            responses: {
              '200': { description: 'Graph data' }
            }
          }
        },
        '/api/incidents': {
          get: {
            summary: 'List incidents',
            parameters: [
              { name: 'id', in: 'query', schema: { type: 'string' } },
              { name: 'type', in: 'query', schema: { type: 'string' } }
            ],
            responses: {
              '200': { description: 'Incidents list' }
            }
          }
        },
        '/api/packets': {
          get: {
            summary: 'List handshake packets',
            parameters: [
              { name: 'id', in: 'query', schema: { type: 'string' } },
              { name: 'status', in: 'query', schema: { type: 'string' } }
            ],
            responses: {
              '200': { description: 'Packets list' }
            }
          }
        },
        '/api/decisions': {
          get: {
            summary: 'List decisions',
            parameters: [
              { name: 'id', in: 'query', schema: { type: 'string' } },
              { name: 'status', in: 'query', schema: { type: 'string' } }
            ],
            responses: {
              '200': { description: 'Decisions list' }
            }
          },
          post: {
            summary: 'Create decision',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      incident_id: { type: 'string' },
                      playbook_id: { type: 'string' },
                      policy: { type: 'object' }
                    }
                  }
                }
              }
            },
            responses: {
              '200': { description: 'Decision created' }
            }
          }
        },
        '/api/users': {
          get: {
            summary: 'List users',
            responses: {
              '200': { description: 'Users list' }
            }
          },
          post: {
            summary: 'Create user',
            responses: {
              '200': { description: 'User created' }
            }
          }
        },
        '/api/notifications': {
          get: {
            summary: 'List notifications',
            responses: {
              '200': { description: 'Notifications list' }
            }
          }
        },
        '/api/readiness': {
          get: {
            summary: 'Get readiness metrics',
            responses: {
              '200': { description: 'Readiness metrics' }
            }
          }
        },
        '/api/chaos': {
          get: {
            summary: 'List chaos scenarios',
            responses: {
              '200': { description: 'Chaos scenarios' }
            }
          }
        },
        '/api/search': {
          get: {
            summary: 'Global search',
            parameters: [
              { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
              { name: 'type', in: 'query', schema: { type: 'string' } }
            ],
            responses: {
              '200': { description: 'Search results' }
            }
          }
        },
        '/api/export': {
          get: {
            summary: 'Export data',
            parameters: [
              { name: 'type', in: 'query', schema: { type: 'string' } },
              { name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'csv'] } }
            ],
            responses: {
              '200': { description: 'Export data' }
            }
          }
        },
        '/api/resources': {
          get: {
            summary: 'List resources',
            responses: {
              '200': { description: 'Resources list' }
            }
          },
          post: {
            summary: 'Request resource lock',
            responses: {
              '200': { description: 'Lock created' }
            }
          }
        },
        '/api/shadow/report': {
          get: {
            summary: 'Get shadow mode report',
            responses: {
              '200': { description: 'Shadow report' }
            }
          }
        },
        '/api/metrics': {
          get: {
            summary: 'Get system metrics',
            responses: {
              '200': { description: 'System metrics' }
            }
          }
        },
        '/api/backup': {
          get: {
            summary: 'List backups',
            responses: {
              '200': { description: 'Backups list' }
            }
          },
          post: {
            summary: 'Create backup',
            responses: {
              '200': { description: 'Backup created' }
            }
          }
        }
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer'
          }
        }
      }
    };
    
    return NextResponse.json(openApiSpec);
  } catch (error: any) {
    console.error('Error generating API docs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate API docs' },
      { status: 500 }
    );
  }
}
