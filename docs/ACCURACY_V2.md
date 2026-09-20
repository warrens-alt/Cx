# Accuracy architecture v2 — implementation and rollout

This is a new reporting path, not another string-replacement wrapper around the old SQL. Runtime metrics live in `contracts/reporting.ts`; the API, exact-format UI, snapshot execution service and exports consume that contract. The old application remains separately labelled **legacy, unverified exploration**. No old query is a fallback for a missing published release.

## Implemented reporting slice

Twelve metrics across six distinct facts: fetched lead submissions, vendor delivery episodes, observed call events, called delivery episodes and their coverage, sale events, activation events, sale-to-activation coverage, and expected/approved/invoiced/collected signed commercial deltas. UTC capture-cohort and event-date modes are distinct. Event-date ratios and overlapping first-vendor attribution are explicitly unsupported. Media allocation, RPC mappings, cohort maturation, operating-hours SLAs, rate-card valuation and complete vendor P&L require additional approved contracts and are **not certified by this slice**.

The default page is `/reports`. It reads `/api/reporting`, behind the existing verified IAP identity middleware. Report requests fix tenant, metric version, date basis, observation cutoff, currency, dimensions and filters. A signed identity-bound token fixes the exact release manifest; replay rechecks current tenant access and snapshot object identity. A changed or revoked release is rejected. Tokens are not authentication credentials and cannot bypass the normal identity gateway.

Reports read only actual BigQuery SNAPSHOT tables. The service verifies snapshot creation times and snapshot times before execution. It never treats a timestamp label or in-memory cache as immutable source storage. Raw source versions, batch manifests and source contracts are also snapshotted. Report IDs are reproducible hashes of the canonical request plus release hash. Request generation time is not data freshness.

Amounts and counts are serialized as exact decimal strings. The UI does not convert them to JavaScript floating-point values. Ratios aggregate numerators and denominators once in BigQuery. Evidence exports replay the same population query and token. Exports above 50,000 records fail explicitly rather than quietly truncating. Evidence JSON retains raw decimal strings, record keys, source IDs, batch IDs and scope.

## Deploy without changing the original source warehouse

1. Provision **new** raw, per-build candidate and reporting datasets in the confirmed source region. `npm run warehouse:bootstrap -- --project PROJECT --raw cx_raw --reporting cx_reporting --location REGION` prints DDL only. Add `--execute` only after reviewing location and IAM. The script does not touch `lead_ledger`.
2. Have source owners approve canonical adapters and register source contracts in `cx_raw.source_contracts`. `warehouse/reference/source-contract.example.json` is deliberately DRAFT, not an approval. Parent identifiers must be resolved explicitly. Cumulative HLC totals cannot be imported as call events. Different source IDs are separate namespaces.
3. Retain original source files and provenance. The import command validates a canonical NDJSON batch against the approved contract and preserves source record IDs, revision numbers, ingestion time, payload hashes and batch checksum. `npm run warehouse:ingest -- --input FILE --contract CONTRACT --batch STABLE_ID --dataset PROJECT.cx_raw` validates only; `--execute` loads an atomic completed batch. Repeat the same batch ID and checksum for a no-op replay. Reused IDs with differing content fail. Failed staging tables are retained for investigation. Serialize ingestion of the same batch; duplicate-batch assertions block publication after an unexpected concurrent race.
4. Install the pinned Dataform CLI. With `workflow_settings.yaml`, dependencies are installed by the compiler; do not run `dataform install`. In an isolated build checkout, set `defaultDataset` to a **new** `cx_candidate_BUILD_ID`, set the tenant/source/cutoff variables in `workflow_settings.yaml`, and compile with `dataform compile warehouse --json`. The placeholder cutoff in the checked-in file is 1970, so it cannot silently publish current data. Confirm CLI overrides in the compiled graph before executing `dataform run`. Do not reuse a build dataset.
5. Execute the candidate graph and its assertions. Six fact models retain independent event grains. `ready_to_snapshot` explicitly depends on all eight release assertions. Compilation is not execution and is not source reconciliation.
6. Prepare an approved publisher input with releaseId, tenantId, candidateDataset, reportingDataset, cutoff, approvedBy, approvalReference and one source evidence record per fact. Sources specify status, earliestAvailable, completeThrough, contractVersion, owner and approvalReference. A count may be displayed as PARTIAL; a coverage ratio is withheld when supporting windows are incomplete. Unavailable feeds are never replaced by zero.
7. `npm run warehouse:publish -- --manifest approved-inputs.json` previews publication. With `--execute`, it first freezes all facts and provenance at a common warehouse time, runs independent checks against those **snapshots**, and inserts the release manifest only if every check passes. A failed release remains unpublished; it never replaces the last published release. Preserve failed snapshots for investigation. No automated cleanup, retention period or source approval is invented.
8. Configure `CX_REPORTING_DATASET=PROJECT.cx_reporting` and a server-only `CX_REPORT_SIGNING_KEY` of at least 32 random bytes. Configure them using deployment secret management; do not commit keys. The application identity should have read/query access to published reporting objects, not raw ingestion or publishing rights. Publisher/ingester identities need narrowly scoped separate write privileges.
9. Run `npm run warehouse:test -- --project TEST_PROJECT --location REGION --execute` for opt-in execution of the production SQL against hand-authored synthetic records in a new ephemeral dataset. It does not touch the original sources and is not run by default CI. Then perform source-owner reconciliation before approving live reports. HTTP/UI fixture checks are not live-data proof. Keep source history, contract approvals and rate versions according to approved retention/privacy policy.

