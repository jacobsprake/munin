/**
 * Fallback type declarations when node_modules is not installed.
 * Install dependencies (npm install) for full types.
 */

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: unknown;
  }
  interface Element {}
  interface ElementClass {}
}

declare module 'react' {
  export type ReactNode = unknown;
  export interface ChangeEvent<T = HTMLElement> {
    target: T & { value: string };
  }
  export function useState<T>(initial: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  export const StrictMode: unknown;
  export interface ComponentType<P = unknown> {
    (props: P): JSX.Element | null;
  }
  export interface Component {}
  export interface ReactElement {}
}

declare module 'next/navigation' {
  export function useParams(): Record<string, string | string[]>;
  export function useRouter(): {
    push: (url: string) => void;
    replace: (url: string) => void;
    back: () => void;
    forward: () => void;
    refresh: () => void;
    prefetch: (url: string) => void;
  };
  export function usePathname(): string;
  export function useSearchParams(): URLSearchParams;
}

declare module 'date-fns' {
  export function format(date: Date | number | string, formatStr: string): string;
  export function parseISO(iso: string): Date;
  export function formatDistanceToNow(date: Date | number): string;
}

declare module 'lucide-react' {
  import { ComponentType } from 'react';
  export const CheckCircle2: ComponentType<{ className?: string; [k: string]: unknown }>;
  export const Download: ComponentType<{ className?: string; [k: string]: unknown }>;
  export const ArrowLeft: ComponentType<{ className?: string; [k: string]: unknown }>;
  export const Lock: ComponentType<{ className?: string; strokeWidth?: number; [k: string]: unknown }>;
  export const X: ComponentType<{ className?: string; [k: string]: unknown }>;
}
