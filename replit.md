# NexusGraph

NexusGraph is a federated GraphQL SaaS control plane — an admin dashboard for managing organizations, users, subgraphs, billing, and audit activity across an Apollo Federation v2 platform.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/admin-dashboard run dev` — run the admin UI (port 22133)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `APOLLO_KEY` — Apollo GraphOS service key (`service:nexusgraph:...`)
- Required env: `APOLLO_GRAPH_REF` — Apollo graph ref (`nexusgraph@current`)
- Required env: `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Apollo Federation v2 subgraph (`@apollo/subgraph`)
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (jsonwebtoken + bcryptjs), stored in `localStorage` as `nexusgraph_token`
- Validation: Zod (`zod/v4`), `drizzle-zod`, orval-generated Zod schemas
- API codegen: Orval (from OpenAPI spec) → React Query hooks + Zod validators
- Frontend: React 19 + Vite 6 + Wouter, shadcn/ui, Recharts, TanStack Query v5
- Build: esbuild (CJS bundle for API)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for the REST API contract (1178 lines)
- `lib/api-spec/orval.config.ts` — codegen config (react-query hooks + zod validators)
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/api.ts` — generated Zod validators (do not edit)
- `lib/db/src/schema/` — Drizzle ORM table definitions (users, organizations, billing, subgraphs, activity)
- `artifacts/api-server/src/routes/` — Express route handlers (10 modules)
- `artifacts/api-server/src/graphql/` — Apollo Federation subgraph schema + server
- `artifacts/admin-dashboard/src/pages/` — 11 React pages (dashboard, login, orgs, users, subgraphs, billing, activity, settings, detail pages)
- `attached_assets/brand/` — logo.png, banner.png, og-image.png, social-card.png

## Architecture decisions

- Contract-first: OpenAPI spec drives both the REST API (Zod validation) and frontend (React Query hooks) via Orval codegen — never edit generated files.
- The orval zod output uses `mode: "single"` with an absolute `target` path (no `workspace` option) to prevent orval from generating a barrel `index.ts` and accumulating stale exports.
- JWT auth is stateless — tokens are signed with `SESSION_SECRET`, verified in `requireAuth` middleware, stored in browser `localStorage`.
- Apollo Federation: API server is a subgraph publishing to `nexusgraph@current`; `APOLLO_GRAPH_REF` must be set for usage reporting to work properly.
- Dark theme by default (`color-scheme: dark`) using a slate-based HSL palette with violet-indigo primary (Apollo-inspired).

## Product

- **Dashboard**: Summary metrics (total orgs, users, subgraphs, MRR), charts (org growth, plan breakdown, subgraph health)
- **Organizations**: CRUD for tenants, status management, plan assignment, org detail with subgraphs/users/billing view
- **Users**: User management across all orgs, role assignment (admin/developer/viewer), status control
- **Subgraphs**: Federated GraphQL subgraph registry with health status, publish history, schema viewer
- **Billing**: Plan management, subscription lifecycle, revenue metrics
- **Activity**: Audit log with filtering by org/type/date range
- **Settings**: Platform configuration
- **Global Search**: `⌘K` to search across orgs, users, and subgraphs

## Admin credentials (dev seed)

- Email: `admin@nexusgraph.io`
- Password: `password123`

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after editing `openapi.yaml` before writing route handlers — import real Zod schema names from `lib/api-zod/src/generated/api.ts`.
- `lib/api-zod/src/index.ts` must stay as `export * from "./generated/api"` only. Codegen no longer overwrites it (orval uses absolute target path without workspace option).
- DB schema uses `org_id` (snake_case in SQL) mapped to `orgId` in Drizzle camelCase. Routes must use camelCase Drizzle field names.
- The activity log table is `activity_events` (not `activity_log`) with columns: `type` (enum), `description`, `org_id`, `org_name`, `user_id`, `user_name`, `metadata`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
