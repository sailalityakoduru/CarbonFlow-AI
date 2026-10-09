import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Activity, BarChart3, Cpu, Gauge, Leaf, Menu, Network, Plus, X } from 'lucide-react';
import { Button } from './ui-kit';
import { useWorkloads } from '../state/workload-context';
import WorkloadForm from './workload-form';
import type { Workload } from '../lib/types';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: Gauge },
  { href: '/workloads', label: 'Workloads', icon: Cpu },
  { href: '/scheduler', label: 'Smart scheduler', icon: Activity },
  { href: '/regions', label: 'Carbon intelligence', icon: Leaf },
  { href: '/comparison', label: 'Strategy comparison', icon: BarChart3 },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { workloads, addWorkload } = useWorkloads();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const submit = (data: Omit<Workload, 'id' | 'createdAt'>) => {
    addWorkload(data);
    setFormOpen(false);
  };

  const nav = <div className="flex h-full flex-col">
    <div className="px-5 pb-7 pt-6">
      <Link href="/dashboard" className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#18845B] text-white shadow-lg shadow-black/10"><Network size={21} /></span>
        <span><span className="block font-display text-[15px] font-extrabold leading-tight text-white">CarbonFlow AI</span><span className="mt-1 block text-[10px] font-semibold tracking-[.13em] text-[#9cb2c1]">COMPUTE ORCHESTRATOR</span></span>
      </Link>
    </div>
    <div className="px-4 pb-2 text-[9px] font-bold uppercase tracking-[.18em] text-[#8fa5b5]">Operations</div>
    <nav className="grid gap-1 px-3" aria-label="Primary navigation">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = location === href || (href === '/dashboard' && location === '/');
        return <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${active ? 'bg-[#27465e] text-white' : 'text-[#bdcbd5] hover:bg-[#203e56] hover:text-white'}`}><Icon size={17} className={active ? 'text-[#5bd0a0]' : 'text-[#91a9b8]'} />{label}{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#5bd0a0]" />}</Link>;
      })}
    </nav>
    <div className="mt-auto border-t border-white/10 p-4">
      <div className="mt-4 flex items-center justify-between rounded-lg bg-[#112a40] px-3 py-3">
        <div><p className="text-[11px] font-bold text-white">Local simulation</p><p className="mt-1 text-[10px] text-[#a9bdc9]">{workloads.length} workload records</p></div>
        <span className="status-dot bg-[#59c894]" />
      </div>
    </div>
  </div>;

  return <div className="shell flex bg-[#f5f7f9]">
    <aside className="sidebar fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col md:flex">{nav}</aside>
    {mobileOpen && <div className="fixed inset-0 z-50 md:hidden"><button aria-label="Close navigation overlay" className="absolute inset-0 bg-[#10283b]/50" onClick={() => setMobileOpen(false)} /><aside className="sidebar absolute inset-y-0 left-0 w-[280px] shadow-2xl">{nav}<button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 rounded p-2 text-white" aria-label="Close menu"><X size={18} /></button></aside></div>}
    <main className="min-w-0 flex-1 md:ml-[248px]">
      <header className="sticky top-0 z-30 flex h-[66px] items-center justify-between border-b border-[#e3e9ed] bg-[#f9fbfc]/95 px-4 backdrop-blur sm:px-7">
        <div className="flex items-center gap-3"><button onClick={() => setMobileOpen(true)} className="rounded-lg border border-[#dce5e9] bg-white p-2 text-[#29475d] md:hidden" aria-label="Open menu" data-testid="button-mobile-menu"><Menu size={18} /></button><div className="hidden text-xs text-[#718391] sm:block">Operations workspace <span className="mx-1.5 text-[#b9c6ce]">/</span><span className="font-semibold text-[#28465d]">{navItems.find((item) => item.href === location || (location === '/' && item.href === '/dashboard'))?.label ?? 'Workloads'}</span></div><div className="sm:hidden font-display text-sm font-bold text-[#17324D]">CarbonFlow AI</div></div>
        <div className="flex items-center gap-3"><Button onClick={() => setFormOpen(true)} className="min-h-9 px-3 text-xs" data-testid="button-create-workload"><Plus size={15} /><span className="hidden sm:inline">New workload</span><span className="sm:hidden">New</span></Button></div>
      </header>
      <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-7 sm:py-8 page-enter">{children}</div>
    </main>
    {formOpen && <WorkloadForm title="Create workload" onClose={() => setFormOpen(false)} onSubmit={submit} />}
  </div>;
}
