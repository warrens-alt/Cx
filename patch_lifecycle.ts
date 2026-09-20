import fs from 'fs';

let content = fs.readFileSync('src/pages/Lifecycle.tsx', 'utf8');

if (!content.includes('LeadsModal')) {
  content = "import React from 'react';\nimport { LeadsModal } from '../lib/LeadsModal';\n" + content;
  
  content = content.replace("export default function Lifecycle() {", 
`export default function Lifecycle() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalTitle, setModalTitle] = React.useState('');
  const [modalDrilldown, setModalDrilldown] = React.useState('');

  const openDrilldown = (title: string, type: string) => {
    setModalTitle(title);
    setModalDrilldown(type);
    setModalOpen(true);
  };
`);

  content = content.replace("</motion.div>", 
`      <LeadsModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={modalTitle} 
        drilldownType={modalDrilldown} 
      />
    </motion.div>`);
  
  // Make BarChart clickable
  content = content.replace(/<BarChart[\s\S]*?>/, (match) => {
    return `<BarChart 
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  const stage = e.activePayload[0].payload.name;
                  let type = 'pipeline_fetched';
                  if (stage.includes('Delivered')) type = 'pipeline_delivered';
                  if (stage === 'Dialed') type = 'pipeline_dialed';
                  if (stage === 'RPC') type = 'pipeline_answered';
                  if (stage.includes('Sales')) type = 'pipeline_sales';
                  openDrilldown(stage, type);
                }
              }}
` + match.replace('<BarChart', '');
  });
  
  // Also KPI cards if any
  content = content.replace(/<KpiCard title="Fetched Leads"([\s\S]*?)\/>/, `<div onClick={() => openDrilldown('Fetched Leads', 'pipeline_fetched')} className="cursor-pointer hover:scale-[1.02] transition-transform">$&</div>`);
  content = content.replace(/<KpiCard title="Delivered"([\s\S]*?)\/>/, `<div onClick={() => openDrilldown('Delivered', 'pipeline_delivered')} className="cursor-pointer hover:scale-[1.02] transition-transform">$&</div>`);
  content = content.replace(/<KpiCard title="Dialed"([\s\S]*?)\/>/, `<div onClick={() => openDrilldown('Dialed', 'pipeline_dialed')} className="cursor-pointer hover:scale-[1.02] transition-transform">$&</div>`);
  content = content.replace(/<KpiCard title="Sales"([\s\S]*?)\/>/, `<div onClick={() => openDrilldown('Sales', 'pipeline_sales')} className="cursor-pointer hover:scale-[1.02] transition-transform">$&</div>`);

  fs.writeFileSync('src/pages/Lifecycle.tsx', content);
  console.log("Patched Lifecycle");
}
