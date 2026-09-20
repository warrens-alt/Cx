const { Resource } = require('@google-cloud/resource-manager');
const rm = new Resource();
rm.getProjects().then(([projects]) => console.log(projects.length)).catch(console.error);
