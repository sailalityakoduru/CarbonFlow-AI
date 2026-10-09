import type { Region, RegionForecast, Workload } from "./types";

export const STORAGE_KEY = "carbon-orchestrator-workloads-v1";

export const REGIONS: Region[] = [
  {
    id: "region-a",
    name: "Region A",
    isDefault: true,
    baseCarbonIntensity: 455,
    renewablePercent: 24,
    cpuAvailable: 96,
    gpuAvailable: 8,
    memoryAvailableGb: 512,
    networkLatencyMs: 45,
    costPerKwh: 0.12,
    phase: 1,
    amplitude: 94,
  },
  {
    id: "region-b",
    name: "Region B",
    isDefault: false,
    baseCarbonIntensity: 332,
    renewablePercent: 48,
    cpuAvailable: 64,
    gpuAvailable: 4,
    memoryAvailableGb: 384,
    networkLatencyMs: 92,
    costPerKwh: 0.1,
    phase: 7,
    amplitude: 118,
  },
  {
    id: "region-c",
    name: "Region C",
    isDefault: false,
    baseCarbonIntensity: 248,
    renewablePercent: 71,
    cpuAvailable: 48,
    gpuAvailable: 2,
    memoryAvailableGb: 256,
    networkLatencyMs: 158,
    costPerKwh: 0.15,
    phase: 13,
    amplitude: 76,
  },
];

export function carbonIntensityAt(region: Region, slotIndex: number): number {
  const hour = slotIndex + region.phase;
  const dailyCycle = Math.sin((2 * Math.PI * hour) / 24);
  const renewableCycle = Math.sin((2 * Math.PI * (hour - 7)) / 24);
  return Math.max(
    55,
    Math.round(
      region.baseCarbonIntensity +
        region.amplitude * (0.64 * dailyCycle + 0.36 * renewableCycle),
    ),
  );
}

export function getRegionForecasts(now = new Date()): RegionForecast[] {
  const currentHour = new Date(now);
  currentHour.setMinutes(0, 0, 0);

  return REGIONS.map((region) => {
    const forecast = Array.from({ length: 24 }, (_, slotIndex) => {
      const at = new Date(currentHour.getTime() + slotIndex * 60 * 60 * 1000);
      return {
        slotIndex,
        at: at.toISOString(),
        carbonIntensity: carbonIntensityAt(region, slotIndex),
      };
    });

    return {
      ...region,
      currentCarbonIntensity: carbonIntensityAt(region, 0),
      forecast,
    };
  });
}

export function createDemoWorkloads(now = new Date()): Workload[] {
  const future = (minutes: number) =>
    new Date(now.getTime() + minutes * 60_000).toISOString();
  const createdAt = now.toISOString();

  return [
    {
      id: "demo-inference",
      name: "Live inference · edge requests",
      type: "AI Inference",
      runtimeMinutes: 18,
      powerKw: 1.2,
      cpuCores: 4,
      gpuRequirement: "Optional",
      memoryGb: 16,
      priority: "Critical",
      deadline: future(75),
      maxWaitMinutes: 10,
      maxLatencyMs: 60,
      flexibleScheduling: false,
      crossRegionAllowed: false,
      status: "Running",
      createdAt,
      isDemo: true,
    },
    {
      id: "demo-training",
      name: "Foundation model fine-tune",
      type: "Model Training",
      runtimeMinutes: 420,
      powerKw: 14,
      cpuCores: 32,
      gpuRequirement: "Required",
      memoryGb: 128,
      priority: "Normal",
      deadline: future(1_680),
      maxWaitMinutes: 720,
      maxLatencyMs: 220,
      flexibleScheduling: true,
      crossRegionAllowed: true,
      status: "Pending",
      createdAt,
      isDemo: true,
    },
    {
      id: "demo-batch",
      name: "Nightly event aggregation",
      type: "Batch Analytics",
      runtimeMinutes: 95,
      powerKw: 3.2,
      cpuCores: 12,
      gpuRequirement: "None",
      memoryGb: 32,
      priority: "Normal",
      deadline: future(480),
      maxWaitMinutes: 300,
      maxLatencyMs: 200,
      flexibleScheduling: true,
      crossRegionAllowed: false,
      status: "Pending",
      createdAt,
      isDemo: true,
    },
    {
      id: "demo-analytics",
      name: "Quarterly risk analytics",
      type: "Batch Analytics",
      runtimeMinutes: 65,
      powerKw: 7.5,
      cpuCores: 24,
      gpuRequirement: "Optional",
      memoryGb: 96,
      priority: "High",
      deadline: future(540),
      maxWaitMinutes: 180,
      maxLatencyMs: 150,
      flexibleScheduling: true,
      crossRegionAllowed: true,
      status: "Pending",
      createdAt,
      isDemo: true,
    },
    {
      id: "demo-processing",
      name: "Customer dataset normalization",
      type: "Data Processing",
      runtimeMinutes: 150,
      powerKw: 5,
      cpuCores: 20,
      gpuRequirement: "None",
      memoryGb: 64,
      priority: "Low",
      deadline: future(1_200),
      maxWaitMinutes: 600,
      maxLatencyMs: 190,
      flexibleScheduling: true,
      crossRegionAllowed: true,
      status: "Completed",
      createdAt,
      isDemo: true,
    },
  ];
}
