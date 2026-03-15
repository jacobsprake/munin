# Munin Logo Integration

## Current Logo

A placeholder SVG logo is at `public/munin-logo.svg`. It uses a geometric "M" with shield motif in government-grade cobalt (#3B82F6).

## Replacing with Official Logo

1. **Replace the file:** Overwrite `public/munin-logo.svg` with your official Munin logo.
2. **Preferred format:** SVG (scalable, supports dark backgrounds). PNG also works.
3. **Recommended size:** 48×48 or 64×64 viewBox for SVG; 96×96 or 128×128 for PNG.
4. **Color:** Use cobalt (#3B82F6) or white for visibility on dark backgrounds.

## Where the Logo Appears

- **Login page** (`app/page.tsx`): Header next to "MUNIN"
- **Left rail** (`components/LeftRail.tsx`): Sidebar header next to "MUNIN"

## Usage in Code

```tsx
import Image from 'next/image';
<Image src="/munin-logo.svg" alt="Munin" width={40} height={40} />
```
