from pathlib import Path
import hashlib, json, subprocess
BASE = 'a30d394c05da753617187cc17d2f41d46aff76a4'
manifest = json.loads(Path('.maintenance/visuals/expected.json').read_text())
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
