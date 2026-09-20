const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace("import { Resource } from '@google-cloud/resource-manager';", "import { Resource } from '@google-cloud/resource-manager';");
// Actually, it might be `const { Resource } = require('@google-cloud/resource-manager');`
code = code.replace("import { Resource } from '@google-cloud/resource-manager';", "const { Resource } = require('@google-cloud/resource-manager');");
fs.writeFileSync('server.ts', code);
