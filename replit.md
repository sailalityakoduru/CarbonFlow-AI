# Carbon-Aware AI Compute Orchestrator

A demo scheduling workspace that compares compute workload timing and regions using explainable carbon, deadline, latency, capacity, energy, and cost estimates.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/carbon-orchestrator run dev` — run the CarbonOps web app
- `pnpm --filter @workspace/carbon-orchestrator run typecheck` — typecheck the web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `DATABASE_URL` is used by the separate API Server scaffold; CarbonOps does not require it or any external services.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/carbon-orchestrator/src/lib/` — workload and region types, deterministic simulated data, scheduling calculations, and localStorage persistence
- `artifacts/carbon-orchestrator/src/pages/` — dashboard, workload list/detail, carbon intelligence, scheduler, and strategy comparison
- `artifacts/carbon-orchestrator/src/components/` — shared app shell, workload form, and reusable UI elements
- `lib/api-spec/openapi.yaml` — API contract for the separate API Server scaffold; CarbonOps runs without a backend

## Architecture decisions

- Workloads persist in the current browser's localStorage; no account or remote database is needed for the MVP.
- Carbon intensity and regional capacity are deterministic simulated values labeled DEMO DATA; no live grid API is queried.
- Candidate schedules are independent per workload; resource availability is not reserved or reconciled across concurrent jobs.
- Baseline means the earliest feasible slot in Region A; carbon-aware means the lowest-emission feasible candidate, with short-wait/low-cost tie-breaking within 1%.

## Product

CarbonOps provides a dashboard, workload CRUD and decision records, 24-hour simulated region forecasts, an explainable scheduler, and a calculated baseline-versus-optimized comparison.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
