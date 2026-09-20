const fs = require('fs');

let file = fs.readFileSync('src/pages/CallPerformance.tsx', 'utf8');

// Ensure KpiCard is imported
if (!file.includes("import KpiCard")) {
  file = file.replace("import { Loader2 } from 'lucide-react';", "import { Loader2 } from 'lucide-react';\nimport KpiCard from '../components/KpiCard';");
}

const replacement = `
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 min-[1440px]:grid-cols-5 min-[1920px]:grid-cols-6 gap-4 mb-8">
        <KpiCard title="Called Leads" value={callsData.calledLeads.toLocaleString()} subtitle={"Out of " + callsData.deliveredLeads.toLocaleString() + " delivered"} />
        <KpiCard title="Avg Calls / Lead" value={callsData.avgCalls} subtitle="Across called leads only" />
        <KpiCard title="One-Call Rate" value={callsData.oneCallRate} suffix="%" subtitle={callsData.oneCallLeads.toLocaleString() + " leads"} />
        <KpiCard title="Repeat-Call Rate" value={callsData.repeatCallRate} suffix="%" subtitle={callsData.repeatCallLeads.toLocaleString() + " leads"} />
        <KpiCard title="Avg Call Duration" value={callsData.avgDuration} subtitle={"Median: " + callsData.medianDuration} />
      </div>`;

file = file.replace(/<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 min-\[1440px\]:grid-cols-5 min-\[1920px\]:grid-cols-6 gap-4 mb-8">[\s\S]*?<\/div>\s*<\/div>\s*<div className="enterprise-card/, 
  replacement.trim() + '\n      <div className="enterprise-card');

fs.writeFileSync('src/pages/CallPerformance.tsx', file);
