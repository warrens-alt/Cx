const fs = require('fs');

let file = fs.readFileSync('server/bigquery/semantic_engine.ts', 'utf8');

// Replace ALLOWED_DIMENSIONS constant with a function that takes timezone
file = file.replace(
  /export const ALLOWED_DIMENSIONS: Record<string, string> = \{([\s\S]*?)\};/,
  "export const getAllowedDimensions = (timezone: string): Record<string, string> => ({\n$1\n});"
);

// We need to inject the timezone into the HOUR and WEEKDAY extracts.
// Since we now return a function, let's fix the HOUR and WEEKDAY definitions
file = file.replace(
  /hour: "CAST\(EXTRACT\(HOUR FROM capture_timestamp\) AS STRING\)"/,
  "hour: `CAST(EXTRACT(HOUR FROM DATETIME(capture_timestamp, '${timezone}')) AS STRING)`"
);
file = file.replace(
  /weekday: "CAST\(EXTRACT\(DAYOFWEEK FROM capture_timestamp\) AS STRING\)"/,
  "weekday: `CAST(EXTRACT(DAYOFWEEK FROM DATETIME(capture_timestamp, '${timezone}')) AS STRING)`"
);

// Now update references in the file from ALLOWED_DIMENSIONS to getAllowedDimensions(client.timezone)
file = file.replace(/ALLOWED_DIMENSIONS\[/g, "getAllowedDimensions(client.timezone)[");
file = file.replace(/!ALLOWED_DIMENSIONS\[/g, "!getAllowedDimensions(client.timezone)[");

fs.writeFileSync('server/bigquery/semantic_engine.ts', file);
