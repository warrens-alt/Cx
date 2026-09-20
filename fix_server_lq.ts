import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

if (!content.includes('lq_dedupe_failures')) {
  content = content.replace(
    "case 'dq_missing_id':",
    `case 'lq_dedupe_failures':
          typeFilter = "AND c.vetting_status = 'failed_duplicate'";
          break;
        case 'dq_missing_id':`
  );
  fs.writeFileSync('server.ts', content);
}
