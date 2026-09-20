const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(
  "LayoutDashboard, MousePointerClick, PhoneCall, Zap, UserCheck, Stethoscope, BarChart3, PieChart, ShieldCheck",
  "LayoutDashboard, MousePointerClick, PhoneCall, Zap, UserCheck, Stethoscope, BarChart3, PieChart, ShieldCheck, Database"
);

fs.writeFileSync('src/App.tsx', app);
