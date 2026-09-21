from pathlib import Path
import hashlib, json, subprocess
BASE = 'a30d394c05da753617187cc17d2f41d46aff76a4'
for patch in ['browser.patch','corrections.patch']:
    subprocess.run(['git','apply','--unidiff-zero','.maintenance/visuals/'+patch],check=True)
manifest = json.loads(Path('.maintenance/visuals/expected.json').read_text())
manifest.update({
    'tooling/browser/visual-controls.mjs': 'ead7b925acf450f94e3f96d667a24e012a6b0e01',
    'src/lib/visuals/datasets.ts': 'd535a32ffa96a19eec72ccb2a014168ba59f1a65',
    'src/pages/SourceAnalysis.tsx': 'd3fd9718a4c7279b24078a321ea7b4f70a75c855',
    'tests/visualisation.test.ts': 'd69a6b1a6bb49287416f464f0cc3fb80ebb87489'
})
errors = []
for name, expected in manifest.items():
    data = Path(name).read_bytes()
    actual = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
    if actual != expected:
        errors.append({'path': name, 'expected': expected, 'actual': actual})
if errors:
    raise SystemExit(json.dumps(errors, indent=2))
subprocess.run(['git','add','--',*manifest.keys()],check=True)
subprocess.run(['git','rm','-r','--cached','--','.maintenance/visuals','.github/workflows/visuals-maintenance.yml'],check=True)
changed = subprocess.check_output(['git','diff','--cached','--name-only',BASE],text=True).splitlines()
if set(changed) != set(manifest):
    raise SystemExit('Unexpected staged file set: ' + repr(changed))
Path('candidate').mkdir(exist_ok=True)
Path('candidate/change.patch').write_bytes(subprocess.check_output(['git','diff','--cached','--binary',BASE]))
Path('candidate/tree.txt').write_bytes(subprocess.check_output(['git','write-tree']))
Path('candidate/manifest.json').write_text(json.dumps(manifest,indent=2))
print(f'All {len(manifest)} files match the reviewed source hashes. Temporary transfer files are excluded.')
