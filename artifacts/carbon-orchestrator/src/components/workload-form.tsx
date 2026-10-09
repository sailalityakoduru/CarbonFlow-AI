import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { Button, Field, Input, Modal, Select } from './ui-kit';
import { toast } from '@/hooks/use-toast';
import type { GpuRequirement, Priority, Workload, WorkloadStatus, WorkloadType } from '../lib/types';

const types: WorkloadType[] = ['Model Training', 'AI Inference', 'Data Processing', 'Batch Analytics'];
const priorities: Priority[] = ['Low', 'Normal', 'High', 'Critical'];
const gpuTypes: GpuRequirement[] = ['None', 'Optional', 'Required'];

const asLocalInput = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

type FormValues = Omit<Workload, 'id' | 'createdAt'>;
export default function WorkloadForm({ title, onClose, onSubmit, initial }: { title: string; onClose: () => void; onSubmit: (value: FormValues) => void; initial?: Workload }) {
  const defaultDeadline = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  const [pendingAdd, setPendingAdd] = useState<FormValues | null>(null);
  const [confirmingAdd, setConfirmingAdd] = useState(false);
  const confirmingAddRef = useRef(false);
  const form = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: {
      name: initial?.name ?? '',
      type: initial?.type ?? 'Model Training',
      runtimeMinutes: initial?.runtimeMinutes ?? 60,
      powerKw: initial?.powerKw ?? 4,
      cpuCores: initial?.cpuCores ?? 8,
      gpuRequirement: initial?.gpuRequirement ?? 'Optional',
      memoryGb: initial?.memoryGb ?? 32,
      priority: initial?.priority ?? 'Normal',
      deadline: initial?.deadline ?? defaultDeadline,
      maxWaitMinutes: initial?.maxWaitMinutes ?? 120,
      maxLatencyMs: initial?.maxLatencyMs ?? 200,
      flexibleScheduling: initial?.flexibleScheduling ?? true,
      crossRegionAllowed: initial?.crossRegionAllowed ?? true,
      status: initial?.status ?? 'Pending',
      isDemo: initial?.isDemo ?? false,
    },
  });
  const numberField = (key: 'runtimeMinutes' | 'powerKw' | 'cpuCores' | 'memoryGb' | 'maxWaitMinutes' | 'maxLatencyMs', label: string, min: number, step = 1) => <Field key={key} label={label} error={form.formState.errors[key]?.message}><Input type="number" min={min} step={step} {...form.register(key, { valueAsNumber: true })} data-testid={`input-${key}`} /></Field>;
  const handleSubmit = (values: FormValues) => {
    form.clearErrors();
    if (!values.name.trim()) {
      form.setError('name', { type: 'manual', message: 'Give this workload a descriptive name.' });
      return;
    }
    const positiveValues: Array<[keyof FormValues, number, string]> = [
      ['runtimeMinutes', values.runtimeMinutes, 'Runtime must be greater than zero.'],
      ['powerKw', values.powerKw, 'Power draw must be greater than zero.'],
      ['cpuCores', values.cpuCores, 'CPU cores must be greater than zero.'],
      ['memoryGb', values.memoryGb, 'Memory must be greater than zero.'],
      ['maxLatencyMs', values.maxLatencyMs, 'Maximum latency must be greater than zero.'],
    ];
    for (const [key, value, message] of positiveValues) {
      if (!Number.isFinite(value) || value <= 0) {
        form.setError(key, { type: 'manual', message });
        return;
      }
    }
    if (!Number.isFinite(values.maxWaitMinutes) || values.maxWaitMinutes < 0) {
      form.setError('maxWaitMinutes', { type: 'manual', message: 'Maximum wait cannot be negative.' });
      return;
    }
    if (!values.deadline || !Number.isFinite(new Date(values.deadline).getTime())) {
      form.setError('deadline', { type: 'manual', message: 'Enter a valid deadline.' });
      return;
    }
    if (new Date(values.deadline).getTime() <= Date.now()) {
      form.setError('deadline', { type: 'manual', message: 'Deadline must be in the future.' });
      return;
    }
    const submittedValues = { ...values, name: values.name.trim(), deadline: new Date(values.deadline).toISOString() };
    if (!initial) {
      setPendingAdd(submittedValues);
      return;
    }
    onSubmit(submittedValues);
  };

  const cancelAddConfirmation = () => {
    setPendingAdd(null);
    confirmingAddRef.current = false;
    setConfirmingAdd(false);
  };

  const confirmAdd = () => {
    if (!pendingAdd || confirmingAddRef.current) return;
    confirmingAddRef.current = true;
    setConfirmingAdd(true);
    try {
      onSubmit(pendingAdd);
      toast({ title: 'Workload added successfully.' });
      setPendingAdd(null);
      onClose();
    } catch (error) {
      confirmingAddRef.current = false;
      setConfirmingAdd(false);
      form.setError('root', {
        type: 'manual',
        message: error instanceof Error ? error.message : 'Unable to add this workload.',
      });
    }
  };

  return <Modal title={title} onClose={onClose}>
    <Form {...form}><form onSubmit={form.handleSubmit(handleSubmit)} className="max-h-[82vh] overflow-y-auto px-6 py-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Workload name" error={form.formState.errors.name?.message}><Input autoFocus {...form.register('name')} placeholder="e.g. Embedding refresh pipeline" data-testid="input-workload-name" /></Field>
        <Field label="Workload type"><Select {...form.register('type')} data-testid="select-workload-type">{types.map((type) => <option key={type}>{type}</option>)}</Select></Field>
        {numberField('runtimeMinutes', 'Runtime (minutes)', 1)}
        {numberField('powerKw', 'Power draw (kW)', 0.1, 0.1)}
        {numberField('cpuCores', 'CPU cores', 1)}
        {numberField('memoryGb', 'Memory (GB)', 1)}
        <Field label="GPU requirement"><Select {...form.register('gpuRequirement')} data-testid="select-gpu-requirement">{gpuTypes.map((type) => <option key={type}>{type}</option>)}</Select></Field>
        <Field label="Priority"><Select {...form.register('priority')} data-testid="select-priority">{priorities.map((priority) => <option key={priority}>{priority}</option>)}</Select></Field>
        <Field label="Deadline" error={form.formState.errors.deadline?.message}><Input type="datetime-local" value={form.watch('deadline') && Number.isFinite(new Date(form.watch('deadline')).getTime()) ? asLocalInput(form.watch('deadline')) : ''} onChange={(event) => form.setValue('deadline', event.target.value ? new Date(event.target.value).toISOString() : '', { shouldValidate: true })} data-testid="input-deadline" /></Field>
        {numberField('maxWaitMinutes', 'Maximum wait (minutes)', 0)}
        {numberField('maxLatencyMs', 'Maximum network latency (ms)', 1)}
        <Field label="Status"><Select {...form.register('status')} data-testid="select-status">{(['Pending', 'Running', 'Completed'] as WorkloadStatus[]).map((status) => <option key={status}>{status}</option>)}</Select></Field>
      </div>
      <div className="mt-5 grid gap-3 rounded-xl bg-[#f1f6f7] p-4 sm:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3 text-sm"><input type="checkbox" {...form.register('flexibleScheduling')} className="mt-0.5 accent-[#18845B]" data-testid="checkbox-flexible-scheduling" /><span><strong className="block text-[#28465d]">Flexible scheduling</strong><span className="text-xs font-normal text-[#718391]">May wait up to the configured limit for a cleaner slot.</span></span></label>
        <label className="flex cursor-pointer items-start gap-3 text-sm"><input type="checkbox" {...form.register('crossRegionAllowed')} className="mt-0.5 accent-[#18845B]" data-testid="checkbox-cross-region" /><span><strong className="block text-[#28465d]">Allow cross-region execution</strong><span className="text-xs font-normal text-[#718391]">Consider eligible regions beyond the default.</span></span></label>
      </div>
      {form.formState.errors.root?.message && <p role="alert" className="mt-4 rounded-lg bg-[#fff1ef] px-3 py-2.5 text-sm text-[#a6362e]" data-testid="text-form-error">{form.formState.errors.root.message}</p>}
      <div className="mt-6 flex justify-end gap-2 border-t border-[#e4eaee] pt-4"><Button type="button" variant="secondary" onClick={onClose} data-testid="button-cancel-workload">Cancel</Button><Button type="submit" data-testid="button-save-workload">{initial ? 'Save changes' : 'Create workload'}</Button></div>
    </form></Form>
    {pendingAdd && <Modal title="Confirm workload details" onClose={cancelAddConfirmation} size="max-w-2xl">
      <div className="p-6" data-testid="dialog-confirm-add-workload">
        <p className="mb-4 text-sm text-[#718391]">Review the workload details before adding it to the queue.</p>
        <dl className="grid max-h-[55vh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {[
            ['Workload name', pendingAdd.name],
            ['Workload type', pendingAdd.type],
            ['Runtime', `${pendingAdd.runtimeMinutes} minutes`],
            ['Power draw', `${pendingAdd.powerKw} kW`],
            ['CPU cores', `${pendingAdd.cpuCores}`],
            ['GPU requirement', pendingAdd.gpuRequirement],
            ['Memory', `${pendingAdd.memoryGb} GB`],
            ['Priority', pendingAdd.priority],
            ['Deadline', new Date(pendingAdd.deadline).toLocaleString()],
            ['Maximum wait', `${pendingAdd.maxWaitMinutes} minutes`],
            ['Maximum latency', `${pendingAdd.maxLatencyMs} ms`],
            ['Flexible scheduling', pendingAdd.flexibleScheduling ? 'Yes' : 'No'],
            ['Cross-region execution', pendingAdd.crossRegionAllowed ? 'Allowed' : 'Default region only'],
            ['Status', pendingAdd.status],
          ].map(([label, value]) => <div key={label} className="rounded-lg bg-[#f5f8f9] px-3 py-2.5">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-[#82919b]">{label}</dt>
            <dd className="mt-1 break-words text-sm font-semibold text-[#28465d]">{value}</dd>
          </div>)}
        </dl>
        <div className="mt-6 flex justify-end gap-2 border-t border-[#e4eaee] pt-4">
          <Button type="button" variant="secondary" onClick={cancelAddConfirmation} data-testid="button-cancel-confirm-add">Cancel</Button>
          <Button type="button" onClick={confirmAdd} disabled={confirmingAdd} data-testid="button-confirm-add-workload">{confirmingAdd ? 'Adding…' : 'Confirm & Add'}</Button>
        </div>
      </div>
    </Modal>}
  </Modal>;
}
