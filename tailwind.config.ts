import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base surfaces - deep charcoals and slate greys
        base: {
          950: '#0B0F14',
          900: '#0F1620',
          850: '#121C27',
          800: '#162232',
          750: '#1A293A',
          700: '#233247',
        },
        // Text colors
        text: {
          primary: '#E6EEF8',
          secondary: '#A9B7C6',
          muted: '#6D7E90',
        },
        // Safety colors
        safety: {
          amber: '#F6B73C',
          cobalt: '#3B82F6',
          emerald: '#22C55E',
        },
        // Sector tints (subtle)
        sector: {
          power: '#2A3B5A',
          water: '#243B3A',
          telecom: '#3A2B52',
        },
        // Legacy compatibility
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        charcoal: {
          DEFAULT: '#1a1a1a',
          50: '#2a2a2a',
          100: '#1a1a1a',
          200: '#0f0f0f',
        },
        slate: {
          DEFAULT: '#334155',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        amber: {
          DEFAULT: '#F6B73C',
          light: '#fbbf24',
          dark: '#d97706',
        },
        cobalt: {
          DEFAULT: '#3B82F6',
          light: '#60a5fa',
          dark: '#2563eb',
        },
        emerald: {
          DEFAULT: '#22C55E',
          light: '#34d399',
          dark: '#059669',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-title': ['24px', { lineHeight: '1.2', fontWeight: '600' }],
        'panel-title': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['14px', { lineHeight: '1.5', fontWeight: '450' }],
        'body-mono': ['13px', { lineHeight: '1.5', fontWeight: '500' }],
        'label': ['11px', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.04em' }],
        'data-number': ['16px', { lineHeight: '1.2', fontWeight: '600' }],
      },
      spacing: {
        '0.5': '4px',
        '1.5': '12px',
        '3': '24px',
        '5': '40px',
        '6': '48px',
        '8': '64px',
      },
      boxShadow: {
        'panel': '0 10px 30px rgba(0, 0, 0, 0.35)',
        'focus-glow': '0 0 0 2px rgba(59, 130, 246, 0.2)',
        'warning-pulse': '0 0 8px rgba(246, 183, 60, 0.2)',
      },
      borderWidth: {
        'inner': '1px',
      },
      borderColor: {
        'inner-stroke': 'rgba(255, 255, 255, 0.06)',
      },
      opacity: {
        'glass': '0.72',
      },
    },
  },
  plugins: [],
}
export default config

