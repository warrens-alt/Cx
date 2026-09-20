with open("server/bigquery/client.ts", "r") as f:
    client = f.read()
import re
client = re.sub(r'FROM .* LIMIT 1', r'FROM \`${projectId}.${datasetId}.${tableId}\` LIMIT 1', client)
with open("server/bigquery/client.ts", "w") as f:
    f.write(client)

with open("server/bigquery/views.ts", "r") as f:
    views = f.read()
# Note: we need the output file to contain exactly: FROM \`${client.projectId}.${client.datasetId}.${client.leadLedgerTable}\`
views = re.sub(r'EXTRACT.*?FROM .*', r'EXTRACT(YEAR FROM capture_timestamp) IN (1900, 1970) as sentinel_capture\n      FROM \`${client.projectId}.${client.datasetId}.${client.leadLedgerTable}\`', views, flags=re.DOTALL)
with open("server/bigquery/views.ts", "w") as f:
    f.write(views)
