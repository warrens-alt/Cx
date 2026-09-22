import type { Query } from '@google-cloud/bigquery';
import { RequestError } from './filters';

const MUTATING_TOKENS = new Set([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE',
  'EXPORT', 'LOAD', 'CALL', 'EXECUTE', 'BEGIN', 'COMMIT', 'ROLLBACK', 'DECLARE',
  'SET', 'GRANT', 'REVOKE', 'ASSERT', 'EXTERNAL_QUERY',
]);
const FORBIDDEN_OPTIONS = [
  'destination', 'destinationTable', 'writeDisposition', 'createDisposition',
  'schemaUpdateOptions', 'timePartitioning', 'rangePartitioning', 'clustering',
  'destinationEncryptionConfiguration', 'connectionProperties', 'createSession',
  'continuous', 'writeIncrementalResults', 'scriptOptions', 'tableDefinitions',
  'userDefinedFunctionResources', 'allowLargeResults', 'job',
] as const;

/** Lexical guard for server-owned GoogleSQL, not an API for accepting user SQL.
 * Comments, literals and quoted identifiers cannot introduce statement tokens.
 * IAM remains an independent control; this app never changes cloud permissions.
 */
export function assertReadOnlyQuery(query: unknown): asserts query is string {
  if (typeof query !== 'string' || !query.trim()) throw new RequestError('A read-only analytical query is required', 503);
  const tokens: string[] = [];
  let i = 0;
  while (i < query.length) {
    const c = query[i];
    if (/\s/.test(c)) { i++; continue; }
    if (query.startsWith('--', i) || c === '#') {
      while (i < query.length && query[i] !== '\n' && query[i] !== '\r') i++;
      continue;
    }
    if (query.startsWith('/*', i)) {
      const end = query.indexOf('*/', i + 2);
      if (end < 0 || query.slice(i + 2, end).includes('/*')) throw new RequestError('Invalid analytical SQL comment', 503);
      i = end + 2; continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const delimiter = c !== '`' && query.startsWith(c.repeat(3), i) ? c.repeat(3) : c;
      i += delimiter.length;
      let closed = false;
      while (i < query.length) {
        if (query[i] === '\\') { i += 2; continue; }
        if (query.startsWith(delimiter, i)) { i += delimiter.length; closed = true; break; }
        i++;
      }
      if (!closed) throw new RequestError('Invalid analytical SQL literal or identifier', 503);
      continue;
    }
    if (c === '@') {
      // Named parameters and system-variable reads are data, not SQL statements.
      i++;
      if (query[i] === '@') i++;
      while (i < query.length && /[A-Za-z0-9_]/.test(query[i])) i++;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const start = i++;
      while (i < query.length && /[A-Za-z0-9_]/.test(query[i])) i++;
      tokens.push(query.slice(start, i).toUpperCase());
      continue;
    }
    // Keep separators visible, including those after the final SELECT.
    if (c === ';') tokens.push(c);
    i++;
  }
  if (!['SELECT', 'WITH'].includes(tokens[0])) throw new RequestError('Only read-only SELECT queries are permitted', 503);
  if (tokens.at(-1) === ';') tokens.pop();
  if (tokens.includes(';') || tokens.some(token => MUTATING_TOKENS.has(token))) {
    throw new RequestError('Warehouse writes and multi-statement scripts are disabled in this read-only app', 503);
  }
}

function positiveInteger(value: unknown, name: string): bigint {
  if ((typeof value !== 'string' && typeof value !== 'number') ||
      (typeof value === 'number' && !Number.isSafeInteger(value)) || !/^[0-9]+$/.test(String(value))) {
    throw new RequestError(`Invalid ${name}`, 503);
  }
  const result = BigInt(value);
  if (result <= 0n || result > 9223372036854775807n) throw new RequestError(`Invalid ${name}`, 503);
  return result;
}

/** Shared by every runtime warehouse reader; explicit destinations are forbidden.
 * BigQuery's own anonymous result/cache tables are part of ordinary SELECT execution.
 */
export function readOnlyQueryOptions(options: Query, configuredBudget: string | number = process.env.BIGQUERY_MAX_BYTES_BILLED ?? '1000000000'): Query {
  assertReadOnlyQuery(options.query);
  for (const key of FORBIDDEN_OPTIONS) {
    if (options[key] !== undefined) throw new RequestError(`Query option ${key} is disabled in this read-only app`, 503);
  }
  if (options.useLegacySql === true) throw new RequestError('Only GoogleSQL is supported by this read-only app', 503);
  const configured = positiveInteger(configuredBudget, 'BIGQUERY_MAX_BYTES_BILLED');
  const requested = options.maximumBytesBilled === undefined ? configured : positiveInteger(options.maximumBytesBilled, 'query budget');
  const timeout = options.jobTimeoutMs === undefined ? 60000n : positiveInteger(options.jobTimeoutMs, 'query timeout');
  return {
    ...options, useLegacySql: false,
    maximumBytesBilled: String(requested < configured ? requested : configured),
    jobTimeoutMs: Number(timeout < 60000n ? timeout : 60000n),
  };
}
