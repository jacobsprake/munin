# Government Platform UI Research

**Date:** 2026-03-15  
**Purpose:** Design patterns from Palantir Gotham, defense intelligence platforms, and classified systems for Munin UI alignment.

---

## Platforms Researched

### Palantir Gotham / Foundry

- **All-in-one:** Data ingestion, manipulation, reporting in one platform
- **Geospatial:** Map application with layers, object selection, temporal analysis
- **Analytics:** Contour (tabular), Quiver (dashboard), Fusion (spreadsheet)
- **Dark UI:** Standard for command center / operational environments

### Defense Intelligence Platforms

| Platform | Traits |
|----------|--------|
| **Hypergiant CommandCenter** | Dark UI, 60–120 fps, geospatial, real-time entities, tactical to strategic |
| **JERIC2O** (US Air Force) | Cloud C2, unified interface, real-time threat alerts, AI recommendations |
| **IBM Digital Intelligence** | Natural language, AI-driven, context-based analysis |
| **Argus Command Center** | War room collaboration, threat fusion, SIEM integration |
| **ST Engineering Cyber C2** | Information fusion, human-centric, reduced cognitive load |

### Common Design Patterns

1. **Dark theme** — Primary background; reduces glare in 24/7 operations
2. **Grayscale base, color for alerts** — ISA-101: normal = grayscale; amber/red for warnings
3. **Classification banners** — Top and bottom; OFFICIAL, SECRET, etc.
4. **Status at a glance** — Operational metrics in header/footer (nodes, edges, audit, airgap)
5. **Monospace / technical typography** — Mono fonts for data, IDs, timestamps
6. **Minimal chrome** — Task-focused; no marketing fluff
7. **Geospatial when relevant** — Maps for infrastructure, assets, incidents
8. **Real-time indicators** — Live dots, pulse, timestamps
9. **Reduced cognitive load** — Human-centric, clear hierarchy, consistent patterns

---

## Munin Alignment

| Pattern | Munin Status |
|---------|---------------|
| Dark theme | ✅ bg-base-950 |
| Grayscale + accent | ✅ Base grayscale; amber/red for warnings |
| Classification banners | ✅ Top + bottom |
| Status strip | ✅ Nodes, edges, shadow links, audit, airgap |
| Mono typography | ✅ font-mono throughout |
| Fixed workstation | ✅ min-w 1280px, zoom disabled |
| No indexing | ✅ robots noindex |
| Login-first | ✅ AuthGuard, no guest |
| Operator display | ✅ TopBar: ID, role, logout |

### Applied Enhancements

1. **Logo placement** — Munin logo added to login header and CommandShell left rail (`public/munin-logo.svg`)
2. **Consistent accent** — Single cobalt (#3B82F6) for primary actions, emerald for verified/healthy
3. **ISA-101 status strip** — Grayscale normal, amber warning, red critical, green verified

### Future Enhancements

- **Geographic map** — Optional map view for assets (Carlisle coordinates); currently force-directed graph
- **Denser status bar** — Further compact (e.g. h-7) for higher information density
