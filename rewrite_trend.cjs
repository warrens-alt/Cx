const fs = require('fs');

const fixTrend = () => {
  let content = fs.readFileSync('src/components/charts/TrendChart.tsx', 'utf8');
  content = content.replace(/<YAxis[\s\S]*?dx=\{-10\}\s*\/>/, 
    `<YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#64748b' }} 
              tickFormatter={(val) => \`\${valuePrefix}\${formatChartAxis(val)}\${valueSuffix}\`}
              dx={-10} 
            />`
  );
  fs.writeFileSync('src/components/charts/TrendChart.tsx', content);
}
fixTrend();
