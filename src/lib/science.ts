import { ScienceExperiment, ScienceResult, ScienceSituation } from '../types';
import { celestialBodies } from '../data/bodies';
import { situationMultipliers, hasAtmosphere, hasWater, getAvailableSituations } from '../data/biomes';
import { scienceExperiments, getExperimentsForSituation } from '../data/experiments';

/**
 * Calculate science value for a specific experiment
 */
export function calculateScienceValue(
  experimentId: string,
  bodyId: string,
  situation: ScienceSituation,
  biome: string | null,
  alreadyCollected: number = 0
): { baseValue: number; transmitValue: number; recoveryValue: number } {
  const experiment = scienceExperiments.find((e) => e.id === experimentId);
  const body = celestialBodies[bodyId];
  const sitMult = situationMultipliers[bodyId];

  if (!experiment || !body || !sitMult) {
    return { baseValue: 0, transmitValue: 0, recoveryValue: 0 };
  }

  // Get situation multiplier
  let situationMult = 1;
  switch (situation) {
    case 'landed':
      situationMult = sitMult.landed;
      break;
    case 'splashed':
      situationMult = sitMult.splashed;
      break;
    case 'flying':
      situationMult = (sitMult.flyingLow + sitMult.flyingHigh) / 2; // Average
      break;
    case 'inSpaceLow':
      situationMult = sitMult.inSpaceLow;
      break;
    case 'inSpaceHigh':
      situationMult = sitMult.inSpaceHigh;
      break;
  }

  // Base science value
  const baseValue = experiment.baseValue * situationMult * body.scienceMultiplier;

  // Diminishing returns
  const maxScience = baseValue;
  const remainingScience = Math.max(0, maxScience - alreadyCollected);

  // For landed/splashed situations, biomes matter
  // This is simplified - actual KSP has more complex biome handling
  const effectiveValue = remainingScience;

  // Calculate transmit vs recovery values
  const transmitValue = effectiveValue * experiment.transmissionValue;
  const recoveryValue = effectiveValue;

  return {
    baseValue: effectiveValue,
    transmitValue,
    recoveryValue,
  };
}

/**
 * Get all possible science for a body
 */
export function getAllScienceForBody(
  bodyId: string
): { experiment: ScienceExperiment; situation: ScienceSituation; biome: string | null; value: number }[] {
  const body = celestialBodies[bodyId];
  if (!body) return [];

  const results: { experiment: ScienceExperiment; situation: ScienceSituation; biome: string | null; value: number }[] = [];
  const situations = getAvailableSituations(bodyId);
  const bodyHasAtmosphere = hasAtmosphere(bodyId);
  const bodyHasWater = hasWater(bodyId);

  for (const situation of situations) {
    const sit = situation as ScienceSituation;
    const experiments = getExperimentsForSituation(sit, bodyHasAtmosphere, bodyHasWater);

    for (const experiment of experiments) {
      // For surface situations, science is biome-specific
      if (sit === 'landed' || sit === 'splashed') {
        for (const biome of body.biomes) {
          const { baseValue } = calculateScienceValue(experiment.id, bodyId, sit, biome);
          results.push({ experiment, situation: sit, biome, value: baseValue });
        }
      } else {
        // Space and flying situations don't have biomes (or have global)
        const { baseValue } = calculateScienceValue(experiment.id, bodyId, sit, null);
        results.push({ experiment, situation: sit, biome: null, value: baseValue });
      }
    }
  }

  return results;
}

/**
 * Calculate total possible science for a body
 */
export function getTotalPossibleScience(bodyId: string): number {
  const allScience = getAllScienceForBody(bodyId);
  return allScience.reduce((sum, s) => sum + s.value, 0);
}

/**
 * Calculate remaining science (not yet collected)
 */
export function getRemainingScience(
  bodyId: string,
  collectedScience: ScienceResult[]
): number {
  const allScience = getAllScienceForBody(bodyId);

  let remaining = 0;

  for (const science of allScience) {
    const collected = collectedScience.find(
      (c) =>
        c.bodyId === bodyId &&
        c.experimentId === science.experiment.id &&
        c.situation === science.situation &&
        c.biome === (science.biome || '')
    );

    if (!collected) {
      remaining += science.value;
    } else if (!collected.collected) {
      remaining += science.value;
    }
  }

  return remaining;
}

/**
 * Get recommended experiments for a mission to a body
 */
export function getRecommendedExperiments(
  bodyId: string,
  collectedScience: ScienceResult[],
  limit: number = 10
): { experiment: ScienceExperiment; situation: ScienceSituation; biome: string | null; value: number }[] {
  const allScience = getAllScienceForBody(bodyId);

  // Filter out already collected science
  const uncollected = allScience.filter((science) => {
    const collected = collectedScience.find(
      (c) =>
        c.bodyId === bodyId &&
        c.experimentId === science.experiment.id &&
        c.situation === science.situation &&
        c.biome === (science.biome || '')
    );
    return !collected || !collected.collected;
  });

  // Sort by value (highest first)
  uncollected.sort((a, b) => b.value - a.value);

  return uncollected.slice(0, limit);
}

/**
 * Calculate science multiplier for transmitting vs recovering
 */
export function getTransmitMultiplier(experimentId: string): number {
  const experiment = scienceExperiments.find((e) => e.id === experimentId);
  return experiment?.transmissionValue || 0.5;
}

/**
 * Format science result for display
 */
export function formatScienceResult(result: ScienceResult): string {
  const experiment = scienceExperiments.find((e) => e.id === result.experimentId);
  const body = celestialBodies[result.bodyId];

  if (!experiment || !body) return 'Unknown experiment';

  let location = body.name;
  if (result.biome) {
    location += ` - ${result.biome}`;
  }

  const situationNames: Record<ScienceSituation, string> = {
    landed: 'Landed',
    splashed: 'Splashed',
    flying: 'Flying',
    inSpaceLow: 'In Space Low',
    inSpaceHigh: 'In Space High',
  };

  return `${experiment.name} while ${situationNames[result.situation]} at ${location}`;
}

/**
 * Group science results by body
 */
export function groupScienceByBody(
  results: ScienceResult[]
): Record<string, ScienceResult[]> {
  const grouped: Record<string, ScienceResult[]> = {};

  for (const result of results) {
    if (!grouped[result.bodyId]) {
      grouped[result.bodyId] = [];
    }
    grouped[result.bodyId].push(result);
  }

  return grouped;
}

/**
 * Calculate science efficiency (science per delta-v)
 */
export function calculateScienceEfficiency(
  bodyId: string,
  deltavRequired: number,
  collectedScience: ScienceResult[]
): number {
  const remaining = getRemainingScience(bodyId, collectedScience);
  if (deltavRequired <= 0) return Infinity;
  return remaining / deltavRequired;
}
