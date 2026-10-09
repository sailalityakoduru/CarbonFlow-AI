import { carbonIntensityAt, REGIONS } from "./simulated-data";
import type {
  ConstraintResult,
  DashboardMetrics,
  Region,
  RecommendationAction,
  ScheduleCandidate,
  StrategyComparison,
  Workload,
  WorkloadSchedule,
} from "./types";

export function calculateEnergyKwh(workload: Workload): number {
  return workload.powerKw * (workload.runtimeMinutes / 60);
}

export function calculateEmissionsGrams(
  energyKwh: number,
  carbonIntensity: number,
): number {
  return energyKwh * carbonIntensity;
}

function compareCandidates(
  candidates: ScheduleCandidate[],
): ScheduleCandidate | null {
  if (candidates.length === 0) return null;

  const minEmissions = Math.min(...candidates.map((candidate) => candidate.emissionsGrams));
  const closeOptions = candidates
    .filter(
      (candidate) =>
        candidate.emissionsGrams <= minEmissions + Math.max(minEmissions * 0.01, 0.001),
    )
    .sort(
      (a, b) =>
        a.waitMinutes - b.waitMinutes ||
        a.costDollars - b.costDollars ||
        a.emissionsGrams - b.emissionsGrams,
    );

  return closeOptions[0] ?? null;
}

function candidateConstraints(
  workload: Workload,
  region: Region,
  executionAt: Date,
  completionAt: Date,
  waitMinutes: number,
  now: Date,
): ConstraintResult[] {
  const deadline = new Date(workload.deadline);
  const constraints: ConstraintResult[] = [
    {
      label: "CPU capacity",
      passed: region.cpuAvailable >= workload.cpuCores,
      detail: `${region.cpuAvailable} available · ${workload.cpuCores} required`,
    },
    {
      label: "GPU requirement",
      passed:
        workload.gpuRequirement !== "Required" || region.gpuAvailable > 0,
      detail:
        workload.gpuRequirement === "Required"
          ? `${region.gpuAvailable} GPUs available`
          : `${workload.gpuRequirement} · ${region.gpuAvailable} GPUs available`,
    },
    {
      label: "Memory capacity",
      passed: region.memoryAvailableGb >= workload.memoryGb,
      detail: `${region.memoryAvailableGb} GB available · ${workload.memoryGb} GB required`,
    },
    {
      label: "Latency",
      passed: region.networkLatencyMs <= workload.maxLatencyMs,
      detail: `${region.networkLatencyMs} ms · ${workload.maxLatencyMs} ms maximum`,
    },
    {
      label: "Maximum waiting time",
      passed:
        (workload.flexibleScheduling || waitMinutes === 0) &&
        waitMinutes <= workload.maxWaitMinutes,
      detail: `${Math.round(waitMinutes)} min wait · ${workload.maxWaitMinutes} min maximum`,
    },
    {
      label: "Flexible scheduling",
      passed: workload.flexibleScheduling || waitMinutes === 0,
      detail: workload.flexibleScheduling
        ? "Workload may wait"
        : "Must run immediately",
    },
    {
      label: "Cross-region execution",
      passed: workload.crossRegionAllowed || region.isDefault,
      detail: workload.crossRegionAllowed
        ? "Other regions permitted"
        : "Restricted to the default region",
    },
    {
      label: "Deadline",
      passed: completionAt.getTime() <= deadline.getTime(),
      detail: `Completes ${completionAt.toLocaleString()} · due ${deadline.toLocaleString()}`,
    },
    {
      label: "Execution time",
      passed: executionAt.getTime() >= now.getTime(),
      detail: "Execution is not scheduled in the past",
    },
  ];

  return constraints;
}

function explainCandidate(
  workload: Workload,
  candidate: Omit<ScheduleCandidate, "reasons">,
  defaultRegion: Region,
): string[] {
  const reasons: string[] = [];
  if (candidate.waitMinutes === 0) {
    reasons.push("The workload can start immediately.");
  } else {
    reasons.push(
      `Waiting ${Math.round(candidate.waitMinutes)} minutes stays within the ${workload.maxWaitMinutes}-minute limit.`,
    );
    reasons.push(
      `The selected hour has a lower simulated carbon intensity of ${candidate.carbonIntensity} gCO₂e/kWh.`,
    );
  }
  if (candidate.regionId !== defaultRegion.id) {
    reasons.push(
      `${candidate.regionName} is eligible and has lower estimated emissions than the default region at that time.`,
    );
  }
  if (candidate.deadlineCompliant) {
    reasons.push("The estimated completion time meets the deadline.");
  }
  reasons.push(
    `Energy is estimated at ${candidate.energyKwh.toFixed(2)} kWh, producing ${candidate.emissionsGrams.toFixed(1)} gCO₂e.`,
  );
  reasons.push(
    "Capacity is simulated independently per workload; jobs do not reserve resources from one another.",
  );
  return reasons;
}

