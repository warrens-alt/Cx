# ConversionX — operational and revenue analytics

React/Vite client, Express server and Google BigQuery analytical queries. The application reports lead-capture cohorts and vendor-attributed operational outcomes. It is not an independently reconciled accounting ledger.

## Installation and checks

Use Node.js 22. Dependencies remain pinned by the existing `package-lock.json`.

```sh
npm ci
npm run lint
npm run check:pure
npm test
npm run build
```

`npm run verify` runs all four checks. `npm test` compiles and executes the checked-in reporting, filter, export and authorisation modules with a stubbed warehouse transport. It does not execute SQL in BigQuery, verify real IAP signatures, render a browser or certify production data.

`npm run dev` serves on localhost:3000. `npm start` runs the production bundle. Production serves only `dist/client`; backend code is written to `dist/server/server.mjs` and is not a static asset. `PORT` is configurable.

## Access configuration — required before deployment

All data endpoints now fail closed. The public `/api/health` endpoint reports process liveness only. Configure Google Cloud Identity-Aware Proxy (IAP) or an equivalent deployment path that supplies a genuine IAP-signed assertion to this application. The application verifies the JWT signature, issuer, expiry and exact resource audience using `google-auth-library`.

Set server-side environment variables:

- `IAP_AUDIENCE`: exact audience for the protected IAP resource.
- `CX_ACCESS_POLICY_JSON`: identity-to-tenant permissions, for example `{"analyst@example.com":{"tenants":["default_tenant"],"role":"viewer"}}`.
- `APP_ORIGIN`: the public HTTPS application origin.

The example address is illustrative, not a pre-authorised account. An `admin` role is needed for discovery/configuration endpoints and optional redacted raw-source exports. There is no wildcard-tenant grant and no development authentication bypass. A domain-wide grant requires a matching signed hosted-domain claim; use explicit email grants where IAP does not provide that claim.

Direct access without a signed identity returns 401. Missing authentication configuration returns 503. Unknown tenants are rejected rather than silently falling back. Google documents IAP integration at https://cloud.google.com/iap/docs/signed-headers-howto.

Do not merge/deploy this branch into an existing public instance until IAP, resource audience and access policy have been configured and tested. No deployment settings, identity grants or cloud credentials are supplied by this change.

## BigQuery configuration

The existing tenant mapping is retained in `server/bigquery/config.ts`. It references lead, media, call, time-to-dial and activation sources in the `dashboards-422710.lead_ledger` dataset. Prefer workload identity / Application Default Credentials with least-privilege read and query-job permissions. Optional `BIGQUERY_CREDENTIALS` must be valid server-side JSON; malformed credentials no longer silently change the identity used.

`BIGQUERY_MAX_BYTES_BILLED` defaults to 1,000,000,000 bytes **per query**. This is not a daily/project budget; a report can issue multiple queries. Establish a suitable tested query ceiling and project-level cost controls before rollout.

The timestamp conversion retains the legacy UTC interpretation for timezone-free source strings. Source timezone and ingestion latency have not been independently verified. Response `generatedAt` is not warehouse freshness; `dataAsOf` remains unavailable rather than pretending response time is data time.

## Reporting semantics

Vendor filters restrict vendor transactions before lead roll-up. They no longer mean “all downstream outcomes from any lead that touched this vendor.” Capture dates select the acquisition cohort; later observed outcomes can change that cohort's results. This is distinct from an event-date or accounting-period report.

Call logs are aggregated once per ledger lead/vendor. A reporting anchor prevents the vendor's call total being repeated on every HLC transaction. HLC-only summaries use a conservative maximum per lead/vendor; this fallback must be checked against the source's snapshot-versus-event semantics. Ambiguous transaction-level timing is explicitly excluded from first-dial timing. The model does not invent calls or timestamps from a sale.

Activations accept timestamp evidence from either the matched activation source or HLC. Conflicting transaction IDs spanning lead/vendor combinations are flagged and do not receive the external activation join. Duplicate transaction revenue is retained once according to a deterministic reporting rank. Identifier domains, duplicate-source-row handling and the ranking policy still require warehouse-owner validation.

Sales, RPC and activation cohorts use their respective observed event timestamps. Unobservable D1–D30 intervals remain null. Revenue maturation is unavailable without a revenue-event/receipt ledger. A positive expected/recorded revenue amount is not proof of invoicing or cash collection.

Actual media cost is not inferred from a field named `budget`. Set `BIGQUERY_MEDIA_SPEND_FIELD` only after confirming the field's meaning. Costs under vendor/source/other filters remain unavailable until verified media-allocation keys are supplied. Campaign-level reporting is not fabricated from channel-level rows. Vendor-grouped dynamic exploration is rejected explicitly pending a suitable grain-aware metric definition; existing transaction vendor breakdowns remain available.

## Exports and optional AI explanations

Filtered lead and transaction exports use explicit projections, share the report scope, enforce a maximum row count and disclose truncation. CSV files include scope/model metadata and guard against formula execution. `raw_source` is an **allowlisted, redacted evidence export**, not an unrestricted warehouse dump; it requires an admin and `ALLOW_RAW_EXPORTS=true`.

Arbitrary BigQuery preview, journey-metrics and filter-options endpoints under `/api/bq` are retired. Use the authenticated analytical API. Project/dataset/table discovery is limited to configured and authorised tenants.

AI explanation generation is disabled by default. Enabling `ENABLE_AI_EXPLANATIONS=true` and a server-side `GEMINI_API_KEY` permits selected overview aggregates to be sent to Gemini. The API recomputes those aggregates rather than trusting arbitrary caller-provided data. Review this external data-processing permission before enabling it.

## Validation and remaining work

The validation screen preserves missing evidence and raw zero values. It independently compares unique leads for supported scopes. It does **not** claim to have independently measured the browser or API rendering. Other reconciliations remain `NOT_VERIFIED`, and any measured failure propagates to the overall status.

See `docs/AUDIT_IMPLEMENTATION.md` for implemented changes, deliberate restrictions, test coverage and required acceptance checks. Several advanced operational query functions remain in the legacy `server/bigquery/queries.ts`; this patch is not a claim that every advanced dashboard has been certified.
