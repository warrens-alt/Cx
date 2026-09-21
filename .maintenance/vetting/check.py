from pathlib import Path
import subprocess,json,hashlib,runpy
root=Path.cwd()
# Apply the checked-in follow-up before comparing against independently reviewed blob hashes.
runpy.run_path(str(root/'.maintenance/vetting/finish.py'))
manifest=json.loads((root/'.maintenance/vetting/expected.json').read_text())
errors=[]
for name,expected in manifest.items():
    data=(root/name).read_bytes()
    actual=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
    if actual!=expected:errors.append({'path':name,'expected':expected,'actual':actual})
if errors:raise SystemExit(json.dumps(errors,indent=2))
subprocess.run(['git','add','--',*manifest.keys()],check=True)
subprocess.run(['git','rm','-r','--cached','--','.maintenance/vetting','.github/workflows/vetting-maintenance.yml'],check=True)
base='5073c7d6b7b86ab054b2b200d2ad57cd1bc7b1a8'
changed=subprocess.check_output(['git','diff','--cached','--name-only',base],text=True).splitlines()
if set(changed)!=set(manifest):raise SystemExit('Unexpected staged files: '+repr(changed))
Path('candidate').mkdir(exist_ok=True)
Path('candidate/change.patch').write_bytes(subprocess.check_output(['git','diff','--cached','--binary',base]))
Path('candidate/tree.txt').write_bytes(subprocess.check_output(['git','write-tree']))
print(f'All {len(manifest)} application files match their reviewed source hashes. Transfer files are excluded.')
