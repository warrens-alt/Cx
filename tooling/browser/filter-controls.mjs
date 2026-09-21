// Regression flow for the restored controls. The calling smoke runner provides synthetic API data.
import assert from 'node:assert/strict';

export async function verifyRestoredFilters(page, viewport) {
  let checks = 0;
  const panel = page.getByRole('region', { name: 'Legacy report filters' });
  const calls = panel.getByRole('combobox', { name: 'Recorded Call Attempts', exact: true });
  const idValidity = panel.getByRole('combobox', { name: 'Recorded National ID Validity', exact: true });
  const phoneValidity = panel.getByRole('combobox', { name: 'Recorded Phone Validity', exact: true });
  const readFilters = () => JSON.parse(new URL(page.url()).searchParams.get('filters') || '{}');
  const waitForFilter = (key, expected) => page.waitForURL(url =>
    JSON.stringify(JSON.parse(url.searchParams.get('filters') || '{}')[key]) === JSON.stringify(expected));

  await panel.getByText('Validation and outcome filters', { exact: true }).click();
  await calls.selectOption('0');
  await waitForFilter('calls', { operator: 'equals', value: 0 });
  assert.deepEqual(readFilters().calls, { operator: 'equals', value: 0 }); checks++;

  await calls.selectOption('1');
  await waitForFilter('calls', { operator: 'equals', value: 1 });
  assert.deepEqual(readFilters().calls, { operator: 'equals', value: 1 }); checks++;

  await calls.selectOption('3-5');
  await waitForFilter('calls', { operator: 'between', min: 3, max: 5 });
  assert.deepEqual(readFilters().calls, { operator: 'between', min: 3, max: 5 }); checks++;

  await idValidity.selectOption('false');
  await waitForFilter('valid_idno', { operator: 'equals', value: false });
  assert.deepEqual(readFilters().valid_idno, { operator: 'equals', value: false }); checks++;

  await phoneValidity.selectOption('true');
  await waitForFilter('phone_valid', { operator: 'equals', value: true });
  assert.deepEqual(readFilters().phone_valid, { operator: 'equals', value: true }); checks++;
  assert.deepEqual(readFilters().calls, { operator: 'between', min: 3, max: 5 }); checks++;

  // Removing a single condition must preserve the other selected conditions.
  await panel.getByRole('button', { name: 'Remove Call attempts filter', exact: true }).click();
  await waitForFilter('calls', undefined);
  await page.waitForFunction(() => document.getElementById('legacy-calls')?.value === '');
  assert.equal(await calls.inputValue(), ''); checks++;
  assert.deepEqual(readFilters().valid_idno, { operator: 'equals', value: false }); checks++;

  await calls.selectOption('6-10');
  await waitForFilter('calls', { operator: 'between', min: 6, max: 10 });
  assert.deepEqual(readFilters().calls, { operator: 'between', min: 6, max: 10 }); checks++;

  await panel.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.waitForURL(url => !url.searchParams.has('filters'));
  // React Router may commit the URL before controlled selects finish rendering. Wait for the UI too.
  await page.waitForFunction(() => ['legacy-calls', 'legacy-valid_idno', 'legacy-phone_valid']
    .every(id => document.getElementById(id)?.value === ''));
  assert.equal(await calls.inputValue(), ''); checks++;
  assert.equal(await idValidity.inputValue(), ''); checks++;
  assert.equal(await phoneValidity.inputValue(), ''); checks++;
  assert.deepEqual(readFilters(), {}); checks++;
  await page.screenshot({ path: `verification/frontend-filters-${viewport.width}.png`, fullPage: true });
  return checks;
}
