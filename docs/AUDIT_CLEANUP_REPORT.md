# Munin Repository Audit & Cleanup Report

**Date:** 2025-03-05  
**Scope:** Comprehensive audit following professional engineering standards  
**Note:** This report documents findings. Execute changes only after review and confirmation.

---

## 1. File Organization & Structure

### 1.1 Directory Structure Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| Separation of concerns | ✅ Good | `app/`, `components/`, `lib/`, `engine/`, `docs/`, `scripts/`, `config/` |
| Test placement | ⚠️ Mixed | Co-located `__tests__/` (good) + top-level `tests/` (acceptable) |
| Config location | ✅ Good | `config/` for deployment; root for Next.js/TS (convention) |
| Scripts | ✅ Good | `scripts/` contains deploy, migrate, demo scripts |

### 1.2 File Placement Issues

| File Path | Issue Type | Current State | Recommended Action | Priority |
|-----------|------------|---------------|-------------------|----------|
| `test_all_features.py` | Placement | Python integration test in project root | Move to `scripts/test_all_features.py` or `engine/tests/test_all_features.py` | Medium |
| `scenarios_analysis.md` | Placement | Analysis doc in root | Move to `docs/` or `research/` | Low |
| `middleware.ts` | Placement | In root (Next.js convention) | Keep—Next.js expects middleware at root | N/A |
| `types/shim.d.ts` | Placement | Minimal shim types | Consider merging into `types/` or removing if node_modules provides types | Low |

### 1.3 Redundant / Duplicate Directories

| Item | Issue | Action |
|------|-------|--------|
| `out/` | Contains `vaults/` subdir; `/out/` in .gitignore but dir exists | Ensure `out/` is not committed; add `out/` to .gitignore if not already (it is) | Low |
| `config/connectors.example.yaml` vs `config/connectors.yaml` | Docs reference both `connectors.yaml` and `protocol_connectors.yaml` inconsistently | Standardize docs to `connectors.example.yaml` → copy to `connectors.yaml` | Medium |

### 1.4 Specific Checks

| Check | Finding | Action |
|-------|---------|--------|
| `.txt` files | `engine/requirements.txt` is correct; venv dist-info `.txt` files are package metadata | No action |
| Temporary files | `babel.config.js.bak` exists and is **tracked** (in .gitignore but was committed before) | Remove from git: `git rm --cached babel.config.js.bak`; delete file | **High** |
| OS-specific files | `.DS_Store` in .gitignore | Add `Thumbs.db` if not present | Low |
| IDE files | `.cursor/debug.log` ignored; `.vscode`, `.idea` not in .gitignore | Add `.vscode/`, `.idea/` to .gitignore | Medium |
| `.hypothesis/` | In .gitignore but **tracked** (Hypothesis test cache) | Remove from git: `git rm -r --cached .hypothesis/` | **High** |

---

## 2. Code Quality & AI-Generated Content Review

### 2.1 AI Slop Patterns Identified

| File | Line/Pattern | Issue | Recommended Action | Priority |
|------|--------------|-------|---------------------|----------|
| Various | `// Initialize`, `// Get`, `// Create`, `// Add`, `// Check if` | Redundant comments restating obvious code | Remove or replace with "why" comments | Low |
| `engine/carlisle_config.py` | 66 | `# Placeholder - will search for actual station` | Placeholder without context | Add ticket/issue reference or implement | Medium |
| `engine/run.py` | region/endregion | `# region agent log` / `# endregion` | IDE folding markers; acceptable | No action |
| `lib/packet/diff.ts` | — | Well-structured, no slop | — | — |

### 2.2 Code Cleanup Tasks

| Task | Scope | Priority |
|------|-------|----------|
| Remove obvious comments | ~30 instances across lib/, app/api/ | Low |
| Consolidate duplicate auth/signing logic | `handleAuthorize` in HandshakePanel vs handshakes/[id]/page | Low |
| Simplify over-abstraction | None significant found | — |
| Fix naming | `handleX` is standard React convention; acceptable | — |
| Dead code | None obvious | — |
| Unused imports | Run `npm run lint` for full check | Medium |

---

## 3. File Content Standards

### 3.1 Documentation Files

| File | Status | Notes |
|------|--------|-------|
| README.md | ✅ Complete | 2000+ lines, well-structured |
| CONTRIBUTING.md | ✅ Present | Describes AI-assisted dev approach |
| LICENSE | ✅ Present | |
| CHANGELOG.md | ✅ Present | Roadmap item 100 |
| SECURITY.md | ✅ Present | |
| docs/README.md | ✅ Present | Documentation index |

### 3.2 Configuration Files

| File | Issue | Action |
|------|-------|--------|
| `.env` | Present in workspace (sensitive) | Ensure not committed; .gitignore has `.env` ✅ |
| `.env.example` | Documents vars | Complete |
| `config/connectors.example.yaml` | `api_key_env: "EA_API_KEY"` | Documents env var; no hardcoded secret ✅ |
| `config/deployment-profiles.yaml` | — | Audit for secrets (none found) |

### 3.3 Code Files

| Check | Finding |
|-------|---------|
| UTF-8 encoding | Assume UTF-8 (default) |
| Line endings | Recommend `.gitattributes` with `* text=auto eol=lf` |
| Trailing whitespace | Spot-check: `lib/utils.ts` ends with newline ✅ |
| File endings | — |

---

## 4. Dependency & Package Management

### 4.1 Node.js (package.json)

| Check | Status |
|-------|--------|
| Unused dependencies | Not audited in depth; `npm run build` succeeds |
| Lock file | `package-lock.json` present |
| Duplicate deps | None obvious |
| Security | Run `npm audit` periodically |

