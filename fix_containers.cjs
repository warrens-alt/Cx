const fs = require('fs');
const glob = require('glob');

const pages = glob.sync('src/pages/*.tsx');

for (const file of pages) {
  let content = fs.readFileSync(file, 'utf8');

  // Replace container divs for main content
  content = content.replace(/className="p-8 pb-20 max-w-\[1600px\] mx-auto fade-in"/g, 'className="w-full px-6 lg:px-8 py-6 lg:py-8 pb-24 max-w-[1920px] mx-auto fade-in space-y-6"');
  content = content.replace(/className="p-8 pb-20 max-w-\[1600px\] mx-auto space-y-8 fade-in"/g, 'className="w-full px-6 lg:px-8 py-6 lg:py-8 pb-24 max-w-[1920px] mx-auto fade-in space-y-6"');
  content = content.replace(/className="p-8 pb-20 max-w-\[1600px\] mx-auto space-y-8"/g, 'className="w-full px-6 lg:px-8 py-6 lg:py-8 pb-24 max-w-[1920px] mx-auto fade-in space-y-6"');
  content = content.replace(/className="p-8 pb-20 max-w-\[1600px\] mx-auto"/g, 'className="w-full px-6 lg:px-8 py-6 lg:py-8 pb-24 max-w-[1920px] mx-auto fade-in space-y-6"');
  content = content.replace(/className="p-8 max-w-\[1600px\] mx-auto"/g, 'className="w-full px-6 lg:px-8 py-6 lg:py-8 pb-24 max-w-[1920px] mx-auto fade-in space-y-6"');
  content = content.replace(/className="p-8 pb-20"/g, 'className="w-full px-6 lg:px-8 py-6 lg:py-8 pb-24 max-w-[1920px] mx-auto fade-in space-y-6"');
  content = content.replace(/className="p-8"/g, 'className="w-full px-6 lg:px-8 py-6 lg:py-8 pb-24 max-w-[1920px] mx-auto fade-in space-y-6"');
  content = content.replace(/className="p-8 pb-20 h-full flex flex-col"/g, 'className="w-full px-6 lg:px-8 py-6 lg:py-8 pb-24 max-w-[1920px] mx-auto fade-in flex flex-col h-full space-y-6"');

  // Let's standardise the KpiCard grid too
  // Find grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4
  // We'll replace grid classes with standard KpiGrid container
  content = content.replace(/className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4"/g, 'className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4 mb-6"');

  fs.writeFileSync(file, content);
}
