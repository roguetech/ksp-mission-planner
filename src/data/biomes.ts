import { celestialBodies } from './bodies';

// Science situation multipliers for each body type
export interface SituationMultipliers {
  landed: number;
  splashed: number;
  flyingLow: number;
  flyingHigh: number;
  inSpaceLow: number;
  inSpaceHigh: number;
}

// Science multipliers per body (stock KSP values)
export const situationMultipliers: Record<string, SituationMultipliers> = {
  kerbol: {
    landed: 0,
    splashed: 0,
    flyingLow: 11,
    flyingHigh: 2,
    inSpaceLow: 1,
    inSpaceHigh: 1,
  },
  moho: {
    landed: 10,
    splashed: 0,
    flyingLow: 0,
    flyingHigh: 0,
    inSpaceLow: 8,
    inSpaceHigh: 7,
  },
  eve: {
    landed: 8,
    splashed: 8,
    flyingLow: 6,
    flyingHigh: 6,
    inSpaceLow: 7,
    inSpaceHigh: 5,
  },
  gilly: {
    landed: 9,
    splashed: 0,
    flyingLow: 0,
    flyingHigh: 0,
    inSpaceLow: 8,
    inSpaceHigh: 6,
  },
  kerbin: {
    landed: 0.3,
    splashed: 0.4,
    flyingLow: 0.7,
    flyingHigh: 0.9,
    inSpaceLow: 1,
    inSpaceHigh: 1.5,
  },
  mun: {
    landed: 4,
    splashed: 0,
    flyingLow: 0,
    flyingHigh: 0,
    inSpaceLow: 3,
    inSpaceHigh: 2,
  },
  minmus: {
    landed: 5,
    splashed: 0,
    flyingLow: 0,
    flyingHigh: 0,
    inSpaceLow: 4,
    inSpaceHigh: 2.5,
  },
  duna: {
    landed: 8,
    splashed: 0,
    flyingLow: 5,
    flyingHigh: 5,
    inSpaceLow: 7,
    inSpaceHigh: 5,
  },
  ike: {
    landed: 8,
    splashed: 0,
    flyingLow: 0,
    flyingHigh: 0,
    inSpaceLow: 7,
    inSpaceHigh: 5,
  },
  dres: {
    landed: 8,
    splashed: 0,
    flyingLow: 0,
    flyingHigh: 0,
    inSpaceLow: 7,
    inSpaceHigh: 6,
  },
  jool: {
    landed: 0,
    splashed: 0,
    flyingLow: 12,
    flyingHigh: 9,
    inSpaceLow: 7,
    inSpaceHigh: 6,
  },
  laythe: {
    landed: 14,
    splashed: 12,
    flyingLow: 11,
    flyingHigh: 10,
    inSpaceLow: 9,
    inSpaceHigh: 8,
  },
  vall: {
    landed: 12,
    splashed: 0,
    flyingLow: 0,
    flyingHigh: 0,
    inSpaceLow: 9,
    inSpaceHigh: 8,
  },
  tylo: {
    landed: 12,
    splashed: 0,
    flyingLow: 0,
    flyingHigh: 0,
    inSpaceLow: 10,
    inSpaceHigh: 8,
  },
  bop: {
    landed: 12,
    splashed: 0,
    flyingLow: 0,
    flyingHigh: 0,
    inSpaceLow: 9,
    inSpaceHigh: 8,
  },
  pol: {
    landed: 12,
    splashed: 0,
    flyingLow: 0,
    flyingHigh: 0,
    inSpaceLow: 9,
    inSpaceHigh: 8,
  },
  eeloo: {
    landed: 15,
    splashed: 0,
    flyingLow: 0,
    flyingHigh: 0,
    inSpaceLow: 12,
    inSpaceHigh: 10,
  },
};

// Flying altitude thresholds (meters)
export const flyingThresholds: Record<string, { low: number; high: number }> = {
  kerbol: { low: 18000, high: 600000 },
  eve: { low: 22000, high: 90000 },
  kerbin: { low: 18000, high: 70000 },
  duna: { low: 12000, high: 50000 },
  jool: { low: 120000, high: 200000 },
  laythe: { low: 10000, high: 50000 },
};

// Space altitude thresholds (meters above surface)
export const spaceThresholds: Record<string, { low: number; high: number }> = {
  kerbol: { low: 1000000, high: 1000000000 },
  moho: { low: 80000, high: 5000000 },
  eve: { low: 90000, high: 400000 },
  gilly: { low: 6000, high: 30000 },
  kerbin: { low: 70000, high: 250000 },
  mun: { low: 60000, high: 2000000 },
  minmus: { low: 30000, high: 2000000 },
  duna: { low: 50000, high: 140000 },
  ike: { low: 50000, high: 900000 },
  dres: { low: 25000, high: 140000 },
  jool: { low: 200000, high: 4000000 },
  laythe: { low: 50000, high: 200000 },
  vall: { low: 90000, high: 300000 },
  tylo: { low: 250000, high: 4000000 },
  bop: { low: 25000, high: 300000 },
  pol: { low: 22000, high: 300000 },
  eeloo: { low: 60000, high: 3000000 },
};

// Helper to check if a body has water
export function hasWater(bodyId: string): boolean {
  const bodiesWithWater = ['kerbin', 'eve', 'laythe'];
  return bodiesWithWater.includes(bodyId);
}

// Helper to check if a body has an atmosphere
export function hasAtmosphere(bodyId: string): boolean {
  const body = celestialBodies[bodyId];
  return body?.physical.hasAtmosphere ?? false;
}

// Get available situations for a body
export function getAvailableSituations(bodyId: string): string[] {
  const situations: string[] = [];
  const body = celestialBodies[bodyId];

  if (!body) return situations;

  // All bodies have space situations
  situations.push('inSpaceHigh', 'inSpaceLow');

  // Bodies with atmospheres have flying situations
  if (body.physical.hasAtmosphere) {
    situations.push('flyingHigh', 'flyingLow');
  }

  // Check if landable (not a gas giant)
  if (body.id !== 'jool' && body.id !== 'kerbol') {
    situations.push('landed');
  }

  // Check for water
  if (hasWater(bodyId)) {
    situations.push('splashed');
  }

  return situations;
}

// Get biome-specific science multiplier (all biomes have 1.0 by default in stock)
export function getBiomeMultiplier(_bodyId: string, _biome: string): number {
  // In stock KSP, all biomes have the same multiplier
  // This can be extended for modded bodies
  return 1.0;
}
