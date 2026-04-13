import { ScienceExperiment, ScienceSituation } from '../types';

export const scienceExperiments: ScienceExperiment[] = [
  {
    id: 'crewReport',
    name: 'Crew Report',
    baseValue: 5,
    dataScale: 1,
    transmissionValue: 1.0,
    situations: ['landed', 'splashed', 'flying', 'inSpaceLow', 'inSpaceHigh'],
  },
  {
    id: 'evaReport',
    name: 'EVA Report',
    baseValue: 8,
    dataScale: 1,
    transmissionValue: 1.0,
    situations: ['landed', 'splashed', 'flying', 'inSpaceLow', 'inSpaceHigh'],
  },
  {
    id: 'surfaceSample',
    name: 'Surface Sample',
    baseValue: 30,
    dataScale: 1,
    transmissionValue: 0.25,
    situations: ['landed', 'splashed'],
  },
  {
    id: 'mysteryGoo',
    name: 'Mystery Goo Observation',
    baseValue: 10,
    dataScale: 1,
    transmissionValue: 0.3,
    situations: ['landed', 'splashed', 'flying', 'inSpaceLow', 'inSpaceHigh'],
  },
  {
    id: 'scienceJr',
    name: "Materials Study (Sci Jr.)",
    baseValue: 25,
    dataScale: 1,
    transmissionValue: 0.35,
    situations: ['landed', 'splashed', 'flying', 'inSpaceLow', 'inSpaceHigh'],
  },
  {
    id: 'temperatureScan',
    name: 'Temperature Scan',
    baseValue: 8,
    dataScale: 1,
    transmissionValue: 0.5,
    situations: ['landed', 'splashed', 'flying', 'inSpaceLow', 'inSpaceHigh'],
  },
  {
    id: 'barometerScan',
    name: 'Barometer Scan',
    baseValue: 12,
    dataScale: 1,
    transmissionValue: 0.5,
    situations: ['landed', 'splashed', 'flying', 'inSpaceLow', 'inSpaceHigh'],
    requiresAtmosphere: true,
  },
  {
    id: 'seismicScan',
    name: 'Seismic Scan',
    baseValue: 22,
    dataScale: 1,
    transmissionValue: 0.45,
    situations: ['landed', 'splashed'],
  },
  {
    id: 'gravityScan',
    name: 'Gravity Scan',
    baseValue: 20,
    dataScale: 1,
    transmissionValue: 0.4,
    situations: ['landed', 'splashed', 'flying', 'inSpaceLow', 'inSpaceHigh'],
  },
  {
    id: 'atmosphereAnalysis',
    name: 'Atmosphere Analysis',
    baseValue: 20,
    dataScale: 1,
    transmissionValue: 0.5,
    situations: ['flying', 'inSpaceLow'],
    requiresAtmosphere: true,
  },
  {
    id: 'infraredTelescope',
    name: 'Infrared Telescope',
    baseValue: 25,
    dataScale: 1,
    transmissionValue: 0.5,
    situations: ['inSpaceLow', 'inSpaceHigh'],
  },
];

// Calculate science value for a specific experiment/body/biome/situation
export function calculateScienceValue(
  experiment: ScienceExperiment,
  bodyMultiplier: number,
  situationMultiplier: number,
  biomeMultiplier: number = 1.0,
  alreadyCollected: number = 0
): { value: number; transmitValue: number } {
  const maxScience = experiment.baseValue * bodyMultiplier * situationMultiplier * biomeMultiplier;

  // Diminishing returns formula
  const remainingScience = maxScience - alreadyCollected;
  const value = Math.max(0, remainingScience * experiment.dataScale);
  const transmitValue = value * experiment.transmissionValue;

  return { value, transmitValue };
}

// Get experiments available for a given situation
export function getExperimentsForSituation(
  situation: ScienceSituation,
  hasAtmosphere: boolean,
  hasWater: boolean
): ScienceExperiment[] {
  return scienceExperiments.filter((exp) => {
    // Check if situation is valid
    // Map our situation types to experiment situation types
    let validSituation = false;
    if (situation === 'flying') {
      validSituation = exp.situations.includes('flying');
    } else {
      validSituation = exp.situations.includes(situation);
    }

    if (!validSituation) return false;

    // Check atmosphere requirement
    if (exp.requiresAtmosphere && !hasAtmosphere) return false;

    // Check water requirement
    if (exp.requiresWater && !hasWater) return false;

    // Splashed requires water
    if (situation === 'splashed' && !hasWater) return false;

    return true;
  });
}

// Get total possible science for a body
export function getTotalScienceForBody(
  bodyId: string,
  biomes: string[],
  situationMultipliers: Record<string, number>,
  hasAtmosphere: boolean,
  hasWater: boolean
): number {
  let total = 0;

  const situations: ScienceSituation[] = ['inSpaceLow', 'inSpaceHigh'];
  if (hasAtmosphere) {
    situations.push('flying');
  }
  situations.push('landed');
  if (hasWater) {
    situations.push('splashed');
  }

  for (const situation of situations) {
    const experiments = getExperimentsForSituation(situation, hasAtmosphere, hasWater);
    const sitMultiplier = situationMultipliers[situation] || 1;

    for (const exp of experiments) {
      // For landed/splashed, multiply by number of biomes
      if (situation === 'landed' || situation === 'splashed') {
        for (const _biome of biomes) {
          total += exp.baseValue * sitMultiplier;
        }
      } else {
        // Space/flying situations don't have biomes (or have fewer)
        total += exp.baseValue * sitMultiplier;
      }
    }
  }

  return total;
}

// Export experiment list for reference
export function getExperimentById(id: string): ScienceExperiment | undefined {
  return scienceExperiments.find((exp) => exp.id === id);
}

export function getAllExperiments(): ScienceExperiment[] {
  return [...scienceExperiments];
}
