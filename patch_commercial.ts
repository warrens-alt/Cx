import fs from 'fs';

let content = fs.readFileSync('src/pages/CommercialControl.tsx', 'utf8');
if (!content.includes('LeadsModal')) {
  content = "import React from 'react';\nimport { LeadsModal } from '../lib/LeadsModal';\n" + content;
  content = content.replace("export default function CommercialControl() {", 
`export default function CommercialControl() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalTitle, setModalTitle] = React.useState('');
  const [modalVendor, setModalVendor] = React.useState('');

  const openDrilldown = (vendorName: string) => {
    setModalTitle(\`\${vendorName} Leads\`);
    setModalVendor(vendorName);
    setModalOpen(true);
  };
`);
  content = content.replace("</motion.div>", 
`      <LeadsModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={modalTitle} 
        drilldownType="pipeline_fetched" 
        params={{ vendor: modalVendor }}
      />
    </motion.div>`);
  
  // Make the table rows clickable
  content = content.replace(/<tr key=\{i\} className="bg-white border-b border-slate-100 hover:bg-slate-50">/, 
    `<tr key={i} onClick={() => openDrilldown(row.vendor)} className="bg-white border-b border-slate-100 hover:bg-slate-50 cursor-pointer">`);

  fs.writeFileSync('src/pages/CommercialControl.tsx', content);
  console.log("Patched CommercialControl");
}
