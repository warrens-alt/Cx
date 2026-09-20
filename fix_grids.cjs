const fs = require('fs');

function replaceGrid(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /grid-cols-1 md:grid-cols-\d+(?: lg:grid-cols-\d+)?(?: xl:grid-cols-\d+)? gap-4/g,
    "grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[1920px]:grid-cols-6 gap-4"
  );
  fs.writeFileSync(file, content);
}

['src/pages/CallPerformance.tsx', 'src/pages/DataQuality.tsx', 'src/pages/DataCoverage.tsx', 'src/pages/Acquisition.tsx'].forEach(replaceGrid);
