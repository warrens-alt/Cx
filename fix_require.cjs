const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace("const { ProjectsClient } = require('@google-cloud/resource-manager');", "import { ProjectsClient } from '@google-cloud/resource-manager';");

fs.writeFileSync('server.ts', code);
