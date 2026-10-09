import { useMemo } from 'react';
import { ArrowDown, ArrowUp, Clock3, Factory, Leaf, Zap } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { compareWorkloads } from '../lib/scheduler';
import { REGIONS } from '../lib/simulated-data';
import { useWorkloads } from '../state/workload-context';
import { EmptyState, Metric, Notice, PageTitle, Panel, PanelHeading } from '../components/ui-kit';

const fmt = (number: number) => number.toLocaleString(undefined, { maximumFractionDigits: 1 });

export default function ComparisonPage() {
  const { workloads } = useWorkloads();
  const comparison = useMemo(() => compareWorkloads(workloads), [workloads]);
  const reduction = comparison.reductionPercent;
  const bars = [
    { label: 'Estimated emissions · kgCO₂e', baseline: comparison.baselineEmissionsGrams / 1000, optimized: comparison.optimizedEmissionsGrams / 1000 },
  ];
  const regionData = REGIONS.map((region) => ({ region: region.name, baseline: comparison.baselineRegionCounts[region.name] ?? 0, optimized: comparison.optimizedRegionCounts[region.name] ?? 0 }));
  const scheduleById = new Map(comparison.optimizedSchedules.map((schedule) => [schedule.workloadId, schedule]));
  const timeline = workloads.map((workload) => {
    const optimized = scheduleById.get(workload.id)?.selected;
    const baseline = comparison.baselineSchedules.find((schedule) => schedule.workloadId === workload.id)?.selected;
    return { workload, optimized, baseline };
  }).sort((a, b) => (a.optimized?.executionAt ?? a.workload.deadline).localeCompare(b.optimized?.executionAt ?? b.workload.deadline));

  return <div>
    <PageTitle eyebrow="Analysis / Strategy" title="Baseline vs carbon-aware" description="Compare feasible default-region execution against the lowest-emission schedule that satisfies each workload's constraints." />
    {!workloads.length ? <Panel><EmptyState title="No comparison data yet" detail="Add workloads to calculate baseline and carbon-aware strategy outcomes." /></Panel> : <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Baseline emissions" value={`${(comparison.baselineEmissionsGrams / 1000).toFixed(2)} kg`} sub="Immediate default-region feasible jobs" icon={<Factory size={18} />} accent="blue" testId="comparison-baseline-emissions" />
        <Metric label="Carbon-aware emissions" value={`${(comparison.optimizedEmissionsGrams / 1000).toFixed(2)} kg`} sub="Selected feasible schedules" icon={<Leaf size={18} />} testId="comparison-optimized-emissions" />
        <Metric label="Avoided emissions" value={`${comparison.emissionsAvoidedGrams >= 0 ? '+' : ''}${(comparison.emissionsAvoidedGrams / 1000).toFixed(2)} kg`} sub={reduction === null ? 'Unavailable: baseline emissions are zero' : `${reduction >= 0 ? '+' : ''}${reduction.toFixed(1)}% reduction`} icon={<Zap size={18} />} accent={comparison.emissionsAvoidedGrams >= 0 ? 'green' : 'amber'} testId="comparison-avoided-emissions" hint="Carbon reduction (%) = (baseline emissions − optimized emissions) ÷ baseline emissions × 100. Baseline is the earliest feasible slot in Region A; a negative result means optimized emissions were higher." />
        <Metric label="Added schedule delay" value={`${fmt(comparison.optimizedDelayMinutes - comparison.baselineDelayMinutes)} min`} sub={`${comparison.optimizedDelayMinutes} min total optimized waiting`} icon={<Clock3 size={18} />} accent="amber" testId="comparison-delay" />
      </div>
      {reduction === null && <div className="mt-3"><Notice tone="warning">A percentage reduction cannot be calculated because the baseline emissions total is zero.</Notice></div>}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_.9fr]">
        <Panel><PanelHeading title="Strategy emissions" detail="Estimated kgCO₂e across feasible schedules · tradeoffs below" hint="Baseline uses the earliest feasible execution slot in the default Region A. Carbon-aware scheduling selects the lowest-emission feasible schedule across eligible regions and hourly slots." /><div className="h-[310px] px-2 py-5 sm:px-5"><ResponsiveContainer width="100%" height="100%"><BarChart data={bars} margin={{ top: 5, right: 8, left: 0, bottom: 18 }}><CartesianGrid stroke="#edf1f3" vertical={false} /><XAxis dataKey="label" tick={{ fill: '#718391', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} /><YAxis tick={{ fill: '#82919b', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #dce5e9', fontSize: 12 }} /><Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="baseline" name="Baseline" fill="#91aabb" radius={[4, 4, 0, 0]} maxBarSize={34} /><Bar dataKey="optimized" name="Carbon-aware" fill="#18845B" radius={[4, 4, 0, 0]} maxBarSize={34} /></BarChart></ResponsiveContainer></div></Panel>
        <Panel><PanelHeading title="Operational tradeoffs" detail="Whole-workload strategy totals" /><div className="divide-y divide-[#edf0f2] px-5">
          {[{ label: 'Energy required', base: `${comparison.energyKwh.toFixed(2)} kWh`, result: 'Same energy model', good: true }, { label: 'Deadline compliance', base: `${comparison.baselineDeadlineCompliance.toFixed(0)}%`, result: `${comparison.optimizedDeadlineCompliance.toFixed(0)}% optimized`, good: comparison.optimizedDeadlineCompliance >= comparison.baselineDeadlineCompliance }, { label: 'Total schedule delay', base: `${comparison.baselineDelayMinutes} min`, result: `${comparison.optimizedDelayMinutes} min optimized`, good: comparison.optimizedDelayMinutes <= comparison.baselineDelayMinutes }].map((row) => <div key={row.label} className="flex items-center justify-between gap-3 py-4"><div><p className="text-xs font-bold text-[#35536a]">{row.label}</p><p className="mt-1 text-[11px] text-[#82919b]">Baseline {row.base}</p></div><span className={`inline-flex items-center gap-1 text-xs font-bold ${row.good ? 'text-[#18845B]' : 'text-[#a87922]'}`}>{row.good ? <ArrowDown size={13} /> : <ArrowUp size={13} />}{row.result}</span></div>)}
          <p className="py-3 text-[11px] leading-5 text-[#82919b]">Energy is identical between strategies because workload runtime and power draw are unchanged. Emissions reflect estimated energy × simulated grid intensity.</p>
        </div></Panel>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
        <Panel><PanelHeading title="Region distribution" detail="Feasible workload count by execution region" /><div className="h-[245px] px-4 py-5"><ResponsiveContainer width="100%" height="100%"><BarChart data={regionData} margin={{ left: -15, right: 8, top: 8, bottom: 0 }}><CartesianGrid stroke="#edf1f3" vertical={false} /><XAxis dataKey="region" tick={{ fill: '#718391', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: '#82919b', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #dce5e9', fontSize: 12 }} /><Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="baseline" name="Baseline" fill="#91aabb" radius={[4, 4, 0, 0]} /><Bar dataKey="optimized" name="Carbon-aware" fill="#18845B" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Panel>
        <Panel className="overflow-hidden"><PanelHeading title="Workload decision timeline" detail="Scheduled start times with baseline and optimized choices" /><div className="divide-y divide-[#edf0f2]">{timeline.length ? timeline.map(({ workload, optimized, baseline }) => <div key={workload.id} className="grid gap-3 px-5 py-3.5 sm:grid-cols-[minmax(130px,.7fr)_1fr_1fr] sm:items-center" data-testid={`timeline-workload-${workload.id}`}>
          <div className="min-w-0"><p className="truncate text-xs font-bold text-[#35536a]">{workload.name}</p><p className="mt-1 text-[10px] text-[#82919b]">{workload.priority} · due {new Date(workload.deadline).toLocaleDateString()}</p></div>
          <div><p className="text-[9px] font-bold uppercase tracking-wide text-[#82919b]">Baseline</p><p className="mt-1 text-xs text-[#496171]">{baseline ? `${new Date(baseline.executionAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })} · ${baseline.regionName}` : 'No feasible baseline'}</p></div>
          <div><p className="text-[9px] font-bold uppercase tracking-wide text-[#18845B]">Carbon-aware</p><p className="mt-1 text-xs font-semibold text-[#35536a]">{optimized ? `${new Date(optimized.executionAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })} · ${optimized.regionName}` : 'No feasible schedule'}</p></div>
        </div>) : <EmptyState title="No workload records" detail="Add workloads to compare their timelines." />}</div></Panel>
      </div>
      <div className="mt-4"><Notice tone="info"><span>Jobs without a feasible schedule are omitted from emissions and region totals, but remain included in the deadline compliance denominator. No feasible schedule is implied or fabricated.</span></Notice></div>
    </>}
  </div>;
}
