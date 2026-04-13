import { Engine, FuelTank, Stage, RocketDesign, StageStats, RocketStats, Part } from '../types';
import { getPartById, engines, fuelTanks } from '../data/parts';
import { celestialBodies, G0 } from '../data/bodies';

/**
 * Tsiolkovsky rocket equation
 * Δv = Isp × g₀ × ln(m₀/m₁)
 */
export function tsiolkovsky(isp: number, wetMass: number, dryMass: number): number {
  if (dryMass <= 0 || wetMass <= dryMass) return 0;
  return isp * G0 * Math.log(wetMass / dryMass);
}

/**
 * Calculate effective Isp for multiple engines
 * Isp_eff = Σ(thrust_i) / Σ(thrust_i / Isp_i)
 */
export function effectiveIsp(
  engines: { thrust: number; isp: number }[]
): number {
  if (engines.length === 0) return 0;

  const totalThrust = engines.reduce((sum, e) => sum + e.thrust, 0);
  const weightedSum = engines.reduce((sum, e) => sum + e.thrust / e.isp, 0);

  if (weightedSum === 0) return 0;
  return totalThrust / weightedSum;
}

/**
 * Get total thrust from a list of engines
 */
export function getTotalThrust(
  engineIds: string[],
  inAtmosphere: boolean = false
): number {
  return engineIds.reduce((total, id) => {
    const engine = engines.find((e) => e.id === id);
    if (!engine) return total;
    return total + (inAtmosphere ? engine.thrustAtm : engine.thrustVac) * 1000; // Convert kN to N
  }, 0);
}

/**
 * Calculate stage dry mass (everything except fuel)
 */
export function calculateStageDryMass(stageParts: { partId: string; quantity: number }[]): number {
  return stageParts.reduce((total, { partId, quantity }) => {
    const part = getPartById(partId);
    if (!part) return total;

    if (part.category === 'fuelTank') {
      return total + (part as FuelTank).massEmpty * quantity;
    }
    return total + part.mass * quantity;
  }, 0);
}

/**
 * Calculate stage wet mass (including fuel)
 */
export function calculateStageWetMass(stageParts: { partId: string; quantity: number }[]): number {
  return stageParts.reduce((total, { partId, quantity }) => {
    const part = getPartById(partId);
    if (!part) return total;

    if (part.category === 'fuelTank') {
      return total + (part as FuelTank).massFull * quantity;
    }
    return total + part.mass * quantity;
  }, 0);
}

/**
 * Calculate fuel mass in a stage
 */
export function calculateStageFuelMass(stageParts: { partId: string; quantity: number }[]): number {
  return stageParts.reduce((total, { partId, quantity }) => {
    const part = getPartById(partId);
    if (!part || part.category !== 'fuelTank') return total;

    const tank = part as FuelTank;
    return total + (tank.massFull - tank.massEmpty) * quantity;
  }, 0);
}

/**
 * Get engines in a stage
 */
export function getStageEngines(
  stageParts: { partId: string; quantity: number }[]
): { engine: Engine; quantity: number }[] {
  const result: { engine: Engine; quantity: number }[] = [];

  for (const { partId, quantity } of stageParts) {
    const engine = engines.find((e) => e.id === partId);
    if (engine) {
      result.push({ engine, quantity });
    }
  }

  return result;
}

/**
 * Calculate stage statistics
 */