### 4.2 Python (engine/requirements.txt)

| Package | Version | Notes |
|---------|---------|-------|
| pandas | >=2.0.0 | |
| numpy | >=1.24.0 | |
| pyyaml | >=6.0 | |
| requests | >=2.31.0 | |
| pytest | >=7.0.0 | |
| hypothesis | >=6.0.0 | |

No unused deps identified. Consider pinning versions for reproducibility.

### 4.3 E2E Tests – Missing Dependency

| Issue | File | Detail |
|-------|------|--------|
| **Playwright not in package.json** | `tests/e2e/critical-flows.spec.ts` | Uses `@playwright/test` but Playwright is not installed | **High** |

**Action:** Add `@playwright/test` as devDependency and configure `playwright.config.ts`, or document that E2E tests require separate Playwright install.

---

## 5. Git & Version Control

### 5.1 Tracked Files That Should Be Ignored

| File/Dir | In .gitignore? | Tracked? | Action |
|----------|----------------|----------|--------|
| `babel.config.js.bak` | Yes | Yes | `git rm --cached babel.config.js.bak` |
| `.hypothesis/` | Yes | Yes | `git rm -r --cached .hypothesis/` |
| `scenarios_analysis.md` | Yes | Unknown | If tracked, `git rm --cached scenarios_analysis.md` |

### 5.2 .gitignore Additions

```
# IDE
.vscode/
.idea/

# OS
Thumbs.db

# Hypothesis (if not already)
.hypothesis/
```

### 5.3 .gitattributes Recommendation

Create `.gitattributes`:

```
* text=auto eol=lf
*.{cmd,[cC][mM][dD]} text eol=crlf
*.{bat,[bB][aA][tT]} text eol=crlf
```

---

## 6. Testing & CI/CD

### 6.1 Test Structure

| Aspect | Status |
|--------|--------|
| Jest config | ✅ Present, coverage thresholds |
| Test naming | ✅ `*.test.ts`, `*.test.tsx`, `__tests__/` |
| E2E (Playwright) | ⚠️ Config missing; Playwright not in deps |
| Python pytest | ✅ `engine/tests/` |
| CI (GitHub Actions) | ✅ `.github/workflows/test.yml`, `build.yml`, `deploy.yml` |

### 6.2 Test Files with Placeholder/Empty Implementations

| File | Status |
|------|--------|
| `tests/e2e/critical-flows.spec.ts` | Full implementation; requires Playwright |
| `tests/integration/db.test.ts` | Has beforeAll skip for env issues |
| `tests/components/GlobalSearch.test.tsx` | Per AGENTS.md, may need act()/waitFor fixes |

---

## 7. Security & Privacy

### 7.1 Hardcoded Secrets Scan

| File | Finding | Severity |
|------|---------|----------|
| `lib/auth/sessions.ts` | `SESSION_SECRET = process.env.SESSION_SECRET \|\| randomBytes(32).toString('hex')` | **Medium** – In production, missing SESSION_SECRET causes new secret on each restart (sessions invalidated) |
| `engine/digital_asset_vault.py` | "Cannot use default secret in production" check | ✅ Guarded |
| `config/connectors.example.yaml` | `api_key_env: "EA_API_KEY"` | ✅ References env var |
| `docker-compose.yml` | `SESSION_SECRET=${SESSION_SECRET:-}` | ✅ Env var |

**Recommendation:** Document in deployment docs that `SESSION_SECRET` must be set in production. Consider failing startup if `NODE_ENV=production` and `SESSION_SECRET` is unset.

### 7.2 PII / Sensitive Data

No PII found in code or docs.

---

## 8. Summary Statistics

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| File placement | 0 | 0 | 1 | 3 |
| Temp/tracked files | 0 | 2 | 0 | 0 |
| Code quality | 0 | 0 | 1 | 2 |
| Dependencies | 0 | 1 | 0 | 0 |
| Git/config | 0 | 0 | 2 | 2 |
| Security | 0 | 0 | 1 | 0 |
| **Total** | **0** | **3** | **5** | **7** |

---

## 9. Suggested File Moves (Shell Script)

```bash
#!/bin/bash
# Run from repository root. Review before executing.

# Move test_all_features.py to scripts (optional)
# mv test_all_features.py scripts/test_all_features.py

# Move scenarios_analysis.md to docs (if keeping)
# mv scenarios_analysis.md docs/analysis/scenarios_analysis.md
```

---

## 10. Files to Delete (With Confirmation)

| File | Reason | Confirmation |
|------|--------|--------------|
| `babel.config.js.bak` | Duplicate of babel.config.js; in .gitignore | **Confirm:** Identical to babel.config.js. Safe to delete. |
| `.hypothesis/*` | Hypothesis test cache; should not be tracked | **Confirm:** Remove from git tracking. Dir can be regenerated. |

**Commands (execute after confirmation):**

```bash
# Remove from git and delete backup
git rm --cached babel.config.js.bak
rm -f babel.config.js.bak

# Remove Hypothesis cache from git
git rm -r --cached .hypothesis/
```

---

## 11. Recommended .gitignore Additions

```gitignore
# IDE
.vscode/
.idea/

# OS (if not already)
Thumbs.db
```

---

## 12. Execution Notes

- **Do NOT** automatically delete files without confirmation.
- **Do NOT** rewrite git history.
- Preserve functionality—only improve structure and quality.
- Run `npm run lint` and `npm test` after any code changes.
- For Playwright E2E: add `@playwright/test` to devDependencies and add `playwright.config.ts` if E2E tests are to be run in CI.

---

*Report generated by repository audit. Review and approve before applying changes.*
