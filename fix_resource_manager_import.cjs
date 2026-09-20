const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace("const { Resource } = require('@google-cloud/resource-manager');", "const { ProjectsClient } = require('@google-cloud/resource-manager');");
code = code.replace("const resource = new Resource({ credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS || '{}') });", "const projectsClient = new ProjectsClient({ credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS || '{}') });");
code = code.replace("const [projects] = await resource.getProjects();", "const [projects] = await projectsClient.searchProjects({});");

// Let's also fix the mapping since the result of searchProjects is different.
code = code.replace("res.json({ success: true, data: projects.map(p => ({ id: p.id, name: p.metadata.name })) });", "res.json({ success: true, data: projects.map(p => ({ id: p.projectId, name: p.displayName })) });");

fs.writeFileSync('server.ts', code);
