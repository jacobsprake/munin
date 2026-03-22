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

## Known areas likely to have TypeScript issues

- API routes using `error: any` patterns (should use proper error types)
- Routes importing from `@/lib/serverUtils`, `@/lib/db/repositories` --
  verify these modules export the expected types
- Middleware using deprecated conventions (Next.js 16 warns about this)
