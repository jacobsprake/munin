'use client';

import { useEffect, useState } from 'react';
import CommandShell from '@/components/CommandShell';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Save, Settings } from 'lucide-react';

interface Config {
  system: Record<string, any>;
  engine: Record<string, any>;
  security: Record<string, any>;
  notifications: Record<string, any>;
  chaos_simulator: Record<string, any>;
  shadow_mode: Record<string, any>;
}

export default function ConfigPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (section: string, key: string, value: any) => {
    setEdits({
      ...edits,
      [`${section}.${key}`]: value
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      for (const [path, value] of Object.entries(edits)) {
        const [section, key] = path.split('.');
        const res = await fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section, key, value })
        });
        if (!res.ok) {
          throw new Error(`Failed to update ${path}`);
        }
      }
      setEdits({});
      await fetchConfig();
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const renderConfigSection = (title: string, section: string, data: Record<string, any>) => (
    <Card key={section} className="p-4">
      <div className="text-label mono text-text-primary mb-4">{title}</div>
      <div className="space-y-3">
        {Object.entries(data).map(([key, value]) => {
          const path = `${section}.${key}`;
          const currentValue = edits[path] !== undefined ? edits[path] : value;
          const isEdited = edits[path] !== undefined;

          return (
            <div key={key} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-body-mono mono text-text-secondary mb-1">{key}</div>
                {typeof value === 'boolean' ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentValue}
                      onChange={(e) => handleChange(section, key, e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-body mono text-text-primary">{currentValue ? 'Enabled' : 'Disabled'}</span>
                  </label>
                ) : typeof value === 'number' ? (
                  <Input
                    type="number"
                    value={currentValue}
                    onChange={(e) => handleChange(section, key, parseFloat(e.target.value) || 0)}
                    className="w-32"
                  />
                ) : (
                  <Input
                    type="text"
                    value={String(currentValue)}
                    onChange={(e) => handleChange(section, key, e.target.value)}
                    className="flex-1"
                  />
                )}
              </div>
              {isEdited && (
                <Badge status="warning" className="ml-2">Modified</Badge>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );

  return (
    <CommandShell>
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-display-title font-mono text-text-primary mb-2">Configuration</h1>
            <p className="text-body mono text-text-secondary">
              System configuration management - Air-gapped compliant
            </p>
          </div>
          {Object.keys(edits).length > 0 && (
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-text-muted font-mono">Loading configuration...</div>
          </div>
        ) : !config ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-text-muted font-mono">Failed to load configuration</div>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto">
            {renderConfigSection('System', 'system', config.system)}
            {renderConfigSection('Engine', 'engine', config.engine)}
            {renderConfigSection('Security', 'security', config.security)}
            {renderConfigSection('Notifications', 'notifications', config.notifications)}
            {renderConfigSection('Chaos Simulator', 'chaos_simulator', config.chaos_simulator)}
            {renderConfigSection('Shadow Mode', 'shadow_mode', config.shadow_mode)}
          </div>
        )}
      </div>
    </CommandShell>
  );
}
