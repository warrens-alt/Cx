const fs = require('fs');
let content = fs.readFileSync('server/bigquery/config.ts', 'utf8');

content = content.replace(/fields: Record<string, string>;/, `fields: Record<string, string>;\n    partners?: string[];`);
content = content.replace(/fields: \{\}/g, `fields: {},\n      partners: ['affiliate', 'bizvoip', 'blc', 'mtn', 'rewardsco']`);
fs.writeFileSync('server/bigquery/config.ts', content);

let viewsContent = fs.readFileSync('server/bigquery/views.ts', 'utf8');

const rorBlock = `[
          STRUCT('AFFILIATE' as partner, l.ror_affiliate as timestamp),
          STRUCT('BIZVOIP' as partner, l.ror_bizvoip as timestamp),
          STRUCT('BLC' as partner, l.ror_blc as timestamp),
          STRUCT('MTN' as partner, l.ror_mtn as timestamp),
          STRUCT('REWARDSCO' as partner, l.ror_rewardsco as timestamp)
        ] as ror_events,`;

const rorReplacement = `\${client.semanticMappings.partners && client.semanticMappings.partners.length > 0 ? 
          '[' + client.semanticMappings.partners.map(p => \`STRUCT('\${p.toUpperCase()}' as partner, l.ror_\${p.toLowerCase()} as timestamp)\`).join(',\\n') + '] as ror_events,' 
          : '[] as ror_events,'}`;

viewsContent = viewsContent.replace(rorBlock, rorReplacement);
fs.writeFileSync('server/bigquery/views.ts', viewsContent);
