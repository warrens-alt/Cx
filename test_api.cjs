const http = require('http');
http.get('http://localhost:3000/api/analytics/speed-to-lead?clientId=default', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => { console.log(data); });
}).on("error", (err) => { console.log("Error: " + err.message); });
