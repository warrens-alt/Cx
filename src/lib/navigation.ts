import { PAGE_TITLES } from '../../contracts/naming';
import { LayoutDashboard, Megaphone, Activity, Phone, Banknote, Share2, CheckCircle2, ShieldCheck, ShieldAlert, Search, Settings as SettingsIcon, GitBranch, Repeat, Award, Sparkles, Compass } from 'lucide-react';
export const NAV_GROUPS = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Visual Workspace', path: '/visuals', icon: Activity },
        { name: PAGE_TITLES['/reports'], path: '/reports', icon: ShieldCheck },
        { name: PAGE_TITLES['/overview'], path: '/overview', icon: LayoutDashboard },
        { name: PAGE_TITLES['/insights'], path: '/insights', icon: Sparkles },
        { name: PAGE_TITLES['/explore'], path: '/explore', icon: Compass }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { name: PAGE_TITLES['/routing'], path: '/routing', icon: GitBranch },
        { name: PAGE_TITLES['/call-performance'], path: '/call-performance', icon: Phone },
        { name: PAGE_TITLES['/speed-to-lead'], path: '/speed-to-lead', icon: Phone },
        { name: PAGE_TITLES['/acquisition'], path: '/acquisition', icon: Megaphone }
      ]
    },
    {
      title: 'COMMERCIAL',
      items: [
        { name: PAGE_TITLES['/outcomes'], path: '/outcomes', icon: Banknote }
      ]
    },
    {
      title: 'ANALYSIS',
      items: [
        { name: PAGE_TITLES['/sources'], path: '/sources', icon: Share2 },
        { name: PAGE_TITLES['/lead-performance'], path: '/lead-performance', icon: Activity },
        { name: PAGE_TITLES['/quality'], path: '/quality', icon: CheckCircle2 },
        { name: PAGE_TITLES['/consumers'], path: '/consumers', icon: Repeat },
        { name: PAGE_TITLES['/revetting'], path: '/revetting', icon: Award },
        { name: PAGE_TITLES['/cohorts'], path: '/cohorts', icon: Activity },
        { name: PAGE_TITLES['/explorer'], path: '/explorer', icon: Search }
      ]
    },
    {
      title: 'DATA TRUST & QUALITY',
      items: [
        { name: PAGE_TITLES['/data-trust'], path: '/data-trust', icon: ShieldCheck },
        { name: PAGE_TITLES['/data-quality'], path: '/data-quality', icon: ShieldAlert },
        { name: PAGE_TITLES['/data-coverage'], path: '/data-coverage', icon: Activity },
        { name: PAGE_TITLES['/audit'], path: '/audit', icon: Search }
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { name: PAGE_TITLES['/validation'], path: '/validation', icon: CheckCircle2 },
        { name: PAGE_TITLES['/admin'], path: '/admin', icon: SettingsIcon }
      ]
    }
  ];
