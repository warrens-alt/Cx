const fs = require('fs');
let app = fs.readFileSync('src/pages/Overview.tsx', 'utf8');

const replacement = `            />
            <KPICard title="Marketing Spend" value={metrics.spend || 0} change={0} prefix="R" lineage={{ definition: "Total budget spent", numerator: "SUM(budget)", denominator: "N/A" }} metadata={metadata} />
            <KPICard title="Cost per Lead" value={metrics.cpa || 0} change={0} prefix="R" isPositiveGood={false} lineage={{ definition: "Spend / Leads", numerator: "SUM(budget)", denominator: "COUNT(lead_id)" }} metadata={metadata} />
            <KPICard title="ROAS" value={metrics.roas || 0} change={0} suffix="%" lineage={{ definition: "Revenue / Spend", numerator: "SUM(revenue)", denominator: "SUM(budget)" }} metadata={metadata} />
          </div>
        </div>`;

app = app.replace('/>\n          </div>\n        </div>', replacement);
fs.writeFileSync('src/pages/Overview.tsx', app);