function buildCandidate(
  workload: Workload,
  region: Region,
  slotIndex: number,
  now: Date,
  defaultRegion: Region,
): ScheduleCandidate {
  const executionAt = new Date(now.getTime() + slotIndex * 60 * 60 * 1000);
  const completionAt = new Date(
    executionAt.getTime() + workload.runtimeMinutes * 60_000,
  );
  const waitMinutes = slotIndex * 60;
  const carbonIntensity = carbonIntensityAt(region, slotIndex);
  const energyKwh = calculateEnergyKwh(workload);
  const emissionsGrams = calculateEmissionsGrams(
    energyKwh,
    carbonIntensity,
  );
  const costDollars = energyKwh * region.costPerKwh;
  const constraints = candidateConstraints(
    workload,
    region,
    executionAt,
    completionAt,
    waitMinutes,
    now,
  );
  const deadlineCompliant =
    completionAt.getTime() <= new Date(workload.deadline).getTime();
  const candidate = {
    workloadId: workload.id,
    regionId: region.id,
    regionName: region.name,
    slotIndex,
    executionAt: executionAt.toISOString(),
    completionAt: completionAt.toISOString(),
    waitMinutes,
    carbonIntensity,
    energyKwh,
    emissionsGrams,
    costDollars,
    deadlineCompliant,
    constraints,
  };

  return {
    ...candidate,
    reasons: explainCandidate(workload, candidate, defaultRegion),
  };
}

export function scheduleWorkload(
  workload: Workload,
  regions: Region[] = REGIONS,
  now = new Date(),
): WorkloadSchedule {
  const defaultRegion = regions.find((region) => region.isDefault) ?? regions[0];
  if (!defaultRegion) {
    return {
      workloadId: workload.id,
      action: "NO FEASIBLE SCHEDULE",
      selected: null,
      baseline: null,
      candidates: [],
      reasons: ["No simulated regions are configured."],
      blockingConstraints: ["No regions available"],
    };
  }

  const eligibleRegions = workload.crossRegionAllowed
    ? regions
    : [defaultRegion];
  const slotIndexes = workload.flexibleScheduling
    ? Array.from({ length: 24 }, (_, index) => index)
    : [0];
  const candidates = eligibleRegions.flatMap((region) =>
    slotIndexes.map((slotIndex) =>
      buildCandidate(workload, region, slotIndex, now, defaultRegion),
    ),
  );
  const feasibleCandidates = candidates.filter((candidate) =>
    candidate.constraints.every((constraint) => constraint.passed),
  );
  const selected = compareCandidates(feasibleCandidates);
  const baseline = feasibleCandidates
    .filter((candidate) => candidate.regionId === defaultRegion.id)
    .sort(
      (a, b) =>
        a.waitMinutes - b.waitMinutes ||
        a.emissionsGrams - b.emissionsGrams,
    )[0] ?? null;

  if (!selected) {
    const failedCounts = new Map<string, number>();
    for (const candidate of candidates) {
      for (const constraint of candidate.constraints) {
        if (!constraint.passed) {
          failedCounts.set(
            constraint.label,
            (failedCounts.get(constraint.label) ?? 0) + 1,
          );
        }
      }
    }
    const blockingConstraints = [...failedCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label]) => label);
    const reasons =
      candidates.length === 0
        ? ["No eligible region or execution window was available."]
        : [
            `No candidate met all mandatory constraints${blockingConstraints.length ? `; the main blockers were ${blockingConstraints.join(", ")}.` : "."}`,
          ];
    return {
      workloadId: workload.id,
      action: "NO FEASIBLE SCHEDULE",
      selected: null,
      baseline,
      candidates,
      reasons,
      blockingConstraints,
    };
  }

  let action: RecommendationAction;
  if (selected.waitMinutes > 0) {
    action = "DELAY TO A CLEANER TIME";
  } else if (selected.regionId !== defaultRegion.id) {
    action = "SHIFT TO ANOTHER REGION";
  } else {
    action = "RUN NOW";
  }

  const reasons = [...selected.reasons];
  if (action === "DELAY TO A CLEANER TIME") {
    reasons.unshift(
      "Delay is permitted by this workload's flexibility, maximum-wait, and deadline constraints.",
    );
  } else if (action === "SHIFT TO ANOTHER REGION") {
    reasons.unshift(
      "The default region is not the lowest-emission eligible option for an immediate run.",
    );
  } else {
    reasons.unshift(
      "Running now is the lowest-emission feasible option within the 1% tie-break range.",
    );
  }

  return {
    workloadId: workload.id,
    action,
    selected,
    baseline,
    candidates,
    reasons,
    blockingConstraints: [],
  };
}

