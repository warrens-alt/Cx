const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalFilter.tsx', 'utf8');

content = content.replace(/<span className="text-sm font-semibold text-text-main">MTN<\/span>/, `{clients.length > 0 ? (
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="text-sm font-semibold text-text-main bg-transparent border-none outline-none cursor-pointer appearance-none pr-4"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: '1em' }}
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-semibold text-text-main">Loading Client...</span>
            )}`);

// We need to add state for `clients` and `selectedClient` from the context or fetch them
content = `import { useClient } from '../lib/ClientContext';\n` + content;
content = content.replace(/const \{ startDate,/, `const { selectedClient, setSelectedClient, clients } = useClient();\n  const { startDate,`);

fs.writeFileSync('src/components/GlobalFilter.tsx', content);