## Release checks and failure behaviour

The publisher executes eight independently named checks with saved BigQuery job IDs: revision conflicts, batch accounting, fact uniqueness/required fields, parent relationships, chronology, monetary precision/stages, raw-to-fact distinct-identity counts, and per-field raw-to-fact reconciliation. Each compares actual failure count with exact zero. No semantic result is copied into an API/UI validation field. Publication also requires explicit source evidence and approval references.

These checks establish structural model invariants; they cannot establish that a source owner supplied all real-world events. Source accuracy and completeness remain separately declared, reviewable evidence. An approved release is not an audit opinion on financial statements.

A source-event cutoff filters observed event times. The release cutoff fixes the knowledge available to the system. Selecting an earlier event cutoff against a newer release does not reconstruct information that was never retained. Use an earlier retained release for earlier knowledge-state reporting. Cancellation/current-active balances are distinct from nominal event counts; payment corrections are signed deltas, never overwrites.

## Verification

`npm test` includes strict report-scope, signature, permission, missing-data, exact-number, independent synthetic fixture, ingestion and HTTP tests. `tooling/browser/smoke.mjs` checks the built frontend on desktop/mobile with labelled synthetic API fixtures and verifies stale-result suppression, missing denominators, precision and evidence IDs. The Dataform compilation check verifies graph dependencies. None of these claims to execute production SQL.

The full live source integration cannot be automatically approved from repository code. Do not set COMPLETE coverage, approve a source contract, or publish a rate card merely to make a screen show numbers.

## Remaining migrations

The legacy endpoints are unchanged except for an explicit unverified header/banner. They have not been retroactively certified. Move additional metrics and screens into the v2 contract only after their source mapping, grain, date semantics, independent reference cases and frozen release checks are implemented. Do not delete old reporting history or silently redirect a legacy number to a differently defined metric.

Reporting releases also bind the engine source fingerprint. `node scripts/engine-stamp.cjs --check` prevents silent implementation drift; regenerate and commit the fingerprint after model changes, and publish a separately validated release. A matching version label alone is not sufficient.


## Verified implementation state

Implementation commit on `main`: `8d790659b3d61c692b10b5bda039e8c4e6b7eb19`.
Successful GitHub Actions run: `35492085845` (20 September 2026).

- Locked application dependency installation passed.
- Reporting engine source fingerprint passed.
- Full configured application TypeScript check passed.
- All **101 tests** passed: existing guards plus the new report contract, independent fixture, ingestion, identity-bound replay and HTTP tests. Test HTTP principals/repositories are injected only in test code.
- Production frontend and backend build passed.
- Dataform compiled **10 table models, 20 assertions and one publication-gate operation**, with no compilation errors. The gate's explicit assertion dependencies were checked. This is compilation, not SQL execution in BigQuery.
- **18 browser assertions passed**, across 1440×1000 and 390×844 Chromium viewports. The flow was `/reports` → explicit scope → report → evidence drill-down → changed filters → stale-result suppression → missing-release state. Responses were handwritten synthetic fixtures, not live warehouse results. No page runtime errors were captured.
- Rendered screenshots were inspected at both sizes. The code and source archive were compared byte-for-byte for the initial implementation; subsequent changes fix the explicit Dataform dependency graph.

Browser plugin was not available in this session; Playwright ran in GitHub Actions. Verification artifacts contain the compiled warehouse graph, synthetic browser result counts, screenshots and the exact tooling dependency lock generated for that run. Tooling direct versions are pinned, but a permanent tooling lockfile is not yet checked into the repository. Application dependency installation uses the existing committed lockfile.

Not executed: live canonical-source ingestion, warehouse bootstrap/publication, real BigQuery fixture SQL, production IAP acceptance, business/source-owner reconciliation, rate-card approval, media allocation or a live production deployment. The new report screen will correctly show **No approved release available** until the required infrastructure, approved canonical inputs and a validated snapshot release are configured. Legacy screens remain unverified.
