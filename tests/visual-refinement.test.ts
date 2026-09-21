import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryColour } from '../src/lib/visuals/palette';
import { colourFill } from '../src/lib/vetting';
import { graphPoints, type VisualSettings } from '../src/lib/visuals/model';
import { API_VISUAL_REPORTS, API_VISUAL_REPORT_GROUPS, tableDataset } from '../src/lib/visuals/datasets';
import { exactColumns, exactRows, exactTableCsv } from '../src/lib/visuals/exactTable';

const settings: VisualSettings = {dimension:'source',measure:'leads',compare:'',mode:'records',search:'',sort:'source',offset:0,limit:25};
const fixture = () => tableDataset('sources.performance', Array.from({length:1000}, (_,i) => ({source:`Fixture ${String(i).padStart(4,'0')}`,leads:String(i),revenue:`9007199254740993.${String(i).padStart(3,'0')}`})));

test('record distributions preserve typed category identities when labels collide', () => {
  const dataset = tableDataset('typed', [{source:null},{source:'Unspecified'},{source:''},{source:false},{source:'Recorded no'},{source:true},{source:'Recorded yes'}], {dimension:'source'});
  const points = graphPoints(dataset,settings).points;
  assert.equal(points.length,7);
  assert.equal(new Set(points.map(point=>point.key)).size,7);
  assert.equal(new Set(points.map(point=>point.label)).size,7);
  assert.deepEqual(points.map(point=>point.exact),Array(7).fill('1'));
  const reversed = graphPoints({...dataset,rows:[...dataset.rows].reverse()},settings);
  assert.deepEqual(new Set(reversed.points.map(point=>point.key)),new Set(points.map(point=>point.key)));
});

test('category colours survive filtering and order changes; recognised lead colours remain consistent', () => {
  for (const label of ['Green','Blue','Orange','Charcoal','Purple','Red','Synthetic source']) {
    assert.equal(colourFill(label,0),colourFill(label,22));
    assert.equal(categoryColour(label),colourFill(label,3));
  }
  assert.equal(categoryColour('Green'),'#257d57');
  const dataset=tableDataset('colours',[{source:'Synthetic A'},{source:'Synthetic B'},{source:'Synthetic A'}],{dimension:'source'});
  const first=graphPoints(dataset,settings).points.find(point=>point.label==='Synthetic B')!;
  const filtered=graphPoints(dataset,{...settings,search:'Synthetic B'}).points[0];
  assert.equal(categoryColour(first.label,first.categoryKey),categoryColour(filtered.label,filtered.categoryKey));
});

test('exact table sorting preserves decimal precision beyond safe integers and keeps null last', () => {
  const dataset=tableDataset('sources.performance',[{source:'B',leads:'9007199254740993.01'},{source:'A',leads:'9007199254740993.001'},{source:'Missing',leads:null},{source:'Zero',leads:'0'}]);
  assert.deepEqual(exactRows(dataset,'','leads','ascending').map(item=>item.row.source),['Zero','A','B','Missing']);
  assert.deepEqual(exactRows(dataset,'','leads','descending').map(item=>item.row.source),['B','A','Zero','Missing']);
});

test('exact table search and bounded slices leave all loaded export rows available', () => {
  const dataset=fixture();
  const matching=exactRows(dataset,'Fixture 00','source','ascending');
  assert.equal(matching.length,100);
  assert.equal(matching.slice(0,25).length,25);
  assert.equal(dataset.rows.length,1000);
  assert.equal(exactTableCsv(dataset,dataset.rows).split('\r\n').length,1001);
  assert.equal(exactTableCsv(dataset,matching.map(item=>item.row)).split('\r\n').length,101);
  assert.ok(exactColumns(dataset).find(column=>column.key==='revenue')?.numeric);
});

test('exact table CSV preserves false zero precise decimals and formula protection', () => {
  const dataset=tableDataset('export',[{label:'=HYPERLINK("x")',valid:false,value:'-9007199254740993.100',zero:0}],{dimension:'label'});
  const csv=exactTableCsv(dataset,dataset.rows);
  assert.match(csv,/'=HYPERLINK/);assert.match(csv,/"false"/);assert.match(csv,/"0"/);
  assert.match(csv,/"-9007199254740993.100"/);assert.doesNotMatch(csv,/'-9007199254740993/);
});

test('all visual report endpoints belong to exactly one labelled source group', () => {
  const grouped=API_VISUAL_REPORT_GROUPS.flatMap(group=>group.reports.map(([id])=>id));
  assert.equal(new Set(grouped).size,grouped.length);
  assert.deepEqual([...grouped].sort(),API_VISUAL_REPORTS.map(([id])=>id).sort());
});
