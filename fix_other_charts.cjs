const fs = require('fs');

function fixChart(file, extraPropsRegex) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/subtitle\?: string;/, `subtitle?: string;\n  auditTitle?: string;\n  auditContext?: any;\n  auditGrain?: string;`);
  
  if (file.includes('FunnelWaterfall')) {
    content = content.replace(/subtitle, steps \}: FunnelWaterfallProps\)/, `subtitle, steps, auditTitle, auditContext, auditGrain }: FunnelWaterfallProps)`);
  } else if (file.includes('HorizontalBarChart')) {
    content = content.replace(/height = 300\n\}: HorizontalBarChartProps\)/, `height = 300,\n  auditTitle,\n  auditContext,\n  auditGrain\n}: HorizontalBarChartProps)`);
  } else if (file.includes('ComboChart')) {
    content = content.replace(/height = 300\n\}: ComboChartProps\)/, `height = 300,\n  auditTitle,\n  auditContext,\n  auditGrain\n}: ComboChartProps)`);
  } else if (file.includes('DistributionBar')) {
    content = content.replace(/height = 60\n\}: DistributionBarProps\)/, `height = 60,\n  auditTitle,\n  auditContext,\n  auditGrain\n}: DistributionBarProps)`);
  } else if (file.includes('ScatterPlot')) {
    content = content.replace(/height = 300\n\}: ScatterPlotProps\)/, `height = 300,\n  auditTitle,\n  auditContext,\n  auditGrain\n}: ScatterPlotProps)`);
  }
  
  content = content.replace(/<ChartToolbar title=\{title\} subtitle=\{subtitle\}\s*>/, `<ChartToolbar title={title} subtitle={subtitle} auditTitle={auditTitle} auditContext={auditContext} auditGrain={auditGrain}>`);
  content = content.replace(/<ChartToolbar title=\{title\} subtitle=\{subtitle\}\s*\/>/, `<ChartToolbar title={title} subtitle={subtitle} auditTitle={auditTitle} auditContext={auditContext} auditGrain={auditGrain} />`);
  fs.writeFileSync(file, content);
}

fixChart('src/components/charts/FunnelWaterfall.tsx');
fixChart('src/components/charts/HorizontalBarChart.tsx');
fixChart('src/components/charts/ComboChart.tsx');
fixChart('src/components/charts/DistributionBar.tsx');
fixChart('src/components/charts/ScatterPlot.tsx');
