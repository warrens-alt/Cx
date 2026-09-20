from pathlib import Path
import subprocess,json,hashlib
root=Path.cwd()
manifest=json.loads((root/'.maintenance/naming/expected.json').read_text())
errors=[]
for name,expected in manifest.items():
    data=(root/name).read_bytes()
    actual=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
    if actual!=expected:errors.append({'path':name,'expected':expected,'actual':actual})
if errors:raise SystemExit(json.dumps(errors,indent=2))
subprocess.run(['git','add','--',*manifest.keys()],check=True)
subprocess.run(['git','rm','-r','--cached','--','.maintenance','.github/workflows/naming-maintenance.yml'],check=True)
changed=subprocess.check_output(['git','diff','--cached','--name-only','9628126171dddad29aec264d8c5ff881218e2979'],text=True).splitlines()
if set(changed)!=set(manifest):raise SystemExit('Unexpected staged file set: '+repr(changed))
Path('candidate').mkdir(exist_ok=True)
Path('candidate/change.patch').write_bytes(subprocess.check_output(['git','diff','--cached','--binary','9628126171dddad29aec264d8c5ff881218e2979']))
Path('candidate/tree.txt').write_bytes(subprocess.check_output(['git','write-tree']))
print(f'All {len(manifest)} changed files match their locally reviewed Git blob hashes.')
