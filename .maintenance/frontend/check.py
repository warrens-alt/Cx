from pathlib import Path
import subprocess,json,hashlib
base='1cf6a7281301b47a3b68df5eff9928df87b42d15'
manifest=json.loads(Path('.maintenance/frontend/expected.json').read_text())
errors=[]
for name,expected in manifest.items():
    data=Path(name).read_bytes();actual=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
    if actual!=expected:errors.append({'path':name,'expected':expected,'actual':actual})
if errors:raise SystemExit(json.dumps(errors,indent=2))
subprocess.run(['git','add','--',*manifest.keys()],check=True)
subprocess.run(['git','rm','-r','--cached','--','.maintenance','.github/workflows/frontend-maintenance.yml'],check=True)
changed=subprocess.check_output(['git','diff','--cached','--name-only',base],text=True).splitlines()
if set(changed)!=set(manifest):raise SystemExit('Unexpected staged files: '+repr(changed))
if any(name.startswith(('server/','contracts/','warehouse/')) for name in changed):raise SystemExit('Analytical or security implementation must not change in this pass')
Path('candidate').mkdir(exist_ok=True)
Path('candidate/change.patch').write_bytes(subprocess.check_output(['git','diff','--cached','--binary',base]))
Path('candidate/tree.txt').write_bytes(subprocess.check_output(['git','write-tree']))
print(f'All {len(manifest)} files match the locally syntax-checked source. Analytical contracts and server code are unchanged.')
