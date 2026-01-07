'use client';

import { useState, useEffect, useRef } from 'react';
import Card from '@/components/ui/Card';
import { Radio, AlertTriangle } from 'lucide-react';

export default function AcousticRFFingerprint() {
  const [mismatch, setMismatch] = useState(false);
  const canvasRef1 = useRef<HTMLCanvasElement>(null);
  const canvasRef2 = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas1 = canvasRef1.current;
    const canvas2 = canvasRef2.current;
    if (!canvas1 || !canvas2) return;

    const ctx1 = canvas1.getContext('2d');
    const ctx2 = canvas2.getContext('2d');
    if (!ctx1 || !ctx2) return;

    let time = 0;

    const drawWave = (ctx: CanvasRenderingContext2D, offset: number, color: string) => {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let x = 0; x < ctx.canvas.width; x++) {
        const y = ctx.canvas.height / 2 + 
          Math.sin((x / 50) + time + offset) * 20 +
          Math.sin((x / 30) + time * 1.5 + offset) * 10;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    };

    const animate = () => {
      time += 0.1;
      
      // Simulate mismatch occasionally
      if (Math.random() < 0.01) {
        setMismatch(true);
        setTimeout(() => setMismatch(false), 2000);
      }

      drawWave(ctx1, 0, mismatch ? '#EF4444' : '#22C55E');
      drawWave(ctx2, mismatch ? Math.PI : 0, mismatch ? '#EF4444' : '#22C55E');

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mismatch]);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Radio className="w-5 h-5 text-safety-cobalt" />
        <div>
          <div className="text-label mono text-text-primary">
            ACOUSTIC/RF FINGERPRINTING
          </div>
          <div className="text-body-mono mono text-text-muted">
            Physical Verification Feed
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-label mono text-text-muted mb-2 text-xs">
            DIGITAL SIGNAL
          </div>
          <canvas
            ref={canvasRef1}
            width={200}
            height={60}
            className="w-full bg-base-950 rounded border border-base-700"
          />
        </div>
        <div>
          <div className="text-label mono text-text-muted mb-2 text-xs">
            PHYSICAL RESONANCE
          </div>
          <canvas
            ref={canvasRef2}
            width={200}
            height={60}
            className="w-full bg-base-950 rounded border border-base-700"
          />
        </div>
      </div>

      {mismatch && (
        <div className="p-3 bg-red-950/50 border border-red-500 rounded animate-pulse">
          <div className="flex items-center gap-2 text-red-400 text-label mono">
            <AlertTriangle className="w-4 h-4" />
            STUXNET-STYLE MISMATCH DETECTED: ASSET COMPROMISED
          </div>
        </div>
      )}

      <div className="p-3 bg-base-800 rounded border border-base-700">
        <div className="text-body-mono mono text-text-secondary text-xs">
          Continuous monitoring of digital signals vs. physical acoustic/RF signatures.
          Mismatch indicates potential hardware tampering or compromise.
        </div>
      </div>
    </Card>
  );
}

