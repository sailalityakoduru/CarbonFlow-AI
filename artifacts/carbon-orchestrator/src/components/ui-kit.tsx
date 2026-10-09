import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { Link } from 'wouter';
import { ArrowUpRight, Check, CircleAlert, Clock3, X } from 'lucide-react';
import type { WorkloadStatus } from '../lib/types';

export function Button({ children, variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const style = {
    primary: 'bg-[#18845B] text-white hover:bg-[#126e4b] shadow-sm',
    secondary: 'bg-white text-[#17324D] border border-[#d8e1e7] hover:bg-[#f4f8fa]',
    ghost: 'text-[#597080] hover:bg-[#edf5f4] hover:text-[#17324D]',
    danger: 'bg-[#fff1ef] text-[#b3362d] hover:bg-[#ffe3df]',
  }[variant];
  return <button {...props} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${style} ${className}`}>{children}</button>;
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-semibold text-[#28465d]">{label}{children}{error ? <span className="text-xs font-medium text-[#b3362d]">{error}</span> : hint ? <span className="text-xs font-normal text-[#718391]">{hint}</span> : null}</label>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-10 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 text-sm text-[#17324D] outline-none transition focus:border-[#27A69A] focus:ring-2 focus:ring-[#27A69A]/15 ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-10 w-full rounded-lg border border-[#d6e0e7] bg-white px-3 text-sm text-[#17324D] outline-none focus:border-[#27A69A] focus:ring-2 focus:ring-[#27A69A]/15 ${props.className ?? ''}`} />;
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-[#e0e7eb] bg-white shadow-[0_2px_8px_rgba(23,50,77,.035)] ${className}`}>{children}</section>;
}

export function PanelHeading({ title, detail, action, hint }: { title: string; detail?: string; action?: ReactNode; hint?: string }) {
  return <div className="flex items-start justify-between gap-3 border-b border-[#edf0f2] px-5 py-4"><div><h2 title={hint} className="font-display text-[15px] font-bold text-[#17324D]">{title}</h2>{detail && <p className="mt-1 text-xs text-[#718391]">{detail}</p>}</div>{action}</div>;
}

export function DemoLabel() {
  return <span className="demo-ribbon inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold tracking-[.12em]" data-testid="badge-demo-data"><span className="status-dot bg-[#d7992d]" />DEMO DATA</span>;
}

export function StatusBadge({ status }: { status: WorkloadStatus }) {
  const colors = status === 'Running' ? 'bg-[#e6f6ef] text-[#18724f]' : status === 'Completed' ? 'bg-[#edf5fc] text-[#416784]' : 'bg-[#fff5df] text-[#805614]';
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${colors}`} data-testid={`status-workload-${status.toLowerCase()}`}><span className={`status-dot ${status === 'Running' ? 'bg-[#18845B]' : status === 'Completed' ? 'bg-[#6592b0]' : 'bg-[#d7992d]'}`} />{status}</span>;
}

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center"><span className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-[#e8f5ee] text-[#18845B]"><CircleAlert size={20} /></span><h3 className="font-display text-base font-bold text-[#17324D]">{title}</h3><p className="mt-1 max-w-sm text-sm text-[#718391]">{detail}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' | 'success' | 'error' }) {
  const colors = { info: 'bg-[#edf5fc] text-[#315a78] border-[#d8e8f4]', warning: 'bg-[#fff7e7] text-[#805614] border-[#f1e1bb]', success: 'bg-[#e8f5ee] text-[#176b4a] border-[#cfe9dc]', error: 'bg-[#fff1ef] text-[#a6362e] border-[#f4d2cd]' };
  return <div className={`flex items-start gap-2 rounded-lg border px-3.5 py-3 text-sm ${colors[tone]}`}><CircleAlert size={16} className="mt-0.5 shrink-0" />{children}</div>;
}

export function Modal({ title, onClose, children, size = 'max-w-2xl' }: { title: string; onClose: () => void; children: ReactNode; size?: string }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#10283b]/45 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div role="dialog" aria-modal="true" aria-label={title} className={`my-auto w-full ${size} rounded-2xl border border-[#d9e3e8] bg-[#fbfcfc] shadow-2xl`}><div className="flex items-center justify-between border-b border-[#e4eaee] px-6 py-4"><h2 className="font-display text-lg font-bold text-[#17324D]">{title}</h2><button onClick={onClose} aria-label="Close dialog" data-testid="button-close-dialog" className="rounded-md p-2 text-[#718391] hover:bg-[#edf2f4]"><X size={18} /></button></div>{children}</div></div>;
}

export function Metric({ label, value, sub, icon, accent = 'green', testId, hint }: { label: string; value: string; sub?: string; icon: ReactNode; accent?: 'green' | 'blue' | 'teal' | 'amber'; testId: string; hint?: string }) {
  const colors = { green: 'bg-[#e8f5ee] text-[#18845B]', blue: 'bg-[#edf5fc] text-[#426d8d]', teal: 'bg-[#e5f5f3] text-[#218d84]', amber: 'bg-[#fff5df] text-[#a87922]' };
  return <Panel className="p-4"><div className="flex items-start justify-between"><div><p title={hint} className="text-xs font-semibold tracking-wide text-[#718391]">{label}</p><p title={hint} className="mt-2 font-display text-[26px] font-extrabold tracking-tight text-[#17324D]" data-testid={testId}>{value}</p></div><span className={`grid h-9 w-9 place-items-center rounded-lg ${colors[accent]}`}>{icon}</span></div>{sub && <p title={hint} className="mt-2 text-xs text-[#718391]">{sub}</p>}</Panel>;
}

export function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#18845B]">{eyebrow}</div><h1 className="font-display text-2xl font-extrabold tracking-tight text-[#17324D] sm:text-[30px]">{title}</h1><p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#6d7f8b]">{description}</p></div>{action && <div className="flex shrink-0 gap-2">{action}</div>}</div>;
}

export function LinkButton({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return <Link href={href} className={`inline-flex items-center gap-1 text-sm font-semibold text-[#18845B] hover:text-[#126e4b] ${className}`}>{children}<ArrowUpRight size={15} /></Link>;
}

export function SmallCheck({ passed }: { passed: boolean }) {
  return passed ? <Check size={16} className="text-[#18845B]" /> : <X size={16} className="text-[#c64e43]" />;
}

export function RelativeTime({ value }: { value: string }) {
  const date = new Date(value);
  return <span className="inline-flex items-center gap-1 text-xs text-[#748592]"><Clock3 size={12} />{date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>;
}
