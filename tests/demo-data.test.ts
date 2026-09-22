import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEMO_SCENARIO, DEMO_LEADS, filterDemoLeads, summariseDemoLeads, groupDemoLeads, type DemoLead } from '../src/lib/demoData';

test('demo scenario contains exactly eight immutable fictional leads per July day, with no personal fields', () => {
  assert.equal(DEMO_SCENARIO.startDate, '2026-07-01');
  assert.equal(DEMO_SCENARIO.endDate, '2026-07-31');
  assert.match(DEMO_SCENARIO.description, /Fictional.*Not connected to Google Cloud/);
  assert.equal(DEMO_LEADS.length, 248);
  assert.equal(new Set(DEMO_LEADS.map(row => row.id)).size, 248);
  assert.equal(new Set(DEMO_LEADS.map(row => row.vendor)).size, 4);
  assert.equal(new Set(DEMO_LEADS.map(row => row.source)).size, 3);
  assert.equal(Object.isFrozen(DEMO_LEADS), true);
  for (let day = 1; day <= 31; day++) {
    const date = `2026-07-${String(day).padStart(2, '0')}`;
    assert.equal(DEMO_LEADS.filter(row => row.capturedAt.slice(0, 10) === date).length, 8);
  }
  for (const row of DEMO_LEADS) {
    assert.equal(Object.isFrozen(row), true);
    assert.match(row.id, /^DEMO-202607\d{2}-0[1-8]$/);
    assert.match(row.vendor, /^Demo /);
    assert.match(row.source, /^Demo /);
    assert.equal(new Date(row.capturedAt).toISOString(), row.capturedAt);
    assert.deepEqual(Object.keys(row).sort(), ['id', 'vendor', 'source', 'capturedAt', 'status', 'callAttempts', 'firstDialMinutes', 'revenueCents'].sort());
  }
});

test('demo generation has no current-clock, random, persistence or external API dependency', () => {
  const source = readFileSync('src/lib/demoData.ts', 'utf8');
  assert.doesNotMatch(source, /Math\.random|Date\.now|new Date\(\)|fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|https?:\/\/|from\s+['"]/);
  assert.deepEqual(filterDemoLeads(), [...DEMO_LEADS]);
  assert.deepEqual(filterDemoLeads(), filterDemoLeads({}));
  assert.equal(DEMO_LEADS[0].id, 'DEMO-20260701-01');
  assert.equal(DEMO_LEADS.at(-1)!.id, 'DEMO-20260731-08');
});

test('demo statuses, contact attempts, first dial and activated-only integer revenue are coherent', () => {
  for (const row of DEMO_LEADS) {
    assert.equal(Number.isSafeInteger(row.callAttempts), true);
    assert.equal(Number.isSafeInteger(row.revenueCents), true);
    if (row.status === 'New') {
      assert.equal(row.callAttempts, 0);
      assert.equal(row.firstDialMinutes, null);
    } else {
      assert.ok(row.callAttempts > 0);
      assert.ok(Number.isSafeInteger(row.firstDialMinutes) && row.firstDialMinutes! > 0);
    }
    if (row.status === 'Activated') assert.ok(row.revenueCents > 0);
    else assert.equal(row.revenueCents, 0);
  }
  const total = summariseDemoLeads(DEMO_LEADS);
  assert.equal(total.leads, 248);
  assert.equal(total.contacted, 198);
  assert.equal(total.sales, 98);
  assert.equal(total.activations, 49);
  assert.equal(total.callAttempts, 716);
  assert.equal(total.revenueCents, 2_687_364);
  assert.equal(total.conversionRate, 39.52);
  assert.equal(total.activationRate, 19.76);
  assert.ok(total.activations <= total.sales && total.sales <= total.contacted && total.contacted <= total.leads);
  assert.equal(total.revenueCents, DEMO_LEADS.filter(row => row.status === 'Activated').reduce((sum, row) => sum + row.revenueCents, 0));
});

test('demo filters intersect vendor, source, status, search and inclusive UTC dates without mutating fixtures', () => {
  const target = DEMO_LEADS.find(row => row.status === 'Activated')!;
  const date = target.capturedAt.slice(0, 10);
  const filtered = filterDemoLeads({ vendor: target.vendor, source: target.source, status: target.status, search: target.id.toLowerCase(), startDate: date, endDate: date });
  assert.deepEqual(filtered, [target]);
  assert.equal(filterDemoLeads({ startDate: '2026-07-10', endDate: '2026-07-12' }).length, 24);
  assert.equal(filterDemoLeads({ endDate: '2026-06-30' }).length, 0);
  assert.equal(filterDemoLeads({ startDate: '2026-08-01' }).length, 0);
  assert.equal(filterDemoLeads({ vendor: 'No such demo vendor' }).length, 0);
  assert.equal(filterDemoLeads({ status: 'No such demo status' }).length, 0);
  assert.equal(filterDemoLeads({ search: '  DEMO CEDAR  ' }).length, 62);
  assert.equal(filterDemoLeads({ startDate: '', endDate: '', vendor: '', source: '', status: '', search: '  ' }).length, 248);
  filtered.splice(0);
  assert.equal(DEMO_LEADS.length, 248);
});

test('invalid and reversed demo date ranges return no matches rather than changing scope silently', () => {
  for (const invalid of ['2026-07-32', '2026-02-30', '2026-13-01', '2026-7-1', 'not-a-date']) {
    assert.deepEqual(filterDemoLeads({ startDate: invalid }), []);
    assert.deepEqual(filterDemoLeads({ endDate: invalid }), []);
  }
  assert.deepEqual(filterDemoLeads({ startDate: '2026-07-20', endDate: '2026-07-19' }), []);
});

test('demo summaries use explicit funnel denominators and return zero rates for empty selections', () => {
  assert.deepEqual(summariseDemoLeads([]), { leads: 0, contacted: 0, sales: 0, activations: 0, callAttempts: 0, revenueCents: 0, conversionRate: 0, activationRate: 0 });
  const rows: DemoLead[] = ['New', 'Sale', 'Activated'].map((status, index) => ({ ...DEMO_LEADS[index], status: status as DemoLead['status'], callAttempts: index, firstDialMinutes: index ? 10 : null, revenueCents: status === 'Activated' ? 10_001 : 0 }));
  assert.deepEqual(summariseDemoLeads(rows), { leads: 3, contacted: 2, sales: 2, activations: 1, callAttempts: 3, revenueCents: 10_001, conversionRate: 66.67, activationRate: 33.33 });
});

test('vendor and source grouping reconcile every additive total and retain subgroup denominators', () => {
  const rows = filterDemoLeads({ startDate: '2026-07-06', endDate: '2026-07-15' });
  const summary = summariseDemoLeads(rows);
  for (const key of ['vendor', 'source'] as const) {
    const groups = groupDemoLeads(rows, key);
    assert.deepEqual(groups.map(group => group.name), groups.map(group => group.name).sort((a, b) => a.localeCompare(b, 'en-GB')));
    for (const metric of ['leads', 'contacted', 'sales', 'activations', 'callAttempts', 'revenueCents'] as const) {
      assert.equal(groups.reduce((sum, group) => sum + group[metric], 0), summary[metric]);
    }
    for (const group of groups) assert.deepEqual(group, { name: group.name, ...summariseDemoLeads(rows.filter(row => row[key] === group.name)) });
    assert.deepEqual(groupDemoLeads([], key), []);
  }
});
