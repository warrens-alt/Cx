// Run the checked-in TypeScript modules with a stubbed warehouse transport.
// This validates application logic and generated SQL contracts, not live BigQuery execution.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'cx-regression-'));
let errors = [];
try {
  fs.writeFileSync(path.join(output, 'package.json'), '{"type":"commonjs"}');
  const modules = ['server/securityPolicy.ts', 'server/security.ts', 'server/analyticsContext.ts',
    ...['filters', 'integrity', 'config', 'views', 'client', 'export', 'semantic_engine', 'auditedQueries'].map(name => `server/bigquery/${name}.ts`)];
  for (const file of modules) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const built = ts.transpileModule(source, { fileName: file, reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true, isolatedModules: true } });
    errors.push(...(built.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error));
    const destination = path.join(output, file.replace(/\.ts$/, '.js'));
    fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, built.outputText);
  }
  if (errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, { getCurrentDirectory: () => root, getCanonicalFileName: f => f, getNewLine: () => '\n' }));
  const result = spawnSync(process.execPath, ['--test', path.join(root, 'tests/integrity.test.cjs')], { stdio: 'inherit', env: { ...process.env, CX_COMPILED_TEST_ROOT: output } });
  process.exitCode = result.status ?? 1;
} finally { fs.rmSync(output, { recursive: true, force: true }); }
