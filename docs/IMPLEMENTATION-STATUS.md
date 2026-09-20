# Integrity and access-control patch — 20 September 2026

## Deployment requirement

The data API now fails closed. Configure a Google Identity-Aware Proxy gateway, the exact expected `IAP_AUDIENCE`, and an explicit `CX_ACCESS_POLICY_JSON` before deploying this revision for users. The policy maps verified email addresses to `{ "tenants": ["default_tenant"], "role": "admin" }` or `viewer`. No real identity, key, or secret has been added to source control. Unsigned identity headers are not trusted. The generic health endpoint remains public.

The implementation verifies the signed IAP JWT through google-auth-library. Protect the deployment with HTTPS and IAP, and do not configure a credential in the browser. Start the production server using `NODE_ENV=production npm start`. `PORT` is respected. Only `dist/client` is served publicly. Backend bundles are written to `dist/server`.

## Changes included

- Connect authenticated identities and explicit tenant permissions to all data routes; reject unknown tenants.
- Validate filter keys, operators, values, dates and pagination. Restrict unverified cross-grain filters instead of silently ignoring them.
- Scope vendor transactions before lead aggregation; bind the selected vendor through request-local async context.
- Correct activation fallback and stop fabricating observed call timestamps or calls from sale evidence.
- Repair lead/transaction exports, apply reporting scope, bound row counts, flag truncation, include audit columns and neutralise CSV formulas.
- Apply filters to both driver-analysis periods; keep undefined percentage changes null.
- Base supported sale/activation cohort maturity on event timestamps. Unknown event dates and unobserved maturity remain unknown.
- Remove manufactured reconciliation results and the unconditional overview readiness claim.
- Align overview rate names, preserve filter context in links, and surface API errors explicitly.
- Add a query byte cap (default 1,000,000,000 bytes per query) and regression tests/CI.

## Intentionally withheld pending evidence

Raw-source exports and arbitrary warehouse browsing are disabled. Acquisition economics are withheld until incurred spend and campaign mappings are verified. AI summaries are disabled until their inputs are validated. RPC/revenue maturation and advanced filters on mixed-grain reports return an explicit unsupported response when their definitions cannot be substantiated. This patch does not invent contractual rates or update production secrets.

## Remaining validation and implementation

Live warehouse query validation, complete application build, rendered UI testing and deployment verification are required. The full independent reconciliation engine is not implemented; its screen explicitly reports NOT_VERIFIED. Call-join cardinality, repeated HLC records, activation transaction-ID uniqueness, local/UTC source interpretation, actual vendor tariffs and invoice/cash stages still need live evidence and further work. The retained base model is versioned separately; guarded transformations fail if their expected source expressions change. This is a bounded correction, not certification of every dashboard.

## Checks

`npm test` runs the actual pure request/permission/integrity helper tests. `npm run lint` checks application TypeScript and `npm run build` performs a separate build. A successful test is not a successful warehouse dry run. No dependency or public-access settings have been changed on the hosted application.
