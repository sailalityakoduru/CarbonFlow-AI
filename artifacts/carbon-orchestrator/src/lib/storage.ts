import { createDemoWorkloads, STORAGE_KEY } from "./simulated-data";
import type { Workload } from "./types";

export function loadWorkloads(): Workload[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed as Workload[];
    }
    const demoWorkloads = createDemoWorkloads();
    saveWorkloads(demoWorkloads);
    return demoWorkloads;
  } catch {
    return createDemoWorkloads();
  }
}

export function saveWorkloads(workloads: Workload[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workloads));
  } catch (error) {
    console.error("Unable to save workloads in this browser.", error);
  }
}

export function createWorkloadId(): string {
  return crypto.randomUUID();
}
