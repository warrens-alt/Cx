import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const drilldownTypes = `
        case 'untouched':
          typeFilter = "AND h.expected_first_dial NOT IN ('1970-01-01 00:00:01', '1900-01-01 00:00:00') AND h.expected_first_dial IS NOT NULL AND h.expected_first_dial != '' AND (h.first_call_date IN ('1970-01-01 00:00:01', '1900-01-01 00:00:00') OR h.first_call_date IS NULL OR h.first_call_date = '')";
          break;
        case 'stl_bucket':
          if (metric === 'Under 24h') {
            typeFilter = "AND TIMESTAMP_DIFF(SAFE_CAST(h.first_call_date AS TIMESTAMP), SAFE_CAST(c.fetched AS TIMESTAMP), HOUR) < 24";
          } else if (metric === '1-3 days') {
            typeFilter = "AND TIMESTAMP_DIFF(SAFE_CAST(h.first_call_date AS TIMESTAMP), SAFE_CAST(c.fetched AS TIMESTAMP), DAY) >= 1 AND TIMESTAMP_DIFF(SAFE_CAST(h.first_call_date AS TIMESTAMP), SAFE_CAST(c.fetched AS TIMESTAMP), DAY) < 3";
          } else if (metric === '3-7 days') {
            typeFilter = "AND TIMESTAMP_DIFF(SAFE_CAST(h.first_call_date AS TIMESTAMP), SAFE_CAST(c.fetched AS TIMESTAMP), DAY) >= 3 AND TIMESTAMP_DIFF(SAFE_CAST(h.first_call_date AS TIMESTAMP), SAFE_CAST(c.fetched AS TIMESTAMP), DAY) < 7";
          } else if (metric === '7-30 days') {
            typeFilter = "AND TIMESTAMP_DIFF(SAFE_CAST(h.first_call_date AS TIMESTAMP), SAFE_CAST(c.fetched AS TIMESTAMP), DAY) >= 7 AND TIMESTAMP_DIFF(SAFE_CAST(h.first_call_date AS TIMESTAMP), SAFE_CAST(c.fetched AS TIMESTAMP), DAY) < 30";
          } else if (metric === '30+ days') {
            typeFilter = "AND TIMESTAMP_DIFF(SAFE_CAST(h.first_call_date AS TIMESTAMP), SAFE_CAST(c.fetched AS TIMESTAMP), DAY) >= 30";
          }
          typeFilter += " AND h.first_call_date IS NOT NULL AND h.first_call_date != '' AND h.first_call_date != '1970-01-01 00:00:01' AND c.fetched IS NOT NULL";
          break;
        case 'lag_bucket':
          if (metric === '< 15 mins') {
            typeFilter = "AND TIMESTAMP_DIFF(SAFE_CAST(h.first_call_date AS TIMESTAMP), SAFE_CAST(h.expected_first_dial AS TIMESTAMP), SECOND) >= 0 AND TIMESTAMP_DIFF(SAFE_CAST(h.first_call_date AS TIMESTAMP), SAFE_CAST(h.expected_first_dial AS TIMESTAMP), SECOND) < 900";
          } else if (metric === '15-60 mins') {
            typeFilter = "AND TIMESTAMP_DIFF(SAFE_CAST(h.first_call_date AS TIMESTAMP), SAFE_CAST(h.expected_first_dial AS TIMESTAMP), SECOND) >= 900 AND TIMESTAMP_DIFF(SAFE_CAST(h.first_call_date AS TIMESTAMP), SAFE_CAST(h.expected_first_dial AS TIMESTAMP), SECOND) < 3600";
          } else if (metric === '1-4 hours') {
            typeFilter = "AND TIMESTAMP_DIFF(SAFE_CAST(h.first_call_date AS TIMESTAMP), SAFE_CAST(h.expected_first_dial AS TIMESTAMP), SECOND) >= 3600 AND TIMESTAMP_DIFF(SAFE_CAST(h.first_call_date AS TIMESTAMP), SAFE_CAST(h.expected_first_dial AS TIMESTAMP), SECOND) < 14400";
          } else if (metric === '4+ hours') {
            typeFilter = "AND TIMESTAMP_DIFF(SAFE_CAST(h.first_call_date AS TIMESTAMP), SAFE_CAST(h.expected_first_dial AS TIMESTAMP), SECOND) >= 14400";
          }
          typeFilter += " AND h.first_call_date IS NOT NULL AND h.first_call_date != '' AND h.first_call_date != '1970-01-01 00:00:01' AND h.expected_first_dial IS NOT NULL AND h.expected_first_dial != '' AND h.expected_first_dial != '1970-01-01 00:00:01'";
          break;
        case 'vendor_lag':
          typeFilter = "AND h.vendor = @metric";
          params.metric = metric;
          break;
`;

content = content.replace(
  "case 'untouched':\n          typeFilter = \"AND h.expected_first_dial NOT IN ('1970-01-01 00:00:01', '1900-01-01 00:00:00') AND h.expected_first_dial IS NOT NULL AND h.expected_first_dial != '' AND (h.first_call_date IN ('1970-01-01 00:00:01', '1900-01-01 00:00:00') OR h.first_call_date IS NULL OR h.first_call_date = '')\";\n          break;",
  drilldownTypes
);

fs.writeFileSync('server.ts', content);
