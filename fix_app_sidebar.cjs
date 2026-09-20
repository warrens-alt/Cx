const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

const newSidebar = `
function Sidebar() {
  const location = useLocation();

  const navGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Overview', path: '/overview', icon: LayoutDashboard }
      ]
    },
    {
      title: 'PERFORMANCE',
      items: [
        { name: 'Acquisition', path: '/acquisition', icon: Megaphone },
        { name: 'Lead Performance', path: '/lead-performance', icon: Activity },
        { name: 'Calls', path: '/call-performance', icon: Phone },
        { name: 'Outcomes & Revenue', path: '/outcomes', icon: Banknote }
      ]
    },
    {
      title: 'ANALYSIS',
      items: [
        { name: 'Sources & Campaigns', path: '/sources', icon: Share2 },
        { name: 'Quality & Vetting', path: '/quality', icon: CheckCircle2 },
        { name: 'Cohorts', path: '/cohorts', icon: Activity },
        { name: 'Speed to Lead', path: '/speed-to-lead', icon: Phone }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { name: 'Data Quality', path: '/data-quality', icon: ShieldAlert },
        { name: 'Lead Explorer', path: '/explorer', icon: Search }
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Admin', path: '/admin', icon: SettingsIcon }
      ]
    }
  ];

  return (
    <div className="w-64 bg-[#0a192f] text-white min-h-screen flex flex-col relative overflow-hidden shrink-0 border-r border-slate-800">
      <div className="p-6 border-b border-slate-800 relative z-10 flex flex-col gap-4">
        <div className="flex items-center gap-3 text-white font-semibold text-xl font-['Space_Grotesk'] tracking-tight">
          <div className="w-8 h-8 rounded bg-teal flex items-center justify-center shadow-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span>RevIntel</span>
        </div>
        
        <div className="flex items-center gap-2 bg-[#112240] border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 w-full overflow-hidden">
           <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
           <span className="truncate">Primary Tenant</span>
        </div>
      </div>
      
      <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar px-3 space-y-6">
        {navGroups.map((group, idx) => (
          <div key={idx}>
            <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{group.title}</div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                const Icon = item.icon;
                
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={\`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md \${
                        isActive 
                          ? 'bg-teal/10 text-teal' 
                          : 'text-slate-400 hover:bg-[#112240] hover:text-white'
                      }\`}
                    >
                      <Icon className={\`w-4 h-4 \${isActive ? 'text-teal' : 'text-slate-400'}\`} />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-800 bg-[#0a192f]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#112240] flex items-center justify-center border border-slate-700">
              <User className="w-4 h-4 text-slate-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white leading-tight">Admin User</span>
              <span className="text-xs text-slate-400">Analyst</span>
            </div>
          </div>
          <button className="p-2 text-slate-400 hover:text-white rounded hover:bg-[#112240] transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
`;

app = app.replace(/function Sidebar\(\) \{[\s\S]*?\/\/ Simple placeholders/, newSidebar + '\n// Simple placeholders');
fs.writeFileSync('src/App.tsx', app);

