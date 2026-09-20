# Audit implementation — 20 September 2026

Base revision: `7d320f59db563602993cabc617ce4c678dfae985`.
Model version: `2026-09-20.1`.

## Scope of this change

Implemented authenticated, tenant-authorised API boundaries with signed IAP identity; strict filter/value/date validation; scoped cache keys; query-byte ceilings; restricted discovery; removal of arbitrary raw queries; separate public/backend build directories; port configuration and structured non-sensitive API errors.

Implemented shared request-local vendor scope; activation fallback correction; one-time vendor-call-summary counting; observed rather than fabricated call evidence; transaction-ID conflict flags; deterministic duplicate-transaction revenue handling; corrected filtered exports and formula-safe CSV; accurate missing-data states; corrected overview and acquisition labels; real scope-preserving driver comparisons; event-specific cohort timestamps; maturity censoring; calculated timing quantiles; conservative unavailable costs where mappings are absent; honest lead-level reconciliation.

Added regression tests against the changed implementation modules. Tests stub the warehouse transport so they neither need credentials nor incur cloud query costs. These test JavaScript/TypeScript behaviour and SQL-generation contracts, not BigQuery execution plans or live warehouse counts.

## Deliberate behaviour changes

Authentication configuration is mandatory for all data endpoints in every environment. The implementation assumes Google IAP; it does not introduce its own password database, expose a service-account token to the browser, or accept unsigned identity headers. An IAP deployment and an explicit access policy must be configured before rollout.

The unrestricted `/api/bq/preview`, `/api/bq/journey-metrics` and `/api/bq/filter-options` routes return 410 after authorisation. Old UI consumers of those paths need migration to authenticated analytical endpoints/redacted exports; no claim is made that those legacy administrative workflows are unchanged.

Vendor filters mean vendor-attributed transaction outcomes. Dynamic first-vendor grouping is rejected with 422 rather than silently assigning multi-vendor revenue to one vendor. Media costs are unavailable under dimensional filters until supported allocation mappings are established. Revenue maturity and independent API/browser validation are unavailable rather than invented.

The backend's response-generation timestamp is not a source refresh timestamp. Older components may not yet display every new coverage/availability annotation; confirm their behaviour in browser acceptance tests.

## Unresolved business/data contracts

1. Confirm ledger lead IDs and dialler lead IDs are the same identifier domain, or provide a bridge table.
2. Confirm whether repeated HLC records are snapshots or independent transactions, and whether HLC total-call counters overlap. The MAX fallback is conservative, not an independently established business truth.
3. Confirm activation transaction-ID uniqueness, vendor namespaces, duplicate handling, and expected-versus-realised revenue definitions. Transaction conflicts are flagged rather than forced to match.
4. Confirm source timezone and normalise the reporting timezone only after that confirmation. No undocumented two-hour correction has been applied.
5. Confirm the actual media-spend field, channel/source/campaign/vendor allocation keys and financial recognition periods.
6. Supply approved, effective-dated rate cards and contract/event rules before implementing authoritative vendor P&L. No commercial rates, invoices, collected amounts or margins have been invented.
7. Independently reconcile calls, RPC, sales, activations and revenue under the same date/filter/grain contract. Only the supported raw unique-lead comparison is currently independent.
8. Review remaining advanced functions in `server/bigquery/queries.ts`, duplicate metric dictionaries and old administrative UI consumers. This change reroutes audited core endpoints but does not rewrite the entire legacy query module.

## Release acceptance gates

Run `npm ci && npm run verify` on a functioning runner. Confirm signature verification with valid, expired, wrong-audience and forged assertions. Check viewer/admin and cross-tenant denials through HTTP, not only helper tests. Confirm no raw source code or backend source maps can be retrieved from the deployment.

Dry-run and execute each changed SQL path against a non-production dataset with representative fixtures: no HLC; multiple vendors; repeated transactions; HLC-only activation; malformed/sentinel timestamps; missing calls; conflicting transaction IDs; zero/missing costs; and recent immature cohorts. Capture job IDs, bytes processed, sample records and expected results.

Reconcile dashboard totals to filtered CSV and JSON exports for a single vendor and an agreed reporting period. Verify truncated exports are labelled, formula-like text is escaped and redacted exports cannot expose new source columns.

Render desktop/mobile pages, test URL filters and navigation, error/retry/empty/loading states, accessibility and asynchronous tenant changes. Verify that no unsupported metric appears as zero or as independently reconciled.

## Verification record for this implementation session

Executable revision: `0e69f3bbad2842e69964e1925aaadc1f9773552d`.
GitHub Actions run: `35489228360` (PR run 7), completed successfully on 20 September 2026.

- Locked installation (`npm ci --ignore-scripts --no-audit`) passed on Node.js 22.23.2.
- Full configured application TypeScript check (`npm run lint`) passed with installed dependencies.
- Strict pure filter/integrity check (`npm run check:pure`) passed.
- All 35 implementation regression tests passed with a stubbed warehouse SDK transport.
- Production frontend and backend build (`npm run build`) passed.
- All seven production HTTP smoke checks passed against the built server: liveness, missing authentication configuration, missing signed identity, unsigned identity headers, protected raw-preview access, frontend serving, and denial of backend artifacts/dotfiles.
- All 32 implementation files matched local Git blob hashes; the reconstructed tree was `acbfa31f1e1704aeddfe3585a0621c2b03456bb3` before this documentation update.

The first CI attempt did not reach job steps. A later run exposed the existing package/lock mismatch for obsolete json2csv packages; removing the unused dependencies restored reproducible installs. Two new KPI-list typing errors were corrected before the successful run.

These successful checks do not establish live warehouse accuracy, real IAP acceptance, authenticated production access, browser rendering, accessibility, dependency-vulnerability clearance or financial reconciliation. The regression suite checks generated SQL contracts but does not execute those statements in BigQuery. The HTTP smoke suite uses no cloud credentials and deliberately tests unauthorised/fail-closed paths, not an authenticated data query.

No secrets, identity grants, production deployments, source warehouse tables or rate cards were changed. This branch should remain unmerged until the remaining release acceptance gates and authentication configuration are complete. Rollback is a normal revert of the implementation commits after preserving the prior deployment configuration; do not force-push over newer work.
