# Type-complete aggregate construction, preserving runtime validation and all field values.
from pathlib import Path
import json
r=Path.cwd()
p=r/'server/vetting/service.ts'
s=p.read_text().replace('type VettingCounts, type VettingGroup','type VettingMetric, type VettingCounts, type VettingGroup')
s=s.replace("  const result = Object.fromEntries(COUNT_KEYS.map(k=>[k,count(raw[k],k!=='leads')])) as VettingCounts;\n  result.classMeanSeconds=decimal(raw.classMeanSeconds);result.colourMeanSeconds=decimal(raw.colourMeanSeconds);", "  const values = Object.fromEntries(COUNT_KEYS.map(k=>[k,count(raw[k],k!=='leads')])) as Record<VettingMetric,string|null>;\n  const result: VettingCounts = {...values,classMeanSeconds:decimal(raw.classMeanSeconds),colourMeanSeconds:decimal(raw.colourMeanSeconds)};")
s=s.replace("scope:{...scope,clientId:client.id}","scope:{...scope,clientId:client.id,filters:scope.filters||{}}")
p.write_text(s)
p=r/'tests/vetting.test.ts'
s=p.read_text().replace('type VettingReport','type VettingCounts, type VettingMetric, type VettingReport')
s=s.replace("const aggregate=(leads='8')=>({...Object.fromEntries(COUNT_KEYS.map(k=>[k,k==='leads'?leads:'0'])),classMeanSeconds:null,colourMeanSeconds:null});", "const aggregate=(leads='8'):VettingCounts=>({...Object.fromEntries(COUNT_KEYS.map(k=>[k,k==='leads'?leads:'0'])) as Record<VettingMetric,string|null>,classMeanSeconds:null,colourMeanSeconds:null});")
p.write_text(s)
p=r/'.maintenance/vetting/expected.json';m=json.loads(p.read_text())
m.update({'server/vetting/service.ts':'99c409ae75182d25219d31709896b844ccf4ad4d','tests/vetting.test.ts':'781d2c0f90c47622553301b62af79a97d182cc2e'})
p.write_text(json.dumps(m,indent=2)+'\n')
