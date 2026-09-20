const projectId = 'my-project';
const datasetId = 'my_dataset';
const tableId = 'my_table';
const query = `SELECT * FROM \`${projectId}.${datasetId}.${tableId}\` LIMIT 50`;
console.log(query);
