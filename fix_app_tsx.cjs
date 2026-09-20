const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '<Route path="/acquisition" element={<Placeholder title="Acquisition" />} />',
  '<Route path="/acquisition" element={<Acquisition />} />'
);

code = code.replace(
  '<Route path="/outcomes" element={<Placeholder title="Outcomes & Revenue" />} />',
  '<Route path="/outcomes" element={<Outcomes />} />'
);

if (!code.includes('<Route path="/data-coverage"')) {
  code = code.replace(
    '<Route path="/data-quality" element={<DataQuality />} />',
    '<Route path="/data-quality" element={<DataQuality />} />\n                <Route path="/data-coverage" element={<DataCoverage />} />'
  );
}

fs.writeFileSync('src/App.tsx', code);
