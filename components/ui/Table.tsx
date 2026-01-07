'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TableProps {
  headers: string[];
  rows: ReactNode[][];
  onRowClick?: (index: number) => void;
  selectedRowIndex?: number;
  className?: string;
}

export default function Table({ headers, rows, onRowClick, selectedRowIndex, className }: TableProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-base-700">
            {headers.map((header, i) => (
              <th
                key={i}
                className="text-left py-2 px-4 text-label mono text-text-secondary uppercase"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              onClick={() => onRowClick?.(rowIndex)}
              className={cn(
                'border-b border-base-700/50 hover:bg-base-800/50 transition-colors cursor-pointer',
                selectedRowIndex === rowIndex && 'bg-safety-cobalt/10 border-safety-cobalt/50'
              )}
            >
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="py-2 px-4 text-body text-text-primary">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

