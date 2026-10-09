import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { Button, Field, Input, Modal, Select } from './ui-kit';
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
    onSubmit({ ...values, name: values.name.trim(), deadline: new Date(values.deadline).toISOString() });
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
  </Modal>;
}
