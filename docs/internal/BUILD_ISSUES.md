# Build Issues

## Status

`typescript.ignoreBuildErrors` is set to `true` in `next.config.js`.

The deprecated `eslint` key was removed (unsupported in Next.js 16).

## Why we cannot verify error counts yet

The build is blocked by an environment-level issue before TypeScript checking
even begins:

1. **Native dependency compilation failure**: `better-sqlite3@9.6.0` fails to
   compile on Node 25 / macOS (v8 header incompatibility). This prevents
   `npm install` from completing, which means `node_modules/next` is not
   available locally.

2. **Turbopack root detection**: Without a local `next` package, Turbopack
   cannot resolve the project root, and the build aborts immediately.

## To unblock

```bash
# Option A: Use a compatible Node version (Node 20 LTS recommended)
nvm use 20
npm install
npx next build

# Option B: Upgrade better-sqlite3 to a version compatible with Node 25
npm install better-sqlite3@latest
npx next build
```

Once the build runs past dependency resolution, re-check TypeScript errors
and set `ignoreBuildErrors: false` if the count is manageable.

## NPM Audit Vulnerabilities (SPR-319)

Audited 2026-03-22. 11 vulnerabilities total (4 low, 7 high).

### Safe fixes (require `npm audit fix` — blocked by better-sqlite3 build issue)

These can be resolved without breaking changes once the Node version or
better-sqlite3 compatibility issue is resolved:

| Package     | Severity | Fix version | Notes                          |
|-------------|----------|-------------|--------------------------------|
| flatted     | high     | 3.4.2       | Unbounded recursion DoS, prototype pollution |
| minimatch   | high     | 3.1.5+      | ReDoS via nested extglobs      |
| glob        | high     | 10.4.6+     | CLI command injection           |

Run `npm audit fix` (without `--force`) once `npm install` is unblocked.

### Require major version bumps — DO NOT use `--force`

These fixes involve breaking major version upgrades and could break the build:

| Package              | Current  | Fix version  | Breaking change                     |
|----------------------|----------|--------------|-------------------------------------|
| next                 | 14.x     | 16.x         | Major framework upgrade             |
| undici               | <=6.23.0 | 7.24.5       | Major HTTP client upgrade           |
| jest-environment-jsdom| 29.x    | 30.3.0       | Major test environment upgrade      |

**Action required**: Upgrade `next` to 16.x as a separate tracked effort.
`undici` and `jest-environment-jsdom` should be upgraded alongside their
respective ecosystem dependencies.

### Transitive-only (no direct fix available)

| Package               | Via                      | Notes                     |
|-----------------------|--------------------------|---------------------------|
| @tootallnate/once     | jest-environment-jsdom   | Fixed by jest-env upgrade |
| http-proxy-agent      | jsdom -> jest-env-jsdom  | Fixed by jest-env upgrade |

## Known areas likely to have TypeScript issues

- API routes using `error: any` patterns (should use proper error types)
- Routes importing from `@/lib/serverUtils`, `@/lib/db/repositories` --
  verify these modules export the expected types
- Middleware using deprecated conventions (Next.js 16 warns about this)
