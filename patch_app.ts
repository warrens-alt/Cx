import fs from 'fs';

const content = `import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { FilterProvider } from './lib/FilterContext';
import { Activity, Database, Settings } from 'lucide-react';
import SettingsPage from './pages/Settings';
import DateFilter from './components/DateFilter';

function Sidebar() {
  const location = useLocation();
  const navItems = [
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-slate-900 text-slate-300 min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-2 text-white font-semibold text-lg">
          <Activity className="w-6 h-6 text-indigo-400" />
          <span>Performance Intel</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">Lead-to-sale attribution</p>
      </div>
      
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname === '/';
            const Icon = item.icon;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={\`flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors \${
                    isActive 
                      ? 'bg-slate-800 text-white border-r-2 border-indigo-400' 
                      : 'hover:bg-slate-800/50 hover:text-white'
                  }\`}
                >
                  <Icon className={\`w-4 h-4 \${isActive ? 'text-indigo-400' : 'text-slate-400'}\`} />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-6 border-t border-slate-800">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Database className="w-4 h-4" />
          <span>Connected to BigQuery</span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <FilterProvider>
        <div className="flex h-screen bg-slate-50 overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <DateFilter />
            <div className="flex-1 overflow-y-auto relative">
              <Routes>
                <Route path="/" element={<Navigate to="/settings" replace />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </div>
          </div>
        </div>
      </FilterProvider>
    </BrowserRouter>
  );
}
`;

fs.writeFileSync('src/App.tsx', content);
