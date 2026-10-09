export type WorkloadFeedback = {
  id: string;
  message: string;
  submittedAt: string;
};

const FEEDBACK_STORAGE_KEY = 'carbonops:workload-feedback:v1';
type FeedbackStore = Record<string, WorkloadFeedback[]>;

function readFeedbackStore(): FeedbackStore {
  const saved = window.localStorage.getItem(FEEDBACK_STORAGE_KEY);
  if (!saved) return {};

  const parsed: unknown = JSON.parse(saved);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Saved workload feedback has an invalid format.');
  }
  return parsed as FeedbackStore;
}

export function loadWorkloadFeedback(workloadId: string): WorkloadFeedback[] {
  return readFeedbackStore()[workloadId] ?? [];
}

export function addWorkloadFeedback(workloadId: string, message: string): WorkloadFeedback {
  const store = readFeedbackStore();
  const entry: WorkloadFeedback = {
    id: crypto.randomUUID(),
    message,
    submittedAt: new Date().toISOString(),
  };

  store[workloadId] = [...(store[workloadId] ?? []), entry];
  window.localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(store));
  return entry;
}
