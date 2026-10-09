export type WorkloadType =
  | "Model Training"
  | "AI Inference"
  | "Data Processing"
  | "Batch Analytics";

export type Priority = "Low" | "Normal" | "High" | "Critical";
export type GpuRequirement = "None" | "Optional" | "Required";
export type WorkloadStatus = "Pending" | "Running" | "Completed";

export type RecommendationAction =
  | "RUN NOW"
  | "DELAY TO A CLEANER TIME"
  | "SHIFT TO ANOTHER REGION"
  | "NO FEASIBLE SCHEDULE";

export interface Workload {
  id: string;
  name: string;
  type: WorkloadType;
  runtimeMinutes: number;
  powerKw: number;
  cpuCores: number;
  gpuRequirement: GpuRequirement;
  memoryGb: number;
  priority: Priority;
  deadline: string;
  maxWaitMinutes: number;
  maxLatencyMs: number;
  flexibleScheduling: boolean;
  crossRegionAllowed: boolean;
  status: WorkloadStatus;
  createdAt: string;
  isDemo?: boolean;
}

export interface Region {
  id: string;
  name: string;
  isDefault: boolean;
  baseCarbonIntensity: number;
  renewablePercent: number;
  cpuAvailable: number;
  gpuAvailable: number;
  memoryAvailableGb: number;
  networkLatencyMs: number;
  costPerKwh: number;
  phase: number;
  amplitude: number;
}

export interface RegionHour {
  slotIndex: number;
  at: string;
  carbonIntensity: number;
}

export interface RegionForecast extends Region {
  currentCarbonIntensity: number;
  forecast: RegionHour[];
}

export interface ConstraintResult {
  label: string;
  passed: boolean;
  detail: string;
}

export interface ScheduleCandidate {
  workloadId: string;
  regionId: string;
  regionName: string;
  slotIndex: number;
  executionAt: string;
  completionAt: string;
  waitMinutes: number;
  carbonIntensity: number;
  energyKwh: number;
  emissionsGrams: number;
  costDollars: number;
  deadlineCompliant: boolean;
  constraints: ConstraintResult[];
  reasons: string[];
}

export interface WorkloadSchedule {
  workloadId: string;
  action: RecommendationAction;
  selected: ScheduleCandidate | null;
  baseline: ScheduleCandidate | null;
  candidates: ScheduleCandidate[];
  reasons: string[];
  blockingConstraints: string[];
}

export interface StrategyComparison {
  baselineEmissionsGrams: number;
  optimizedEmissionsGrams: number;
  emissionsAvoidedGrams: number;
  reductionPercent: number | null;
  energyKwh: number;
  baselineDelayMinutes: number;
  optimizedDelayMinutes: number;
  baselineDeadlineCompliance: number;
  optimizedDeadlineCompliance: number;
  baselineRegionCounts: Record<string, number>;
  optimizedRegionCounts: Record<string, number>;
  baselineSchedules: WorkloadSchedule[];
  optimizedSchedules: WorkloadSchedule[];
}

export interface DashboardMetrics {
  totalWorkloads: number;
  running: number;
  completed: number;
  pending: number;
  totalEnergyKwh: number;
  estimatedEmissionsGrams: number;
  emissionsAvoidedGrams: number;
  deadlineCompliancePercent: number;
  averageCarbonIntensity: number;
}
