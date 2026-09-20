import fs from 'fs';

let content = fs.readFileSync('src/pages/Agents.tsx', 'utf8');
if (!content.includes('LeadsModal')) {
  content = "import React from 'react';\nimport { LeadsModal } from '../lib/LeadsModal';\n" + content;
  content = content.replace("export default function Agents() {", 
`export default function Agents() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalTitle, setModalTitle] = React.useState('');
  const [modalAgent, setModalAgent] = React.useState('');

  const openDrilldown = (agentName: string) => {
    setModalTitle(\`\${agentName} Sales\`);
    setModalAgent(agentName);
    setModalOpen(true);
  };
`);
  content = content.replace("</motion.div>", 
`      <LeadsModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={modalTitle} 
        drilldownType="pipeline_sales" 
        params={{ agent: modalAgent }}
      />
    </motion.div>`);
  
  // Make the table rows clickable
  content = content.replace(/<tr key=\{i\} className="bg-white border-b border-slate-100 hover:bg-slate-50">/, 
    `<tr key={i} onClick={() => openDrilldown(row.agent)} className="bg-white border-b border-slate-100 hover:bg-slate-50 cursor-pointer">`);
  
  // Make the bar chart clickable
  content = content.replace(/<BarChart[\s\S]*?>/, (match) => {
    return `<BarChart 
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  openDrilldown(e.activePayload[0].payload.name);
                }
              }}
` + match.replace('<BarChart', '');
  });

  fs.writeFileSync('src/pages/Agents.tsx', content);
  console.log("Patched Agents");
}
