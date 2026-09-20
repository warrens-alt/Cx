const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/pages/*.tsx');
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  
  if (code.includes('<Loader2')) {
    code = code.replace(
      /<div className="p-8 pb-20 flex items-center justify-center min-h-\[60vh\]">[\s\n]*<Loader2 className="w-8 h-8 animate-spin text-teal" \/>[\s\n]*<\/div>/g,
      '<div className="p-8"><TableSkeleton /></div>'
    );
    
    if (code.includes('TableSkeleton') && !code.includes('TableSkeleton')) {
        // Will never execute, just adding manually
    }
  }

  // Adding TableSkeleton import if missing
  if (code.includes('<TableSkeleton />') && !code.includes('TableSkeleton')) {
     code = code.replace(/import React/g, "import { TableSkeleton } from '../components/Skeleton';\nimport React");
  }

  fs.writeFileSync(file, code);
}