export function calculateStageStats(
  stageParts: { partId: string; quantity: number }[],
  payloadMass: number = 0,
  inAtmosphere: boolean = false
): StageStats {
  const dryMass = calculateStageDryMass(stageParts) + payloadMass;
  const fuelMass = calculateStageFuelMass(stageParts);
  const wetMass = dryMass + fuelMass;

  const stageEngines = getStageEngines(stageParts);

  if (stageEngines.length === 0) {
    return {
      dryMass,
      wetMass,
      deltaV: 0,
      twr: 0,
      thrustVac: 0,
      thrustAtm: 0,
      ispVac: 0,
      ispAtm: 0,
      burnTime: 0,
    };
  }

  // Calculate total thrust
  const thrustVac = stageEngines.reduce(
    (sum, { engine, quantity }) => sum + engine.thrustVac * quantity * 1000,
    0
  );
  const thrustAtm = stageEngines.reduce(
    (sum, { engine, quantity }) => sum + engine.thrustAtm * quantity * 1000,
    0
  );

  // Calculate effective Isp
  const engineDataVac = stageEngines.map(({ engine, quantity }) => ({
    thrust: engine.thrustVac * quantity,
    isp: engine.ispVac,
  }));
  const engineDataAtm = stageEngines.map(({ engine, quantity }) => ({
    thrust: engine.thrustAtm * quantity,
    isp: engine.ispAtm,
  }));

  const ispVac = effectiveIsp(engineDataVac);
  const ispAtm = effectiveIsp(engineDataAtm);

  // Use appropriate values based on environment
  const thrust = inAtmosphere ? thrustAtm : thrustVac;
  const isp = inAtmosphere ? ispAtm : ispVac;

  // Calculate delta-v
  const deltaV = tsiolkovsky(isp, wetMass, dryMass);

  // Calculate TWR on Kerbin
  const kerbinGravity = celestialBodies.kerbin.physical.surfaceGravity;
  const twr = thrust / (wetMass * kerbinGravity);

  // Calculate burn time
  // Burn time = (m0 - m1) / mass_flow_rate
  // mass_flow_rate = thrust / (Isp * g0)
  const massFlowRate = thrust / (isp * G0);
  const burnTime = massFlowRate > 0 ? fuelMass / massFlowRate : 0;

  return {
    dryMass,
    wetMass,
    deltaV,
    twr,
    thrustVac,
    thrustAtm,
    ispVac,
    ispAtm,
    burnTime,
  };
}

/**
 * Calculate full rocket statistics (all stages)
 */
export function calculateRocketStats(design: RocketDesign): RocketStats {
  const stageStats: StageStats[] = [];
  let totalDeltaV = 0;

  // Calculate from top stage (payload) to bottom stage (first to burn)
  // We need to calculate in reverse order because payload affects lower stages
  const reversedStages = [...design.stages].reverse();

  let payloadMass = 0;

  for (const stage of reversedStages) {
    const stats = calculateStageStats(stage.parts, payloadMass, false);
    stageStats.unshift(stats); // Add to beginning to maintain order
    totalDeltaV += stats.deltaV;
    payloadMass = stats.wetMass; // This stage becomes payload for the next
  }

  return {
    totalDeltaV,
    totalMass: stageStats.length > 0 ? stageStats[0].wetMass : 0,
    stages: stageStats,
  };
}

/**
 * Calculate TWR on a specific body
 */
export function calculateTWROnBody(
  thrust: number,
  mass: number,
  bodyId: string
): number {
  const body = celestialBodies[bodyId];
  if (!body) return 0;

  return thrust / (mass * body.physical.surfaceGravity);
}

/**
 * Check if a stage has sufficient TWR for launch from a body
 */
export function hasSufficientTWR(
  stage: Stage,
  bodyId: string,
  minTWR: number = 1.2
): boolean {
  const wetMass = calculateStageWetMass(stage.parts);
  const stageEngines = getStageEngines(stage.parts);

  const body = celestialBodies[bodyId];
  if (!body) return false;

  // Use atmospheric thrust if body has atmosphere
  const useAtm = body.physical.hasAtmosphere;
  const thrust = stageEngines.reduce(
    (sum, { engine, quantity }) =>
      sum + (useAtm ? engine.thrustAtm : engine.thrustVac) * quantity * 1000,
    0
  );

  const twr = thrust / (wetMass * body.physical.surfaceGravity);
  return twr >= minTWR;
}

/**
 * Suggest optimal staging based on delta-v requirements
 */
export function suggestStaging(
  availableParts: Part[],
  targetDeltaV: number,
  payloadMass: number
): Stage[] {
  // This is a simplified suggestion algorithm
  // A full implementation would use optimization techniques

  const stages: Stage[] = [];
  let remainingDeltaV = targetDeltaV;

  // For now, return empty - actual implementation would be complex
  // This is a placeholder for future optimization algorithms

  return stages;
}

/**
 * Calculate fuel units needed for a given delta-v
 */
export function fuelNeededForDeltaV(
  deltaV: number,
  isp: number,
  dryMass: number
): number {
  // From Tsiolkovsky equation:
  // Δv = Isp × g₀ × ln(m₀/m₁)
  // m₀ = m₁ × e^(Δv / (Isp × g₀))
  // fuel = m₀ - m₁

  const massRatio = Math.exp(deltaV / (isp * G0));
  const wetMass = dryMass * massRatio;
  return wetMass - dryMass;
}

/**
 * Calculate delta-v available from a given amount of fuel
 */
export function deltaVFromFuel(
  fuelMass: number,
  isp: number,
  dryMass: number
): number {
  const wetMass = dryMass + fuelMass;
  return tsiolkovsky(isp, wetMass, dryMass);
}
