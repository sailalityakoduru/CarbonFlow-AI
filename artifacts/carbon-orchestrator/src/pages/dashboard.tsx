import { useMemo } from 'react';
import { Link } from 'wouter';
import { Activity, ArrowDownRight, ArrowRight, CheckCircle2, Factory, Leaf, Zap } from 'lucide-react';
import { CartesianGrid, Area, AreaChart, Bar, BarChart, Cell, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getRegionForecasts } from '../lib/simulated-data';
import { calculateDashboardMetrics, compareWorkloads, scheduleWorkload } from '../lib/scheduler';
import { useWorkloads } from '../state/workload-context';
import { Button, EmptyState, LinkButton, Metric, PageTitle, Panel, PanelHeading, RelativeTime, StatusBadge } from '../components/ui-kit';

export default function DashboardPage() {
  const { workloads } = useWorkloads();
  const metrics = useMemo(() => calculateDashboardMetrics(workloads), [workloads]);
  const comparison = useMemo(() => compareWorkloads(workloads), [workloads]);
  const forecasts = useMemo(() => getRegionForecasts(), []);
  const intensity = forecasts[0]?.forecast.map((hour) => ({
    slotIndex: hour.slotIndex,
    at: hour.at,
    intensity: hour.carbonIntensity,
  })) ?? [];
  const statusData = [
    { name: 'Pending', value: metrics.pending, color: '#d99a2b' },
    { name: 'Running', value: metrics.running, color: '#18845B' },
    { name: 'Completed', value: metrics.completed, color: '#7b9db3' },
  ];
  const activity = [...workloads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const reduction = comparison.reductionPercent;

  return <div>
    <PageTitle eyebrow="Workspace / Overview" title="Compute, with a lighter footprint." description="A traceable view of what is running, what it costs, and where cleaner compute is available." />
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Tracked workloads" value={String(metrics.totalWorkloads)} sub={`${metrics.pending} pending · ${metrics.running} active`} icon={<Activity size={18} />} testId="metric-total-workloads" />
      <Metric label="Projected emissions" value={`${(metrics.estimatedEmissionsGrams / 1000).toFixed(2)} kg`} sub={`${metrics.totalEnergyKwh.toFixed(1)} kWh modeled energy`} icon={<Factory size={18} />} accent="blue" testId="metric-estimated-emissions" hint="CO₂e is estimated as energy consumption (kWh) × grid carbon intensity (gCO₂e/kWh). Energy is average power (kW) × runtime in hours." />
      <Metric label="Avoided vs baseline" value={`${(metrics.emissionsAvoidedGrams / 1000).toFixed(2)} kg`} sub={reduction === null ? 'Baseline is unavailable' : `${reduction.toFixed(1)}% modeled reduction`} icon={<Leaf size={18} />} accent="green" testId="metric-emissions-avoided" hint="Baseline is the earliest feasible schedule in Region A. Avoided emissions equal baseline emissions minus optimized emissions; negative means the optimized estimate is higher." />
      <Metric label="Deadline compliance" value={`${metrics.deadlineCompliancePercent.toFixed(0)}%`} sub={`Mean intensity ${Math.round(metrics.averageCarbonIntensity)} gCO₂e/kWh`} icon={<CheckCircle2 size={18} />} accent="teal" testId="metric-deadline-compliance" />
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
      <Panel>
        <PanelHeading title="Grid carbon intensity" detail="Default region · next 24 hours · simulated forecast" hint="Carbon intensity is the estimated grams of CO₂e emitted per kilowatt-hour of electricity." action={<span title="Carbon intensity is the estimated grams of CO₂e emitted per kilowatt-hour of electricity." className="rounded-md bg-[#e8f5ee] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#18845B]">gCO₂e / kWh</span>} />
        <div className="h-[265px] px-2 pb-3 pt-5 sm:px-5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={intensity} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <defs><linearGradient id="intensityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#27A69A" stopOpacity={0.24} /><stop offset="100%" stopColor="#27A69A" stopOpacity={0.015} /></linearGradient></defs>
              <CartesianGrid stroke="#edf1f3" vertical={false} />
              <XAxis dataKey="slotIndex" type="number" domain={[0, 23]} ticks={[0, 3, 6, 9, 12, 15, 18, 21]} tickFormatter={(slot: number) => new Date(intensity[slot]?.at ?? Date.now()).toLocaleTimeString([], { hour: 'numeric' })} tick={{ fill: '#82919b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#82919b', fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #dce5e9', fontSize: 12 }} />
              <Area type="monotone" dataKey="intensity" stroke="#18845B" strokeWidth={2.5} fill="url(#intensityFill)" activeDot={{ r: 4, fill: '#18845B' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel>
        <PanelHeading title="Where optimization lands" detail="Baseline emissions compared with selected schedules" />
        <div className="px-5 pb-5 pt-7">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div><span className="text-xs font-semibold text-[#718391]">Avoided emissions</span><div className="mt-2 font-display text-3xl font-extrabold text-[#18845B]">{(comparison.emissionsAvoidedGrams / 1000).toFixed(2)} <span className="text-sm font-bold">kg</span></div></div>
            <div className="rounded-lg bg-[#e8f5ee] px-3 py-2 text-right"><span className="block text-[10px] font-bold uppercase tracking-wide text-[#59836f]">Reduction</span><strong className="font-display text-lg text-[#176b4a]">{reduction === null ? '—' : `${reduction.toFixed(1)}%`}</strong></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[{ label: 'Baseline', value: comparison.baselineEmissionsGrams, color: '#89a4b6' }, { label: 'Carbon-aware', value: comparison.optimizedEmissionsGrams, color: '#18845B' }].map((item) => <div key={item.label} className="rounded-lg border border-[#e8edef] p-3"><div className="flex items-center gap-2 text-xs font-semibold text-[#718391]"><span className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.label}</div><div className="mt-2 font-mono text-lg font-medium text-[#17324D]">{(item.value / 1000).toFixed(2)}<span className="ml-1 text-[11px] text-[#718391]">kgCO₂e</span></div></div>)}
          </div>
          <div className="mt-5 border-t border-[#edf0f2] pt-4 text-xs leading-5 text-[#718391]">Estimates include feasible schedules only. Workloads with no valid candidate are not counted in emissions totals.</div>
        </div>
      </Panel>
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
      <Panel>
        <PanelHeading title="Workload status" detail="Current records by execution state" />
        {workloads.length ? <div className="grid grid-cols-[150px_1fr] items-center gap-3 px-4 py-3 sm:grid-cols-[180px_1fr]">
          <div className="h-[170px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={statusData} layout="vertical" margin={{ left: 2, right: 12 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" tick={{ fill: '#667b89', fontSize: 11 }} axisLine={false} tickLine={false} width={72} /><Tooltip cursor={false} /><Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={16}>{statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Bar></BarChart></ResponsiveContainer></div>
          <div className="grid gap-3">{statusData.map((item) => <div key={item.name} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-[#718391]"><span className="status-dot" style={{ background: item.color }} />{item.name}</span><strong className="font-mono text-[#17324D]">{item.value}</strong></div>)}</div>
        </div> : <EmptyState title="No workload activity yet" detail="Create a workload or load the sample jobs to see current execution status." />}
      </Panel>
      <Panel>
        <PanelHeading title="Recent workload activity" detail="Latest records and their current recommendation" action={<LinkButton href="/workloads">All workloads</LinkButton>} />
        {activity.length ? <div className="divide-y divide-[#edf0f2]">{activity.map((workload) => {
          const schedule = scheduleWorkload(workload);
          return <div key={workload.id} className="flex items-center justify-between gap-3 px-5 py-3.5" data-testid={`row-recent-workload-${workload.id}`}>
            <div className="min-w-0"><Link href={`/workloads/${workload.id}`} className="block truncate text-sm font-bold text-[#28465d] hover:text-[#18845B]">{workload.name}</Link><div className="mt-1 flex flex-wrap items-center gap-2"><StatusBadge status={workload.status} /><span className="text-[11px] text-[#82919b]">{workload.type}</span><RelativeTime value={workload.createdAt} /></div></div>
            <div className="hidden shrink-0 text-right sm:block"><span className="block text-[10px] font-bold uppercase tracking-wide text-[#82919b]">Recommendation</span><span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#18845B]">{schedule.action === 'NO FEASIBLE SCHEDULE' ? 'No feasible schedule' : schedule.action.toLowerCase()}<ArrowRight size={13} /></span></div>
          </div>;
        })}</div> : <EmptyState title="Nothing in the queue" detail="Your recent jobs will show up here once you create or load workloads." />}
      </Panel>
    </div>
    <div className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-[#d9e8e0] bg-[#edf7f1] px-5 py-4 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3"><span className="mt-0.5 text-[#18845B]"><Zap size={19} /></span><div><p className="text-sm font-bold text-[#24543d]">Scheduling is decision support, not a reservation.</p><p className="mt-1 text-xs text-[#648272]">Capacity is simulated per job. Jobs run independently and are not co-capacity-managed.</p></div></div><Link href="/scheduler" className="inline-flex items-center gap-1 text-xs font-bold text-[#18845B]">Review schedules <ArrowDownRight size={14} /></Link>
    </div>
  </div>;
}