export function compareWorkloads(
  workloads: Workload[],
  now = new Date(),
): StrategyComparison {
  const schedules = workloads.map((workload) =>
    scheduleWorkload(workload, REGIONS, now),
  );
  const baselineSchedules = schedules.map((schedule) => ({
    ...schedule,
    selected: schedule.baseline,
  }));
  const optimizedSchedules = schedules;
  const sumEmissions = (items: WorkloadSchedule[]) =>
    items.reduce(
      (sum, schedule) => sum + (schedule.selected?.emissionsGrams ?? 0),
      0,
    );
  const sumDelay = (items: WorkloadSchedule[]) =>
    items.reduce(
      (sum, schedule) => sum + (schedule.selected?.waitMinutes ?? 0),
      0,
    );
  const compliance = (items: WorkloadSchedule[]) => {
    if (workloads.length === 0) return 0;
    const metDeadlines = items.filter(
      (schedule) => schedule.selected?.deadlineCompliant,
    ).length;
    return (metDeadlines / workloads.length) * 100;
  };
  const regionCounts = (items: WorkloadSchedule[]) =>
    items.reduce<Record<string, number>>((counts, schedule) => {
      if (schedule.selected) {
        counts[schedule.selected.regionName] =
          (counts[schedule.selected.regionName] ?? 0) + 1;
      }
      return counts;
    }, {});
  const baselineEmissionsGrams = sumEmissions(baselineSchedules);
  const optimizedEmissionsGrams = sumEmissions(optimizedSchedules);
  const energyKwh = workloads.reduce(
    (total, workload) => total + calculateEnergyKwh(workload),
    0,
  );

  return {
    baselineEmissionsGrams,
    optimizedEmissionsGrams,
    emissionsAvoidedGrams: baselineEmissionsGrams - optimizedEmissionsGrams,
    reductionPercent:
      baselineEmissionsGrams > 0
        ? ((baselineEmissionsGrams - optimizedEmissionsGrams) /
            baselineEmissionsGrams) *
          100
        : null,
    energyKwh,
    baselineDelayMinutes: sumDelay(baselineSchedules),
    optimizedDelayMinutes: sumDelay(optimizedSchedules),
    baselineDeadlineCompliance: compliance(baselineSchedules),
    optimizedDeadlineCompliance: compliance(optimizedSchedules),
    baselineRegionCounts: regionCounts(baselineSchedules),
    optimizedRegionCounts: regionCounts(optimizedSchedules),
    baselineSchedules,
    optimizedSchedules,
  };
}

export function calculateDashboardMetrics(
  workloads: Workload[],
  now = new Date(),
): DashboardMetrics {
  const comparison = compareWorkloads(workloads, now);
  const estimatedEmissionsGrams = comparison.optimizedEmissionsGrams;
  const successfulSchedules = comparison.optimizedSchedules
    .map((schedule) => schedule.selected)
    .filter((candidate): candidate is ScheduleCandidate => candidate !== null);
  const averageCarbonIntensity =
    successfulSchedules.length > 0
      ? successfulSchedules.reduce(
          (sum, candidate) => sum + candidate.carbonIntensity,
          0,
        ) / successfulSchedules.length
      : 0;

  return {
    totalWorkloads: workloads.length,
    running: workloads.filter((workload) => workload.status === "Running")
      .length,
    completed: workloads.filter((workload) => workload.status === "Completed")
      .length,
    pending: workloads.filter((workload) => workload.status === "Pending")
      .length,
    totalEnergyKwh: comparison.energyKwh,
    estimatedEmissionsGrams,
    emissionsAvoidedGrams: comparison.emissionsAvoidedGrams,
    deadlineCompliancePercent: comparison.optimizedDeadlineCompliance,
    averageCarbonIntensity,
  };
}
