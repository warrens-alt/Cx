import fs from 'fs';
let ccContent = fs.readFileSync('src/pages/CallCentre.tsx', 'utf8');

ccContent = ccContent.replace(/<KpiCard[\s\S]*?title="Total Call Attempts"[\s\S]*?\/>/, `<div onClick={() => openDrilldown('Total Call Attempts', 'pipeline_dialed')} className="cursor-pointer hover:scale-[1.02] transition-transform">$&</div>`);
ccContent = ccContent.replace(/<KpiCard[\s\S]*?title="Sales"[\s\S]*?\/>/, `<div onClick={() => openDrilldown('Sales', 'pipeline_sales')} className="cursor-pointer hover:scale-[1.02] transition-transform">$&</div>`);

fs.writeFileSync('src/pages/CallCentre.tsx', ccContent);
console.log("Fixed CallCentre.tsx");
