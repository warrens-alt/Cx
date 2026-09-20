# Performance Intelligence Platform

This application is a comprehensive operational analytics and performance intelligence platform designed for lead generation, call-centre performance, commercial attribution, and revenue tracking. It provides actionable insights by connecting directly to Google BigQuery and visualizing data across the entire lead-to-activation lifecycle.

## What the App Does

The platform acts as a unified decision engine for executives, marketing managers, and call-centre operators. It translates raw operational data into clear commercial metrics:

1.  **Executive Overview & Unit Economics**: Tracks total spend, calculated revenue, gross profit, and ROI.
2.  **Commercial Control Centre**: Provides strategic decision intelligence on which sources to Scale, Maintain, Watch, or Pause based on downstream ROI and conversion rates.
3.  **Revenue Tracking**: Visualizes daily trends in ad spend versus generated revenue based on brand-specific rate cards.
4.  **Lead Lifecycle Funnel**: Maps the journey from fetched to activated to identify leakage.
5.  **Source & Vendor Profitability**: Ranks lead sources and vendors.
6.  **Call Centre & Agent Performance**: Monitors dialer efficiency, outcomes, and agent conversion.
7.  **Operational Strategy**: Analyzes Speed-to-Lead and Retry Strategies.
8.  **Brand-Specific Dashboards**: Tailored views for Mondo, MTN, and BLC.
9.  **Data Quality & Dialler QA**: Proactively identifies anomalies in the data.

## Architecture

*   **Frontend**: React (Vite) + Tailwind CSS + Recharts + React Router. Includes global filtering via context and URL search parameters.
*   **Backend**: Node.js + Express.
*   **Database**: Google BigQuery (`dashboards-422710` project, `vibe_coding_data` dataset).
*   **Security**: No BigQuery credentials or sensitive PII are exposed in the frontend. All data access is handled securely via server-side Express APIs.
*   **Caching**: Server-side in-memory caching is implemented to reduce load on BigQuery.

## BigQuery Tables Used

1.  **Lead Ledger** (`tbl_offershop_lead_ledger`): The source of truth for the lead lifecycle.
2.  **Call Analytics** (`tbl_vibe_code_warren_stear_ontact_analytics_api`): Call-attempt-level data.
3.  **Offline/Media Data** (`tbl_vibe_code_warren_stear_ontact_ofline_data`): Daily aggregated performance.

## Rate Card Logic

The backend dynamically calculates expected revenue based on a configurable commercial rate card mapping events to specific rates (e.g., Mondo Class A = R75, MTN Activation = R200, BLC Charcoal = R550).

## Environment Setup

Required environment variables (`.env`):

```env
PORT=3000
BIGQUERY_PROJECT_ID=dashboards-422710
BIGQUERY_DATASET=vibe_coding_data
GOOGLE_APPLICATION_CREDENTIALS=/secure/path/to/service-account.json
```

*(Do not commit actual credentials to version control. See `.env.example`)*

## How to Run Locally

1. Install dependencies: `npm install`
2. Create your `.env` file from `.env.example`.
3. Start the application: `npm run dev`
4. Access the app at `http://localhost:3000`

## API Endpoints

- `GET /api/overview` - Executive KPIs and funnel metrics.
- `GET /api/revenue` - Daily revenue vs spend.
- `GET /api/sources` - Performance by source.
- `GET /api/calls` - Call centre performance and retry strategies.
- `GET /api/agents` - Agent conversion metrics.
- `GET /api/brand/:brand` - Specific brand KPIs (Mondo, MTN, BLC).
- `GET /api/dialler-qa` - Data quality checks.
- `GET /api/lifecycle` - Lead conversion pipeline.
- `GET /api/speed-to-lead` - Analysis of speed to first dial.

## Dashboard Pages

- **Overview**: High-level executive summary.
- **Commercial Control Centre**: Source tracking and ROI.
- **Revenue**: Expected and actual revenue trends.
- **Call Centre & Agents**: Operational metrics and performance.
- **Speed-to-Lead**: Time-to-dial impact analysis.
- **Retry Strategy**: Call attempt efficiency.
- **Brand Dashboards**: Dedicated breakdowns for BLC, Mondo, and MTN.
- **Dialler QA**: System health and missing mapping errors.

## Security & PII Handling

- **No Frontend Credentials**: All Google Cloud/BigQuery keys are strictly held server-side.
- **PII Masking**: Personal details (names, raw phone numbers, emails, addresses, DOB) from the call analytics table are stripped out by the server before returning the JSON payload. The UI uses only obfuscated/masked identifiers where needed.

## Known Limitations

- **BLC Segment Mapping**: BLC rate card calculation depends on fuzzy mapping logic or strings inside call center comments. Activations missing reliable segment flags fall back to estimates.
- **Data Latency**: Historical tables may have up to 24 hours of latency depending on offline data synchs.
- **Historical Recalculations**: Modifying the global rate card retroactively changes past expected revenue, unlike an immutable ledger.

## Future Improvements

- Fully automated BLC segment mapping rules via webhook.
- Custom PDF/CSV export engine for daily stakeholder reporting.
- Anomaly alerting via Slack/Teams.
- Cost-of-Sale (CPA) cohort tracking for longitudinal list performance.
