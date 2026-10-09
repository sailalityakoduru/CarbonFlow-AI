import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createDemoWorkloads } from '../lib/simulated-data';
import { createWorkloadId, loadWorkloads, saveWorkloads } from '../lib/storage';
import type { Workload } from '../lib/types';

type WorkloadContextValue = {
  workloads: Workload[];
  addWorkload: (workload: Omit<Workload, 'id' | 'createdAt'>) => Workload;
  updateWorkload: (workload: Workload) => void;
  removeWorkload: (id: string) => void;
  removeDemoWorkloads: () => void;
  loadDemoData: () => void;
  resetDemo: () => void;
};

const WorkloadContext = createContext<WorkloadContextValue | null>(null);

export function WorkloadProvider({ children }: { children: ReactNode }) {
  const [workloads, setWorkloads] = useState<Workload[]>(() => loadWorkloads());

  useEffect(() => {
    saveWorkloads(workloads);
  }, [workloads]);

  const value = useMemo<WorkloadContextValue>(() => ({
    workloads,
    addWorkload: (workload) => {
      const record: Workload = { ...workload, id: createWorkloadId(), createdAt: new Date().toISOString() };
      setWorkloads((current) => [...current, record]);
      return record;
    },
    updateWorkload: (workload) => setWorkloads((current) => current.map((item) => item.id === workload.id ? workload : item)),
    removeWorkload: (id) => setWorkloads((current) => current.filter((item) => item.id !== id)),
    removeDemoWorkloads: () => setWorkloads((current) => current.filter((item) => !item.isDemo)),
    loadDemoData: () => setWorkloads((current) => {
      const existingIds = new Set(current.map((item) => item.id));
      return [...current, ...createDemoWorkloads().filter((item) => !existingIds.has(item.id))];
    }),
    resetDemo: () => setWorkloads(createDemoWorkloads()),
  }), [workloads]);

  return <WorkloadContext.Provider value={value}>{children}</WorkloadContext.Provider>;
}

export function useWorkloads() {
  const context = useContext(WorkloadContext);
  if (!context) throw new Error('useWorkloads must be used within WorkloadProvider');
  return context;
}
