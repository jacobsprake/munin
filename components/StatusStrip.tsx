'use client';

import { useAppStore } from '@/lib/store';

export default function StatusStrip() {
  const { warRoomMode } = useAppStore();

  return (
    <div className="h-10 bg-base-900 border-t border-base-700 flex items-center justify-between px-6 text-body-mono mono">
      <div className="flex items-center gap-4 text-text-secondary">
        <span>MODEL v0.9.3</span>
        <span>|</span>
        <span>CONFIG a19f…</span>
        <span>|</span>
        <span>DATAHASH 7c2e…</span>
      </div>

      <div className="flex items-center gap-4 text-text-primary">
        <span className="text-safety-amber">WARNINGS: 3</span>
        <span>|</span>
        <span className="text-safety-amber">DEGRADED SENSORS: 2</span>
        <span>|</span>
        <span>SHADOW LINKS: 14</span>
      </div>

      <div className="flex items-center gap-4 text-text-secondary">
        <span className="text-safety-emerald">AUDIT: VERIFIED</span>
        <span>|</span>
        <span>LAST WRITE: 01:13:22Z</span>
      </div>
    </div>
  );
}
