import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { CalendarClock, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { scheduleWorkload } from '../lib/scheduler';
import type { Priority, Workload, WorkloadStatus, WorkloadType } from '../lib/types';
import { useWorkloads } from '../state/workload-context';
import { Button, EmptyState, Field, Input, Modal, PageTitle, Panel, Select, StatusBadge } from '../components/ui-kit';
import WorkloadForm from '../components/workload-form';

export default function WorkloadsPage() {
  const { workloads, addWorkload, updateWorkload, removeWorkload } = useWorkloads();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [type, setType] = useState('All types');
  const [priority, setPriority] = useState('All priorities');
  const [editing, setEditing] = useState<Workload | null>(null);
  const [rescheduling, setRescheduling] = useState<Workload | null>(null);
  const [deleting, setDeleting] = useState<Workload | null>(null);

  const filtered = useMemo(() => workloads.filter((workload) =>
    `${workload.name} ${workload.type}`.toLowerCase().includes(query.toLowerCase())
    && (status === 'All statuses' || workload.status === status)
    && (type === 'All types' || workload.type === type)
    && (priority === 'All priorities' || workload.priority === priority),
  ), [workloads, query, status, type, priority]);

  const saveEdited = (value: Omit<Workload, 'id' | 'createdAt'>, source: Workload) => {
    updateWorkload({ ...source, ...value, id: source.id, createdAt: source.createdAt });
    setEditing(null);
    setRescheduling(null);
  };
  const types: WorkloadType[] = ['Model Training', 'AI Inference', 'Data Processing', 'Batch Analytics'];
  const priorities: Priority[] = ['Low', 'Normal', 'High', 'Critical'];
  const statuses: WorkloadStatus[] = ['Pending', 'Running', 'Completed'];

  return <div>
    <PageTitle eyebrow="Operations / Queue" title="Workloads" description="Inspect every job's requirements, execution constraints, and computed schedule. Changes persist in this browser." action={<span className="rounded-lg bg-[#edf5fc] px-3 py-2 text-xs font-semibold text-[#416784]">{filtered.length} of {workloads.length} records</span>} />
    <Panel className="mb-4 overflow-hidden">
      <div className="grid gap-3 p-4 md:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(145px,.55fr))]">
        <label className="relative"><span className="sr-only">Search workloads</span><Search size={16} className="absolute left-3 top-3 text-[#82919b]" /><Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search workload name or type..." className="pl-9" data-testid="input-search-workloads" /></label>
        <Select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} data-testid="filter-status"><option>All statuses</option>{statuses.map((option) => <option key={option}>{option}</option>)}</Select>
        <Select aria-label="Filter by type" value={type} onChange={(event) => setType(event.target.value)} data-testid="filter-type"><option>All types</option>{types.map((option) => <option key={option}>{option}</option>)}</Select>
        <Select aria-label="Filter by priority" value={priority} onChange={(event) => setPriority(event.target.value)} data-testid="filter-priority"><option>All priorities</option>{priorities.map((option) => <option key={option}>{option}</option>)}</Select>
      </div>
    </Panel>
    <Panel className="overflow-hidden">
      {filtered.length ? <>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[930px] border-collapse text-left">
            <thead className="bg-[#f7f9fa] text-[10px] uppercase tracking-[.11em] text-[#718391]"><tr><th className="px-5 py-3.5 font-bold">Workload</th><th className="px-4 py-3.5 font-bold">Status</th><th className="px-4 py-3.5 font-bold">Priority</th><th className="px-4 py-3.5 font-bold">Requirements</th><th className="px-4 py-3.5 font-bold">Schedule decision</th><th className="px-4 py-3.5 font-bold text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-[#edf0f2]">{filtered.map((workload) => {
              const schedule = scheduleWorkload(workload);
              return <tr key={workload.id} className="hover:bg-[#fbfcfc]" data-testid={`row-workload-${workload.id}`}>
                <td className="px-5 py-4"><Link href={`/workloads/${workload.id}`} className="font-bold text-[#28465d] hover:text-[#18845B]" data-testid={`link-workload-${workload.id}`}>{workload.name}</Link><div className="mt-1 text-xs text-[#82919b]">{workload.type} · {workload.runtimeMinutes} min</div></td>
                <td className="px-4 py-4"><StatusBadge status={workload.status} /></td>
                <td className="px-4 py-4 text-xs font-semibold text-[#496171]">{workload.priority}</td>
                <td className="px-4 py-4 text-xs leading-5 text-[#718391]">{workload.cpuCores} CPU · {workload.memoryGb} GB{workload.gpuRequirement === 'None' ? '' : ` · GPU ${workload.gpuRequirement.toLowerCase()}`}</td>
                <td className="px-4 py-4"><span className={`text-xs font-bold ${schedule.selected ? 'text-[#18845B]' : 'text-[#b44338]'}`}>{schedule.action.toLowerCase()}</span>{schedule.selected && <div className="mt-1 text-[11px] text-[#82919b]">{schedule.selected.regionName} · {schedule.selected.waitMinutes} min wait</div>}</td>
                <td className="px-4 py-4"><div className="flex justify-end gap-1"><button onClick={() => setRescheduling(workload)} title="Reschedule workload" aria-label={`Reschedule ${workload.name}`} className="rounded-md p-2 text-[#597080] hover:bg-[#edf5f4] hover:text-[#18845B]" data-testid={`button-reschedule-${workload.id}`}><CalendarClock size={16} /></button><button onClick={() => setEditing(workload)} title="Edit workload" aria-label={`Edit ${workload.name}`} className="rounded-md p-2 text-[#597080] hover:bg-[#edf5f4] hover:text-[#18845B]" data-testid={`button-edit-${workload.id}`}><Pencil size={15} /></button><button onClick={() => setDeleting(workload)} title="Delete workload" aria-label={`Delete ${workload.name}`} className="rounded-md p-2 text-[#9b6a65] hover:bg-[#fff1ef] hover:text-[#b3362d]" data-testid={`button-delete-${workload.id}`}><Trash2 size={15} /></button><Link href={`/workloads/${workload.id}`} aria-label={`View ${workload.name}`} className="rounded-md p-2 text-[#597080] hover:bg-[#edf5f4] hover:text-[#18845B]" data-testid={`button-details-${workload.id}`}><ChevronRight size={16} /></Link></div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        <div className="divide-y divide-[#edf0f2] md:hidden">{filtered.map((workload) => {
          const schedule = scheduleWorkload(workload);
          return <article key={workload.id} className="p-4" data-testid={`card-workload-${workload.id}`}>
            <div className="flex justify-between gap-3"><div className="min-w-0"><Link href={`/workloads/${workload.id}`} className="block truncate text-sm font-bold text-[#28465d]">{workload.name}</Link><p className="mt-1 text-xs text-[#82919b]">{workload.type} · {workload.runtimeMinutes} minutes</p></div><StatusBadge status={workload.status} /></div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#647a89]"><span className="rounded bg-[#f1f5f6] px-2 py-1">{workload.priority} priority</span><span className="rounded bg-[#f1f5f6] px-2 py-1">{workload.cpuCores} CPU · {workload.memoryGb} GB</span></div>
            <div className={`mt-3 text-xs font-bold ${schedule.selected ? 'text-[#18845B]' : 'text-[#b44338]'}`}>{schedule.action.toLowerCase()}</div>
            <div className="mt-3 flex gap-2"><Button variant="secondary" className="min-h-9 flex-1 px-2 text-xs" onClick={() => setRescheduling(workload)} data-testid={`button-reschedule-${workload.id}`}><CalendarClock size={14} />Reschedule</Button><Button variant="secondary" className="min-h-9 px-3" onClick={() => setEditing(workload)} aria-label="Edit workload" data-testid={`button-edit-${workload.id}`}><Pencil size={14} /></Button><Button variant="danger" className="min-h-9 px-3" onClick={() => setDeleting(workload)} aria-label="Delete workload" data-testid={`button-delete-${workload.id}`}><Trash2 size={14} /></Button></div>
          </article>;
        })}</div>
      </> : <EmptyState title={workloads.length ? 'No matching workloads' : 'The queue is clear'} detail={workloads.length ? 'Adjust the search or filters to find a workload.' : 'Create a workload to begin scheduling jobs against carbon, latency, and deadline constraints.'} action={<Button onClick={() => setEditing({ id: '', name: '', type: 'AI Inference', runtimeMinutes: 30, powerKw: 1, cpuCores: 2, gpuRequirement: 'Optional', memoryGb: 8, priority: 'Normal', deadline: new Date(Date.now() + 3600000).toISOString(), maxWaitMinutes: 60, maxLatencyMs: 100, flexibleScheduling: true, crossRegionAllowed: false, status: 'Pending', createdAt: new Date().toISOString() })} data-testid="button-create-first"><Plus size={15} />Create workload</Button>} />}
    </Panel>
    {editing && <WorkloadForm title={editing.id ? 'Edit workload' : 'Create workload'} initial={editing.id ? editing : undefined} onClose={() => setEditing(null)} onSubmit={(data) => editing.id ? saveEdited(data, editing) : (addWorkload(data), setEditing(null))} />}
    {rescheduling && <WorkloadForm title={`Reschedule · ${rescheduling.name}`} initial={rescheduling} onClose={() => setRescheduling(null)} onSubmit={(data) => saveEdited(data, rescheduling)} />}
    {deleting && <Modal title="Delete workload?" onClose={() => setDeleting(null)} size="max-w-md"><div className="px-6 py-5"><p className="text-sm leading-6 text-[#718391]">Remove <strong className="text-[#28465d]">{deleting.name}</strong> from the local workspace? This will update all metrics and comparisons.</p><div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeleting(null)} data-testid="button-cancel-delete">Cancel</Button><Button variant="danger" onClick={() => { removeWorkload(deleting.id); setDeleting(null); }} data-testid="button-confirm-delete"><Trash2 size={15} />Delete workload</Button></div></div></Modal>}
  </div>;
}
