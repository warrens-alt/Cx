const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = `import { ClientProvider } from './lib/ClientContext';\n` + content;
content = content.replace(/<FilterProvider>/, `<ClientProvider><FilterProvider>`);
content = content.replace(/<\/FilterProvider>/, `</FilterProvider></ClientProvider>`);

fs.writeFileSync('src/App.tsx', content);
