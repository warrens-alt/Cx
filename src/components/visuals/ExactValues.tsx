import React, { useDeferredValue, useMemo, useState } from 'react';
import { datasetsFor } from '../../lib/visuals/datasets';
import { decimal, exactLabel, field, type VisualDataset } from '../../lib/visuals/model';
import { exactColumns, exactRows, exactTableCsv } from '../../lib/visuals/exactTable';
import '../../styles/visuals.css';

export default function ExactValues({data, title, note}: {data: unknown; title: string; note?: string}) {
  const datasets = useMemo(() => datasetsFor(`chart.${title}`, data, {title, note}), [data, title, note]);
  const [chosen, setChosen] = useState('');
  const dataset = datasets.find(item => item.id === chosen) || datasets[0];
  if (!dataset) return <p role="status">No returned chart data is available.</p>;
  return <section className="cx-exact-data" aria-label={`Exact values: ${title}`}>
    <h2>{title}: exact values</h2>
    {datasets.length > 1 && <label>Dataset<select aria-label="Exact values dataset" value={dataset.id} onChange={event => setChosen(event.target.value)}>
      {datasets.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
    </select></label>}
    <ExactTable key={dataset.id} dataset={dataset}/>
  </section>;
}

function ExactTable({dataset}: {dataset: VisualDataset}) {
  const [search, setSearch] = useState(''), [sort, setSort] = useState('');
  const [direction, setDirection] = useState<'ascending' | 'descending'>('ascending');
  const [page, setPage] = useState(0), [size, setSize] = useState(25), [notice, setNotice] = useState('');
  const deferredSearch = useDeferredValue(search), updating = search !== deferredSearch;
  const columns = useMemo(() => exactColumns(dataset), [dataset]);
  const matching = useMemo(() => exactRows(dataset, deferredSearch, sort, direction), [dataset, deferredSearch, sort, direction]);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(matching.length / size) - 1));
  const offset = currentPage * size, displayed = matching.slice(offset, offset + size);
  const changeSort = (key: string) => {setDirection(sort === key && direction === 'ascending' ? 'descending' : 'ascending');setSort(key);setPage(0);};
  const download = (scope: 'displayed' | 'matching' | 'loaded') => {
    const rows = scope === 'loaded' ? dataset.rows : (scope === 'displayed' ? displayed : matching).map(item => item.row);
    const url = URL.createObjectURL(new Blob([exactTableCsv(dataset, rows)], {type: 'text/csv;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;link.download = `cx-${dataset.id.replace(/[^\w-]+/g, '-').slice(0, 80)}-${scope}.csv`;link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`Exported ${rows.length} ${scope} rows from this response.`);
  };
  return <>
    <p>{dataset.note}</p>
    <div className="cx-exact-tools">
      <label>Search exact values<input type="search" aria-label="Search exact values" maxLength={200} value={search} onChange={event => {setSearch(event.target.value);setPage(0);}}/></label>
      <label>Rows per page<select aria-label="Exact rows per page" value={size} onChange={event => {setSize(Number(event.target.value));setPage(0);}}>{[25, 50, 100].map(value => <option key={value}>{value}</option>)}</select></label>
    </div>
    <p role="status" aria-live="polite">{updating ? 'Updating local search…' : `${dataset.rows.length} returned rows · ${matching.length} matching · ${matching.length ? offset + 1 : 0}–${offset + displayed.length} displayed.`} API limits and reporting limitations still apply.</p>
    <div className="cx-exact-scroll" tabIndex={0} role="region" aria-label="Exact chart values table; scroll horizontally for more columns" aria-busy={updating}>
      <table className="cx-exact-table"><caption className="sr-only">{dataset.title}: returned chart values, local display only</caption>
        <thead><tr>{columns.map(column => <th key={column.key} scope="col" className={column.numeric ? 'cx-exact-number' : ''} aria-sort={sort === column.key ? direction : 'none'}>
          <button type="button" onClick={() => changeSort(column.key)}>{column.label}<span aria-hidden="true">{sort === column.key ? direction === 'ascending' ? ' ↑' : ' ↓' : ' ↕'}</span></button>
        </th>)}</tr></thead>
        <tbody>{displayed.map(({row, index}) => <tr key={index}>{columns.map(column => {
          const value = field(row, column.key), exact = decimal(value);
          return <td key={column.key} className={column.numeric ? 'cx-exact-number' : ''}>{value === null || value === undefined ? 'Unavailable' : column.numeric && exact !== null ? exactLabel(exact) : typeof value === 'boolean' ? String(value) : String(value)}</td>;
        })}</tr>)}</tbody>
      </table>
      {!matching.length && <p role="status">{dataset.rows.length ? 'No loaded rows match this search. Clear the search to return to the loaded data.' : 'No rows were returned; this is not a measured zero.'}</p>}
    </div>
    <nav className="cx-exact-pagination" aria-label="Exact values pages"><button type="button" disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage + 1} of {Math.max(1, Math.ceil(matching.length / size))}</span><button type="button" disabled={offset + size >= matching.length} onClick={() => setPage(currentPage + 1)}>Next</button></nav>
    <details className="cx-viz-exports"><summary>Export exact chart values</summary><p>Exports contain only this loaded response, not all warehouse data. Local search does not change the query.</p><div className="cx-exact-tools"><button type="button" disabled={updating || !displayed.length} onClick={() => download('displayed')}>Export displayed rows</button><button type="button" disabled={updating || !matching.length} onClick={() => download('matching')}>Export matching rows</button><button type="button" disabled={!dataset.rows.length} onClick={() => download('loaded')}>Export all loaded rows</button></div></details>
    {notice && <p role="status">{notice}</p>}
  </>;
}
