'use client';

import { useEffect, useState } from 'react';
import CommandShell from '@/components/CommandShell';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { FileText, Code, Download } from 'lucide-react';

interface ApiEndpoint {
  path: string;
  method: string;
  summary: string;
  parameters?: Array<{ name: string; in: string; required?: boolean }>;
}

export default function DocsPage() {
  const [spec, setSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/docs');
      const data = await res.json();
      setSpec(data);
    } catch (error) {
      console.error('Failed to load API docs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSpec = () => {
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'munin-api-spec.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const endpoints: ApiEndpoint[] = spec ? Object.entries(spec.paths || {}).flatMap(([path, methods]: [string, any]) =>
    Object.entries(methods).map(([method, details]: [string, any]) => ({
      path,
      method: method.toUpperCase(),
      summary: details.summary || '',
      parameters: details.parameters || []
    }))
  ) : [];

  return (
    <CommandShell>
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-display-title font-mono text-text-primary mb-2">API Documentation</h1>
            <p className="text-body mono text-text-secondary">
              Internal API reference - Air-gapped compliant, no external dependencies
            </p>
          </div>
          {spec && (
            <button
              onClick={handleDownloadSpec}
              className="flex items-center gap-2 px-4 py-2 bg-base-800 border border-base-700 rounded hover:bg-base-750 text-body-mono mono text-text-primary"
            >
              <Download className="w-4 h-4" />
              Download OpenAPI Spec
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-text-muted font-mono">Loading API documentation...</div>
          </div>
        ) : !spec ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-text-muted font-mono">Failed to load API documentation</div>
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="text-label mono text-text-muted mb-2">API INFO</div>
              <div className="space-y-1 text-body-mono mono">
                <div><span className="text-text-secondary">Title:</span> <span className="text-text-primary">{spec.info.title}</span></div>
                <div><span className="text-text-secondary">Version:</span> <span className="text-text-primary">{spec.info.version}</span></div>
                <div><span className="text-text-secondary">Description:</span> <span className="text-text-primary">{spec.info.description}</span></div>
              </div>
            </Card>

            <div>
              <div className="text-label mono text-text-primary mb-4">ENDPOINTS</div>
              <div className="space-y-2">
                {endpoints.map((endpoint, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge status={endpoint.method === 'GET' ? 'ok' : endpoint.method === 'POST' ? 'active' : 'warning'}>
                        {endpoint.method}
                      </Badge>
                      <code className="text-body-mono mono text-text-primary">{endpoint.path}</code>
                    </div>
                    <div className="text-body mono text-text-secondary mb-2">{endpoint.summary}</div>
                    {endpoint.parameters && endpoint.parameters.length > 0 && (
                      <div className="mt-2">
                        <div className="text-body-mono mono text-text-muted text-xs mb-1">Parameters:</div>
                        <div className="space-y-1">
                          {endpoint.parameters.map((param, j) => (
                            <div key={j} className="text-body-mono mono text-text-secondary text-xs">
                              <code className="text-safety-cobalt">{param.name}</code> ({param.in})
                              {param.required && <span className="text-red-400 ml-1">*</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </CommandShell>
  );
}
