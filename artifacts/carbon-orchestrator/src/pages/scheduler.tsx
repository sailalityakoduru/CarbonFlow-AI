import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, CalendarClock, CircleAlert, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { scheduleWorkload } from '../lib/scheduler';
import type { Workload } from '../lib/types';
import { useWorkloads } from '../state/workload-context';
import { Button, EmptyState, Notice, PageTitle, Panel, PanelHeading, StatusBadge } from '../components/ui-kit';
import WorkloadForm from '../components/workload-form';

export default function SchedulerPage() {
  const { workloads, updateWorkload } = useWorkloads();
  const [revision, setRevision] = useState(0);
  const [rescheduling, setRescheduling] = useState<Workload | null>(null);
  const schedules = useMemo(() => {
    const priorityRank = { Critical: 0, High: 1, Normal: 2, Low: 3 };
    return workloads
      .map((workload) => ({ workload, schedule: scheduleWorkload(workload) }))
      .sort((a, b) =>
        priorityRank[a.workload.priority] - priorityRank[b.workload.priority] ||
        new Date(a.workload.deadline).getTime() - new Date(b.workload.deadline).getTime(),
      );
  }, [workloads, revision]);

  const saveReschedule = (data: Omit<Workload, 'id' | 'createdAt'>) => {
    if (rescheduling) updateWorkload({ ...rescheduling, ...data, id: rescheduling.id, createdAt: rescheduling.createdAt });
    setRescheduling(null);
    setRevision((value) => value + 1);
  };

  return <div>
    <PageTitle eyebrow="Operations / Planning" title="Smart scheduler" description="Every recommendation is built from the job's hard constraints and the simulated regional forecast. Inspect the reason before acting." action={<Button variant="secondary" onClick={() => setRevision((value) => value + 1)} data-testid="button-recompute-all"><RefreshCw size={15} />Recompute all</Button>} />
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      {[{ label: 'Jobs evaluated', value: schedules.length }, { label: 'Feasible', value: schedules.filter((item) => item.schedule.selected).length }, { label: 'Blocked', value: schedules.filter((item) => !item.schedule.selected).length }].map((item) => <div key={item.label} className="flex items-center justify-between rounded-xl border border-[#e0e7eb] bg-white px-4 py-3"><span className="text-xs font-semibold text-[#718391]">{item.label}</span><strong className="font-mono text-lg text-[#17324D]">{item.value}</strong></div>)}
    </div>
    <Notice tone="info"><span><strong>Independent scheduling model.</strong> Higher-priority workloads appear first for triage; every job still follows its own deadline and constraints. Resource availability is evaluated per job, without reservations or concurrent capacity management.</span></Notice>
    <div className="mt-4 grid gap-3">
      {schedules.length ? schedules.map(({ workload, schedule }) => <Panel key={workload.id} className="overflow-hidden" data-testid={`schedule-card-${workload.id}`}>
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><Link href={`/workloads/${workload.id}`} className="font-display text-base font-extrabold text-[#17324D] hover:text-[#18845B]">{workload.name}</Link><StatusBadge status={workload.status} /><span className="rounded bg-[#f0f4f6] px-2 py-1 text-[10px] font-semibold text-[#718391]">{workload.priority} priority</span></div>
            <p className="mt-1.5 text-xs text-[#82919b]">{workload.type} · {workload.runtimeMinutes} min · {workload.cpuCores} CPU · {workload.memoryGb} GB RAM · deadline {new Date(workload.deadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            {schedule.selected ? <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs"><span><span className="text-[#82919b]">Decision </span><strong className="text-[#18845B]">{schedule.action}</strong></span><span><span className="text-[#82919b]">Region </span><strong className="text-[#35536a]">{schedule.selected.regionName}</strong></span><span><span className="text-[#82919b]">Execution </span><strong className="text-[#35536a]">{new Date(schedule.selected.executionAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</strong></span><span><span className="text-[#82919b]">Estimated </span><strong className="text-[#35536a]">{schedule.selected.emissionsGrams.toFixed(1)} gCO₂e · ${schedule.selected.costDollars.toFixed(3)}</strong></span></div> : <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#ac4137]"><CircleAlert size={15} />No feasible schedule · blockers: {schedule.blockingConstraints.join(', ') || 'none identified'}</div>}
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col"><Button variant="secondary" className="min-h-9 px-3 text-xs" onClick={() => setRescheduling(workload)} data-testid={`button-reschedule-scheduler-${workload.id}`}><CalendarClock size={14} />Adjust requirements</Button><Link href={`/workloads/${workload.id}`} className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border border-[#d8e1e7] px-3 text-xs font-semibold text-[#35536a] hover:bg-[#f4f8fa]" data-testid={`link-explanation-${workload.id}`}>Decision record <ArrowRight size={13} /></Link></div>
        </div>
        <div className="border-t border-[#edf0f2] bg-[#fbfcfc] px-5 py-3">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#82919b]"><SlidersHorizontal size={12} />Why this schedule</p>
          <div className="grid gap-2 md:grid-cols-2">{schedule.reasons.slice(0, 4).map((reason) => <p key={reason} className="flex gap-2 text-xs leading-5 text-[#637987]"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#27A69A]" />{reason}</p>)}</div>
          {schedule.selected && <p className="mt-2 text-[11px] text-[#82919b]">Checks: {schedule.selected.constraints.filter((item) => item.passed).length}/{schedule.selected.constraints.length} passed · candidates considered: {schedule.candidates.length}</p>}
        </div>
      </Panel>) : <Panel><EmptyState title="No workloads to schedule" detail="Add a workload or load demo jobs to see transparent scheduling decisions." /></Panel>}
    </div>
    {rescheduling && <WorkloadForm title={`Reschedule · ${rescheduling.name}`} initial={rescheduling} onClose={() => setRescheduling(null)} onSubmit={saveReschedule} />}
  </div>;
}
