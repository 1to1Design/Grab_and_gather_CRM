<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Migraine Tracker

A standalone app that shares this repository with the CRM but references
nothing outside its own directory, so it can be split out at any time. It has
its own `package.json`, and `next.config.ts` pins `turbopack.root` here — the
parent lockfile would otherwise be detected as the workspace root and pull the
CRM's files into this build.

## Constraints worth keeping

- **No runtime dependencies beyond Next.js and React.** The charts, statistics,
  IndexedDB layer and icon generator are all hand-written. Reach for a library
  only if hand-writing it would be genuinely worse.
- **Static export.** `output: "export"` means no server, no API routes, and no
  server-side data fetching. Every page is a client component.
- **Health data never leaves the device.** It lives in IndexedDB. The only
  outbound request is to Open-Meteo, which receives coordinates and nothing
  else. Anything that would send symptom or medication data anywhere is a
  change of product, not an implementation detail.
- **Readable during a migraine.** Dark and low-glare by default, tap targets at
  least 3rem, and no design that depends on reading small grey text. Comfort
  mode dims the whole page for light sensitivity.
- **Say what the data says.** Environmental readings are reported as facts, not
  predictions; correlations always carry their sample size and a
  multiple-comparison-adjusted p-value. Nothing in the UI should imply
  diagnosis or causation.

## Checks

`npm run lint` and `npm run build` both need to pass. There is no test suite;
verify behaviour by running the app.
