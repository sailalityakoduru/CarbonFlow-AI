import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useParams } from 'wouter';
import { ArrowLeft, CalendarClock, CheckCircle2, Clock3, Pencil, RefreshCw, Trash2, Zap } from 'lucide-react';
import { Form } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { scheduleWorkload } from '../lib/scheduler';
import { addWorkloadFeedback, loadWorkloadFeedback, type WorkloadFeedback } from '../lib/feedback-storage';
import type { ScheduleCandidate, Workload } from '../lib/types';
import { useWorkloads } from '../state/workload-context';
import { Button, LinkButton, Modal, Notice, PageTitle, Panel, PanelHeading, RelativeTime, Select, SmallCheck, StatusBadge } from '../components/ui-kit';
import WorkloadForm from '../components/workload-form';

const fmt = (value: number, digits = 1) => Number.isFinite(value) ? value.toFixed(digits) : '—';
const dateFmt = (value: string) => new Date(value).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
type FeedbackFormValues = { message: string };

function CandidateCard({ title, candidate }: { title: string; candidate: ScheduleCandidate | null }) {
  return <Panel className="overflow-hidden">
    <PanelHeading title={title} detail={candidate ? `${candidate.regionName} · ${dateFmt(candidate.executionAt)}` : 'No feasible candidate'} hint={title === 'Baseline schedule' ? 'The baseline is the earliest feasible execution slot in the default Region A.' : 'The carbon-aware schedule selects the lowest-emission feasible slot across eligible regions and times.'} />
    {candidate ? <div className="p-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['Emissions', `${fmt(candidate.emissionsGrams)} g`], ['Energy', `${fmt(candidate.energyKwh, 2)} kWh`], ['Estimated cost', `$${fmt(candidate.costDollars, 3)}`], ['Wait', `${candidate.waitMinutes} min`]].map(([label, value]) => <div key={label} className="rounded-lg bg-[#f5f8f9] p-3"><p title={label === 'Energy' ? 'Energy consumption (kWh) = average power draw (kW) × runtime in hours.' : label === 'Emissions' ? 'Estimated CO₂e (g) = energy consumption (kWh) × carbon intensity (gCO₂e/kWh).' : undefined} className="text-[10px] font-bold uppercase tracking-wide text-[#82919b]">{label}</p><p className="mt-1 font-mono text-[15px] font-medium text-[#17324D]" data-testid={`result-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</p></div>)}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 border-t border-[#edf0f2] pt-4 text-xs text-[#718391]"><span>Carbon intensity <strong className="ml-1 font-mono text-[#28465d]">{candidate.carbonIntensity} gCO₂e/kWh</strong></span><span>Completes <strong className="ml-1 text-[#28465d]">{dateFmt(candidate.completionAt)}</strong></span><span className={candidate.deadlineCompliant ? 'text-[#18845B]' : 'text-[#b44338]'}>{candidate.deadlineCompliant ? 'Deadline met' : 'Deadline missed'}</span></div>
    </div> : <div className="p-5"><Notice tone="warning">The scheduler did not find a feasible candidate that passes every mandatory constraint. No schedule is fabricated.</Notice></div>}
  </Panel>;
}

export default function WorkloadDetailPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { workloads, updateWorkload, removeWorkload } = useWorkloads();
  const workload = workloads.find((item) => item.id === params.id);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [recomputedAt, setRecomputedAt] = useState(new Date());
  const [feedbackItems, setFeedbackItems] = useState<WorkloadFeedback[]>([]);
  const [feedbackLoaded, setFeedbackLoaded] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const feedbackForm = useForm<FeedbackFormValues>({ defaultValues: { message: '' } });
  const schedule = useMemo(() => workload ? scheduleWorkload(workload, undefined, recomputedAt) : null, [workload, recomputedAt]);
  useEffect(() => {
    setFeedbackLoaded(false);
    try {
      setFeedbackItems(loadWorkloadFeedback(params.id));
      setFeedbackError('');
    } catch (error) {
      setFeedbackItems([]);
      setFeedbackError(error instanceof Error ? error.message : 'Unable to load workload feedback.');
    }
    setFeedbackLoaded(true);
  }, [params.id]);
  if (!workload || !schedule) return <Panel><div className="p-8"><Notice tone="error">This workload could not be found in the local workspace.</Notice><div className="mt-4"><LinkButton href="/workloads">Return to workloads</LinkButton></div></div></Panel>;

  const update = (data: Omit<Workload, 'id' | 'createdAt'>) => {
    updateWorkload({ ...workload, ...data, id: workload.id, createdAt: workload.createdAt });
    setEditing(false);
    setRecomputedAt(new Date());
  };
  const submitFeedback = (values: FeedbackFormValues) => {
    const message = values.message.trim();
    if (!message) {
      feedbackForm.setError('message', { type: 'manual', message: 'Write feedback before submitting.' });
      return;
    }

    try {
      const savedFeedback = addWorkloadFeedback(workload.id, message);
      setFeedbackItems((current) => [...current, savedFeedback]);
      setFeedbackError('');
      feedbackForm.reset({ message: '' });
      toast({ title: 'Feedback submitted', description: 'Your feedback is saved for this workload in this browser.' });
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : 'Unable to save workload feedback.');
    }
  };
  const selectedConstraints = schedule.selected?.constraints ?? schedule.candidates[0]?.constraints ?? [];

  return <div>
    <div className="mb-4"><LinkButton href="/workloads" className="text-xs"><ArrowLeft size={14} />Back to workload queue</LinkButton></div>
    <PageTitle eyebrow="Workload / Decision record" title={workload.name} description={`${workload.type} · created ` + new Date(workload.createdAt).toLocaleDateString()} action={<><StatusBadge status={workload.status} /><Button variant="secondary" onClick={() => setEditing(true)} data-testid="button-edit-detail"><Pencil size={14} />Edit</Button><Button variant="secondary" onClick={() => setEditing(true)} data-testid="button-reschedule-detail"><CalendarClock size={14} />Reschedule</Button><Button variant="danger" onClick={() => setDeleting(true)} data-testid="button-delete-detail"><Trash2 size={14} /></Button></>} />
    <div className="mb-4 grid gap-4 lg:grid-cols-[1.4fr_.85fr]">
      <Panel><PanelHeading title="Recommendation" detail="Computed from current simulated region conditions and this workload's requirements" action={<Button variant="secondary" className="min-h-8 px-2.5 text-xs" onClick={() => setRecomputedAt(new Date())} data-testid="button-recompute"><RefreshCw size={13} />Recompute</Button>} /><div className="p-5">
        {schedule.selected ? <div className="flex gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#e8f5ee] text-[#18845B]"><Zap size={23} /></span><div><span className="inline-flex rounded-md bg-[#e8f5ee] px-2.5 py-1 text-[10px] font-extrabold tracking-[.1em] text-[#176b4a]" data-testid="result-recommendation">{schedule.action}</span><h2 className="mt-2 font-display text-xl font-extrabold text-[#17324D]">Run in {schedule.selected.regionName}</h2><p className="mt-1 text-sm text-[#718391]">{schedule.selected.waitMinutes ? `Wait ${schedule.selected.waitMinutes} minutes for a lower-carbon window.` : 'Start immediately in the best feasible region.'} Estimated emissions: <strong className="text-[#28465d]">{fmt(schedule.selected.emissionsGrams)} gCO₂e</strong>.</p></div></div> : <Notice tone="error"><div><strong>No feasible schedule.</strong><br />{schedule.reasons.join(' ')}</div></Notice>}
        {schedule.reasons.length > 0 && <ul className="mt-5 grid gap-2 border-t border-[#edf0f2] pt-4">{schedule.reasons.map((reason) => <li key={reason} className="flex gap-2 text-xs leading-5 text-[#617786]"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#18845B]" />{reason}</li>)}</ul>}
      </div></Panel>
      <Panel><PanelHeading title="Requirements & constraints" detail="The scheduler must pass every hard constraint" /><div className="divide-y divide-[#edf0f2] px-5">
        {[
          ['Runtime', `${workload.runtimeMinutes} minutes`],
          ['Power draw', `${workload.powerKw} kW · ${fmt(workload.powerKw * workload.runtimeMinutes / 60, 2)} kWh estimated`],
          ['Compute', `${workload.cpuCores} CPU cores · ${workload.memoryGb} GB memory · GPU ${workload.gpuRequirement.toLowerCase()}`],
          ['Deadline', dateFmt(workload.deadline)],
          ['Scheduling window', `${workload.flexibleScheduling ? 'Flexible' : 'Must run now'} · max ${workload.maxWaitMinutes} min wait`],
          ['Network', `≤ ${workload.maxLatencyMs} ms${workload.crossRegionAllowed ? ' · cross-region permitted' : ' · default region only'}`],
        ].map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-3 text-xs"><span className="text-[#82919b]">{label}</span><strong className="text-right font-semibold text-[#35536a]">{value}</strong></div>)}
        <div className="flex items-center justify-between py-3 text-xs"><span className="text-[#82919b]">Priority</span><strong className={`rounded px-2 py-1 ${workload.priority === 'Critical' ? 'bg-[#fff1ef] text-[#a6362e]' : 'bg-[#edf5fc] text-[#416784]'}`}>{workload.priority}</strong></div>
      </div></Panel>
    </div>
    <div className="grid gap-4 xl:grid-cols-2"><CandidateCard title="Baseline schedule" candidate={schedule.baseline} /><CandidateCard title="Carbon-aware schedule" candidate={schedule.selected} /></div>
    <Panel className="mt-4 overflow-hidden"><PanelHeading title="Constraint checks" detail={schedule.selected ? 'Checks for the selected candidate' : 'Checks from the closest candidate; no candidate is feasible'} action={<span className="text-xs font-semibold text-[#718391]">{selectedConstraints.filter((item) => item.passed).length}/{selectedConstraints.length} passed</span>} />
      {selectedConstraints.length ? <div className="grid gap-0 divide-y divide-[#edf0f2] sm:grid-cols-2 sm:divide-y-0">{selectedConstraints.map((constraint, index) => <div key={constraint.label} className={`flex items-start gap-3 px-5 py-3.5 ${index % 2 ? 'sm:border-l sm:border-[#edf0f2]' : ''} ${index > 1 ? 'sm:border-t sm:border-[#edf0f2]' : ''}`}><SmallCheck passed={constraint.passed} /><div><p className="text-xs font-bold text-[#35536a]">{constraint.label}</p><p className="mt-1 text-xs leading-5 text-[#82919b]">{constraint.detail}</p></div></div>)}</div> : <div className="p-5"><Notice tone="warning">No eligible candidate checks are available.</Notice></div>}
    </Panel>
    <div className="mt-4" data-testid={`section-workload-feedback-${workload.id}`}>
      <Panel className="overflow-hidden">
        <PanelHeading title="Workload feedback" detail="Feedback is saved in this browser and tied to this workload." action={<span className="text-xs font-semibold text-[#718391]">{feedbackItems.length} submitted</span>} />
        <Form {...feedbackForm}>
          <form onSubmit={feedbackForm.handleSubmit(submitFeedback)} className="grid gap-3 p-5">
            <label htmlFor="workload-feedback-message" className="text-xs font-semibold text-[#35536a]">Share feedback about this workload</label>
            <textarea
              id="workload-feedback-message"
              {...feedbackForm.register('message')}
              rows={4}
              maxLength={1000}
              placeholder="What should be changed or improved?"
              aria-label={`Feedback for ${workload.name}`}
              aria-describedby={feedbackForm.formState.errors.message ? 'workload-feedback-error' : undefined}
              aria-invalid={Boolean(feedbackForm.formState.errors.message)}
              className="w-full resize-y rounded-lg border border-[#d8e1e7] bg-white px-3 py-2.5 text-sm text-[#28465d] outline-none placeholder:text-[#9aa9b2] focus:border-[#18845B] focus:ring-2 focus:ring-[#18845B]/10"
              data-testid="input-workload-feedback"
            />
            {feedbackForm.formState.errors.message && <p id="workload-feedback-error" role="alert" className="text-xs text-[#b3362d]">{feedbackForm.formState.errors.message.message}</p>}
            {feedbackError && <Notice tone="error"><span>{feedbackError}</span></Notice>}
            <div className="flex justify-end">
              <Button type="submit" disabled={!feedbackLoaded || !feedbackForm.watch('message').trim()} data-testid="button-submit-workload-feedback">Send feedback</Button>
            </div>
          </form>
        </Form>
        {feedbackItems.length > 0 && <div className="border-t border-[#edf0f2] px-5 py-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#82919b]">Submitted feedback</h3>
          <ul className="grid gap-2">{feedbackItems.map((item) => <li key={item.id} className="rounded-lg bg-[#f5f8f9] px-3 py-2.5" data-testid={`feedback-entry-${item.id}`}>
            <p className="whitespace-pre-wrap text-sm leading-5 text-[#35536a]">{item.message}</p>
            <time className="mt-1 block text-[10px] text-[#82919b]" dateTime={item.submittedAt}>{new Date(item.submittedAt).toLocaleString()}</time>
          </li>)}</ul>
        </div>}
      </Panel>
    </div>
    <Notice tone="info"><span><strong>Independent capacity model.</strong> CPU, GPU, and memory availability are simulated per job. Workloads are scheduled independently and do not reserve shared capacity.</span></Notice>
    <div className="mt-3 flex items-center gap-2 text-xs text-[#8796a0]"><Clock3 size={13} />Last recomputed <RelativeTime value={recomputedAt.toISOString()} /></div>
    {editing && <WorkloadForm title="Edit or reschedule workload" initial={workload} onClose={() => setEditing(false)} onSubmit={update} />}
    {deleting && <Modal title="Delete workload?" onClose={() => setDeleting(false)} size="max-w-md"><div className="p-6"><p className="text-sm text-[#718391]">Delete <strong>{workload.name}</strong> from this workspace? All aggregate metrics will be recalculated.</p><div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeleting(false)}>Cancel</Button><Button variant="danger" onClick={() => { removeWorkload(workload.id); setDeleting(false); setLocation('/workloads'); }} data-testid="button-confirm-delete-detail"><Trash2 size={15} />Delete</Button></div></div></Modal>}
  </div>;
}
