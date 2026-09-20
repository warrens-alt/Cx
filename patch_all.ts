import fs from 'fs';

// 1. Sources
let sourcesContent = fs.readFileSync('src/pages/Sources.tsx', 'utf8');
if (!sourcesContent.includes('LeadsModal')) {
  sourcesContent = "import React from 'react';\nimport { LeadsModal } from '../lib/LeadsModal';\n" + sourcesContent;
  sourcesContent = sourcesContent.replace("export default function Sources() {", 
`export default function Sources() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalTitle, setModalTitle] = React.useState('');
  const [modalVendor, setModalVendor] = React.useState('');

  const openDrilldown = (vendorName: string) => {
    setModalTitle(\`\${vendorName} Leads\`);
    setModalVendor(vendorName);
    setModalOpen(true);
  };
`);
  sourcesContent = sourcesContent.replace("</motion.div>", 
`      <LeadsModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={modalTitle} 
        drilldownType="pipeline_fetched" 
        params={{ vendor: modalVendor }}
      />
    </motion.div>`);
  
  // Make the table rows clickable
  sourcesContent = sourcesContent.replace(/<tr key=\{i\} className="bg-white border-b border-slate-100 hover:bg-slate-50">/, 
    `<tr key={i} onClick={() => openDrilldown(row.vendor)} className="bg-white border-b border-slate-100 hover:bg-slate-50 cursor-pointer">`);
  
  // Also scatter chart
  sourcesContent = sourcesContent.replace(/<Scatter name="Sources" data=\{data\} fill="#8b5cf6" fillOpacity=\{0\.6\} \/>/, 
    `<Scatter onClick={(e: any) => { if(e && e.vendor) openDrilldown(e.vendor); }} name="Sources" data={data} fill="#8b5cf6" fillOpacity={0.6} className="cursor-pointer" />`);

  fs.writeFileSync('src/pages/Sources.tsx', sourcesContent);
}

// 2. CallCentre.tsx
let ccContent = fs.readFileSync('src/pages/CallCentre.tsx', 'utf8');
if (!ccContent.includes('LeadsModal')) {
  ccContent = "import React from 'react';\nimport { LeadsModal } from '../lib/LeadsModal';\n" + ccContent;
  ccContent = ccContent.replace("export default function CallCentre() {", 
`export default function CallCentre() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalTitle, setModalTitle] = React.useState('');
  const [modalDrilldown, setModalDrilldown] = React.useState('');

  const openDrilldown = (title: string, type: string) => {
    setModalTitle(title);
    setModalDrilldown(type);
    setModalOpen(true);
  };
`);
  ccContent = ccContent.replace("</motion.div>", 
`      <LeadsModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={modalTitle} 
        drilldownType={modalDrilldown} 
      />
    </motion.div>`);
  
  ccContent = ccContent.replace(/<KpiCard title="Total Calls"/, `<div onClick={() => openDrilldown('Dialed Leads', 'pipeline_dialed')} className="cursor-pointer hover:scale-[1.02] transition-transform"><KpiCard title="Total Calls"`);
  ccContent = ccContent.replace(/subtitle="Excluding blanks" \/>/, `subtitle="Excluding blanks" /></div>`);
  
  fs.writeFileSync('src/pages/CallCentre.tsx', ccContent);
}

console.log("Patched Sources and CallCentre");
