const fs = require('fs');

const fixCombo = () => {
  let content = fs.readFileSync('src/components/charts/ComboChart.tsx', 'utf8');
  content = content.replace(/<YAxis yAxisId="left"[\s\S]*?\/>/, 
    `<YAxis yAxisId="left" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#64748b' }} 
              tickFormatter={(val) => formatChartAxis(val)}
            />`
  );
  content = content.replace(/<YAxis\s*yAxisId="right"[\s\S]*?\/>/, 
    `<YAxis 
              yAxisId="right"
              orientation="right"
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#64748b' }} 
              tickFormatter={(val) => \`\${formatChartAxis(val)}%\`}
            />`
  );
  fs.writeFileSync('src/components/charts/ComboChart.tsx', content);
}
fixCombo();
