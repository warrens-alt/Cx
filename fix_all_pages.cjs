const fs = require('fs');
const glob = require('glob');

// Setup generic replacements
function replaceClasses(code) {
  // Update backgrounds and cards
  code = code.replace(/bg-card-bg p-[456] rounded-xl border border-slate-200 shadow-sm/g, 'enterprise-card p-6');
  code = code.replace(/bg-card-bg rounded-xl border border-slate-200 shadow-sm/g, 'enterprise-card');
  code = code.replace(/bg-white rounded-xl border border-slate-200 shadow-sm/g, 'enterprise-card');
  
  // Update headings
  code = code.replace(/text-2xl font-bold text-slate-900 font-\['Space_Grotesk'\] tracking-tight/g, 'text-page-title');
  code = code.replace(/text-2xl font-semibold text-primary-text font-\['Space_Grotesk'\] tracking-tight/g, 'text-page-title');
  code = code.replace(/text-xl font-semibold text-primary-text mb-[0-9]+/g, 'text-section-title mb-4');
  code = code.replace(/text-lg font-semibold text-primary-text/g, 'text-section-title');
  code = code.replace(/text-base font-semibold text-primary-text/g, 'text-[16px] font-semibold text-text-main');
  code = code.replace(/text-sm font-semibold text-slate-800 mb-[0-9]+ uppercase tracking-wider/g, 'text-section-title mb-5');
  
  // Tables
  code = code.replace(/<table className="w-full text-sm text-left">/g, '<table className="enterprise-table">');
  code = code.replace(/<thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500[ \w-]*">/g, '<thead>');
  // Strip out old th classes because enterprise-table handles it
  code = code.replace(/<th className="px-6 py-3[^"]*">/g, '<th>');
  code = code.replace(/<td className="px-6 py-4[^"]*">/g, '<td>');
  
  // Buttons
  code = code.replace(/className="px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal-600 transition-colors"/g, 'className="px-4 py-2 bg-teal text-white text-[13px] font-medium rounded-lg hover:bg-teal-dark transition-colors"');
  code = code.replace(/className="px-3 py-1\.5 text-xs font-medium bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"/g, 'className="px-3 py-1.5 text-[13px] font-medium bg-surface border border-border-strong rounded hover:bg-surface-sec text-text-sec transition-colors"');
  
  // Texts
  code = code.replace(/text-slate-500/g, 'text-text-sec');
  code = code.replace(/text-slate-900/g, 'text-text-main');
  code = code.replace(/text-slate-400/g, 'text-text-mute');
  code = code.replace(/bg-slate-50/g, 'bg-surface-sec');
  
  return code;
}

const files = glob.sync('src/pages/*.tsx');

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Only add generic replacements for files other than Overview.tsx since Overview was already customized heavily
  if (!file.includes('Overview.tsx')) {
    code = replaceClasses(code);
    
    // Attempt to inject PageHeader imports if not there and if it has a page title
    if (code.includes('text-page-title') && !code.includes('PageHeader')) {
      code = code.replace(/import React/g, "import React");
      // Just manually insert near top if possible, or just ignore for now since it might be complex to automate cleanly.
      // Actually we can just do a simple replace of the header block.
      code = code.replace(
        /<div className="mb-8">\s*<h1 className="text-page-title"[^>]*>(.*?)<\/h1>\s*<p className="text-text-sec mt-1">(.*?)<\/p>\s*<\/div>/g,
        `<PageHeader title="$1" description="$2" />`
      );
    }
    
    // Fix KPICard -> KpiCard
    code = code.replace(/<KPICard /g, '<KpiCard ');
    if (code.includes('<KpiCard') && !code.includes('KpiCard')) {
       // Need to import it.
       code = code.replace(/import React/, "import KpiCard from '../components/KpiCard';\nimport React");
    }
  }

  // Update Overview grid logic manually
  if (file.includes('Overview.tsx')) {
    code = code.replace(/grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7/g, 'grid-cols-1 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6');
    code = code.replace(/grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6/g, 'grid-cols-1 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6');
  }

  fs.writeFileSync(file, code);
}
