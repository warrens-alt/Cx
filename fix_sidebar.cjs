const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Ensure useClient is imported
if (!content.includes("useClient")) {
  content = `import { useClient } from './lib/ClientContext';\n` + content;
}

content = content.replace(/function Sidebar\(\) \{/, `function Sidebar() {
  const { clientConfig } = useClient();`);

const navGroupsOriginal = `const navGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Executive Overview', path: '/overview', icon: LayoutDashboard }
      ]
    },
    {
      title: 'ACQUISITION',
      items: [
        { name: 'Acquisition & Campaigns', path: '/acquisition', icon: Megaphone }
      ]
    },
    {
      title: 'LEADS',
      items: [
        { name: 'Lead Performance', path: '/lead-performance', icon: Activity },
        { name: 'Lead Quality', path: '/quality', icon: CheckCircle2 },
        { name: 'Lead Explorer', path: '/explorer', icon: Search }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { name: 'Call Performance', path: '/call-performance', icon: Phone },
        { name: 'Speed to Lead', path: '/speed-to-lead', icon: Phone }
      ]
    },
    {
      title: 'COMMERCIAL',
      items: [
        { name: 'Outcomes & Revenue', path: '/outcomes', icon: Banknote }
      ]
    },
    {
      title: 'ANALYSIS',
      items: [
        { name: 'Sources', path: '/sources', icon: Share2 },
        { name: 'Cohorts', path: '/cohorts', icon: Users }
      ]
    },
    {
      title: 'PLATFORM',
      items: [
        { name: 'Data Health', path: '/data-quality', icon: HeartPulse },
        { name: 'Data Coverage', path: '/data-coverage', icon: Database },
        { name: 'Admin', path: '/admin', icon: Settings }
      ]
    }
  ];`;

const navGroupsReplacement = `const navGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Executive Overview', path: '/overview', icon: LayoutDashboard }
      ]
    },
    {
      title: 'ACQUISITION',
      items: [
        clientConfig?.capabilities?.marketing && { name: 'Acquisition & Campaigns', path: '/acquisition', icon: Megaphone }
      ].filter(Boolean)
    },
    {
      title: 'LEADS',
      items: [
        clientConfig?.capabilities?.leads && { name: 'Lead Performance', path: '/lead-performance', icon: Activity },
        clientConfig?.capabilities?.leads && { name: 'Lead Quality', path: '/quality', icon: CheckCircle2 },
        clientConfig?.capabilities?.leads && { name: 'Lead Explorer', path: '/explorer', icon: Search }
      ].filter(Boolean)
    },
    {
      title: 'OPERATIONS',
      items: [
        clientConfig?.capabilities?.calls && { name: 'Call Performance', path: '/call-performance', icon: Phone },
        clientConfig?.capabilities?.calls && { name: 'Speed to Lead', path: '/speed-to-lead', icon: Phone }
      ].filter(Boolean)
    },
    {
      title: 'COMMERCIAL',
      items: [
        clientConfig?.capabilities?.revenue && { name: 'Outcomes & Revenue', path: '/outcomes', icon: Banknote }
      ].filter(Boolean)
    },
    {
      title: 'ANALYSIS',
      items: [
        { name: 'Sources', path: '/sources', icon: Share2 },
        { name: 'Cohorts', path: '/cohorts', icon: Users }
      ]
    },
    {
      title: 'PLATFORM',
      items: [
        { name: 'Data Health', path: '/data-quality', icon: HeartPulse },
        { name: 'Data Coverage', path: '/data-coverage', icon: Database },
        { name: 'Admin', path: '/admin', icon: Settings }
      ]
    }
  ].filter(group => group.items.length > 0);`;

content = content.replace(navGroupsOriginal, navGroupsReplacement);

fs.writeFileSync('src/App.tsx', content);
