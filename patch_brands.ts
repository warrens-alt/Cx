import fs from 'fs';

const files = ['src/pages/MondoBrand.tsx', 'src/pages/BlcBrand.tsx', 'src/pages/MtnBrand.tsx'];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('LeadsModal')) {
    content = "import React from 'react';\nimport { LeadsModal } from '../lib/LeadsModal';\n" + content;
    
    // We need to determine the brand
    let brandName = '';
    if (file.includes('Mondo')) brandName = 'Mondo';
    if (file.includes('Blc')) brandName = 'BLC';
    if (file.includes('Mtn')) brandName = 'MTN';

    const funcName = content.match(/export default function (\w+)\(\) \{/)?.[1];
    if (funcName) {
      content = content.replace(`export default function ${funcName}() {`, 
`export default function ${funcName}() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalTitle, setModalTitle] = React.useState('');
  const [modalDrilldown, setModalDrilldown] = React.useState('');

  const openDrilldown = (title: string, type: string) => {
    setModalTitle(\`\${title} (\${'${brandName}'})\`);
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
        params={{ brand: '${brandName}' }}
      />
    </motion.div>`);
      
      // Let's replace the KPI cards to be clickable
      content = content.replace(/<KpiCard title="Delivered"([\s\S]*?)\/>/, `<div onClick={() => openDrilldown('Delivered', 'pipeline_delivered')} className="cursor-pointer hover:scale-[1.02] transition-transform">$&</div>`);
      content = content.replace(/<KpiCard title="Class A Sold[^"]*"([\s\S]*?)\/>/, `<div onClick={() => openDrilldown('Sales', 'pipeline_sales')} className="cursor-pointer hover:scale-[1.02] transition-transform">$&</div>`);
      content = content.replace(/<KpiCard title="Sold"([\s\S]*?)\/>/, `<div onClick={() => openDrilldown('Sales', 'pipeline_sales')} className="cursor-pointer hover:scale-[1.02] transition-transform">$&</div>`);
      content = content.replace(/<KpiCard title="Total Sold"([\s\S]*?)\/>/, `<div onClick={() => openDrilldown('Sales', 'pipeline_sales')} className="cursor-pointer hover:scale-[1.02] transition-transform">$&</div>`);
      content = content.replace(/<KpiCard title="Activated"([\s\S]*?)\/>/, `<div onClick={() => openDrilldown('Activations', 'pipeline_activations')} className="cursor-pointer hover:scale-[1.02] transition-transform">$&</div>`);
      
      fs.writeFileSync(file, content);
      console.log(`Patched ${file}`);
    }
  }
}
