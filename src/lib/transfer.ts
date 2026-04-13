import { TransferWindow, PorkchopData } from '../types';
import { celestialBodies, KERBIN_DAY, KERBIN_YEAR } from '../data/bodies';
import {
  hohmannTransfer,
  synodicPeriod,
  phaseAngle,
  ejectionDeltaV,
  captureDeltaV,
  orbitalVelocity,
  meanMotion,
  meanAnomaly,
  eccentricAnomaly,
  trueAnomaly,
} from './orbital';

/**
 * Calculate the angular position of a body at a given time
 */
export function bodyPosition(bodyId: string, time: number): number {
  const body = celestialBodies[bodyId];
  if (!body) return 0;

  const n = meanMotion(
    celestialBodies[body.parent || 'kerbol'].physical.gravitationalParameter,
    body.orbital.semiMajorAxis
  );
  const M = meanAnomaly(body.orbital.meanAnomalyAtEpoch * (Math.PI / 180), n, time);
  const E = eccentricAnomaly(M, body.orbital.eccentricity);
  const nu = trueAnomaly(E, body.orbital.eccentricity);

  return nu * (180 / Math.PI);
}

/**
 * Calculate the phase angle between two bodies at a given time
 */
export function currentPhaseAngle(originId: string, destinationId: string, time: number): number {
  const originAngle = bodyPosition(originId, time);
  const destAngle = bodyPosition(destinationId, time);

  let phase = destAngle - originAngle;
  // Normalize to -180 to 180
  while (phase > 180) phase -= 360;
  while (phase < -180) phase += 360;

  return phase;
}

/**
 * Calculate transfer window between two planets
 */
export function calculateTransferWindow(
  originId: string,
  destinationId: string,
  departureTime: number
): TransferWindow | null {
  const origin = celestialBodies[originId];
  const destination = celestialBodies[destinationId];

  if (!origin || !destination) return null;

  // Both must orbit the same parent (usually Kerbol)
  if (origin.parent !== destination.parent) return null;

  const parentId = origin.parent || 'kerbol';
  const parent = celestialBodies[parentId];
  if (!parent) return null;

  const mu = parent.physical.gravitationalParameter;

  // Calculate Hohmann transfer parameters
  const r1 = origin.orbital.semiMajorAxis;
  const r2 = destination.orbital.semiMajorAxis;

  const hohmann = hohmannTransfer(mu, r1, r2);

  // Calculate excess velocity (v_infinity) at departure
  const vOrbitOrigin = orbitalVelocity(mu, r1);
  const transferSMA = (r1 + r2) / 2;
  const vTransferDeparture = orbitalVelocity(mu, r1) * Math.sqrt(2 * r2 / (r1 + r2));
  const excessVelocityDeparture = Math.abs(vTransferDeparture - vOrbitOrigin);

  // Calculate ejection delta-v from low orbit
  const parkingOrbitAltitude = 80000; // 80km for Kerbin
  const parkingOrbitRadius = origin.physical.radius + parkingOrbitAltitude;
  const departureDeltaV = ejectionDeltaV(
    origin.physical.gravitationalParameter,
    parkingOrbitRadius,
    excessVelocityDeparture
  );

  // Calculate arrival excess velocity
  const vOrbitDest = orbitalVelocity(mu, r2);
  const vTransferArrival = orbitalVelocity(mu, r2) * Math.sqrt(2 * r1 / (r1 + r2));
  const excessVelocityArrival = Math.abs(vTransferArrival - vOrbitDest);

  // Calculate capture delta-v
  const captureOrbitAltitude = destination.physical.hasAtmosphere
    ? destination.physical.atmosphereHeight! + 10000
    : Math.min(50000, destination.physical.radius * 0.1);
  const captureOrbitRadius = destination.physical.radius + captureOrbitAltitude;
  const arrivalDeltaV = captureDeltaV(
    destination.physical.gravitationalParameter,
    captureOrbitRadius,
    excessVelocityArrival
  );

  // Calculate phase angle
  const idealPhaseAngle = phaseAngle(r1, r2);

  // Calculate ejection angle
  const ejectionAngle = 90; // Simplified - actual calculation is more complex

  return {
    departureTime: departureTime / KERBIN_DAY,
    arrivalTime: (departureTime + hohmann.transferTime) / KERBIN_DAY,
    flightTime: hohmann.transferTime / KERBIN_DAY,
    departureDeltaV,
    arrivalDeltaV,
    totalDeltaV: departureDeltaV + arrivalDeltaV,
    phaseAngle: idealPhaseAngle,
    ejectionAngle,
  };
}

/**
 * Find optimal transfer windows within a time range
 */
export function findTransferWindows(
  originId: string,
  destinationId: string,
  startTime: number,
  endTime: number,
  resolution: number = KERBIN_DAY
): TransferWindow[] {
  const origin = celestialBodies[originId];
  const destination = celestialBodies[destinationId];

  if (!origin || !destination) return [];

  const windows: TransferWindow[] = [];
  const idealPhase = phaseAngle(origin.orbital.semiMajorAxis, destination.orbital.semiMajorAxis);

  let lastPhase = currentPhaseAngle(originId, destinationId, startTime);

  for (let t = startTime + resolution; t <= endTime; t += resolution) {
    const phase = currentPhaseAngle(originId, destinationId, t);

    // Check if we crossed the ideal phase angle
    const crossedIdeal =
      (lastPhase < idealPhase && phase >= idealPhase) ||
      (lastPhase > idealPhase && phase <= idealPhase) ||
      (lastPhase > 0 && phase < 0 && idealPhase < 0) ||
      (lastPhase < 0 && phase > 0 && idealPhase > 0);

    if (crossedIdeal || Math.abs(phase - idealPhase) < 5) {
      const window = calculateTransferWindow(originId, destinationId, t);
      if (window) {
        // Check if this window is significantly different from the last one
        const lastWindow = windows[windows.length - 1];
        if (!lastWindow || Math.abs(window.departureTime - lastWindow.departureTime) > 10) {
          windows.push(window);
        }
      }
    }

    lastPhase = phase;
  }

  return windows;
}

/**
 * Calculate synodic period between two bodies
 */
export function calculateSynodicPeriod(originId: string, destinationId: string): number {
  const origin = celestialBodies[originId];
  const destination = celestialBodies[destinationId];

  if (!origin || !destination) return 0;

  return synodicPeriod(origin.orbital.orbitalPeriod, destination.orbital.orbitalPeriod);
}

/**
 * Generate porkchop plot data
 */
export function generatePorkchopData(
  originId: string,
  destinationId: string,
  departureDays: number,
  durationDays: number,
  resolution: number = 5
): PorkchopData {
  const origin = celestialBodies[originId];
  const destination = celestialBodies[destinationId];

  const data: number[][] = [];
  const windows: TransferWindow[] = [];

  if (!origin || !destination) {
    return {
      origin: originId,
      destination: destinationId,
      departureRange: [0, departureDays],
      arrivalRange: [0, durationDays],
      data,
      windows,
    };
  }

  const parentId = origin.parent || 'kerbol';
  const parent = celestialBodies[parentId];
  if (!parent) {
    return {
      origin: originId,
      destination: destinationId,
      departureRange: [0, departureDays],
      arrivalRange: [0, durationDays],
      data,
      windows,
    };
  }

  const mu = parent.physical.gravitationalParameter;
  const r1 = origin.orbital.semiMajorAxis;
  const r2 = destination.orbital.semiMajorAxis;

  let minDeltaV = Infinity;
  let bestWindow: TransferWindow | null = null;

  // Generate grid
  for (let dep = 0; dep <= departureDays; dep += resolution) {
    const row: number[] = [];

    for (let dur = resolution; dur <= durationDays; dur += resolution) {
      // Calculate delta-v for this departure/duration combination
      // This is a simplified model - actual porkchop plots use Lambert solvers

      const departureTime = dep * KERBIN_DAY;
      const flightTime = dur * KERBIN_DAY;

      // Phase angle at departure
      const phase = currentPhaseAngle(originId, destinationId, departureTime);

      // Ideal phase angle for Hohmann transfer
      const idealPhase = phaseAngle(r1, r2);

      // Phase angle error
      const phaseError = Math.abs(phase - idealPhase);

      // Base Hohmann delta-v
      const hohmann = hohmannTransfer(mu, r1, r2);

      // Add penalty for non-ideal phase angle and flight time
      // This is a simplification - real porkchop plots solve Lambert's problem
      const idealFlightTime = hohmann.transferTime / KERBIN_DAY;
      const timeError = Math.abs(dur - idealFlightTime) / idealFlightTime;

      const phasePenalty = phaseError * 10; // m/s per degree
      const timePenalty = timeError * hohmann.totalDeltaV;

      const totalDeltaV = hohmann.totalDeltaV + phasePenalty + timePenalty;

      row.push(totalDeltaV);

      // Track best window
      if (totalDeltaV < minDeltaV) {
        minDeltaV = totalDeltaV;
        bestWindow = {
          departureTime: dep,
          arrivalTime: dep + dur,
          flightTime: dur,
          departureDeltaV: hohmann.deltaV1 + phasePenalty / 2,
          arrivalDeltaV: hohmann.deltaV2 + timePenalty / 2,
          totalDeltaV,
          phaseAngle: phase,
          ejectionAngle: 90,
        };
      }
    }

    data.push(row);
  }

  if (bestWindow) {
    windows.push(bestWindow);
  }

  return {
    origin: originId,
    destination: destinationId,
    departureRange: [0, departureDays],
    arrivalRange: [resolution, durationDays],
    data,
    windows,
  };
}

/**
 * Format time in Kerbin days
 */
export function formatKerbinTime(days: number): string {
  const years = Math.floor(days / 426);
  const remainingDays = days % 426;

  if (years > 0) {
    return `Year ${years + 1}, Day ${Math.floor(remainingDays) + 1}`;
  }
  return `Day ${Math.floor(days) + 1}`;
}

/**
 * Get next transfer window
 */
export function getNextTransferWindow(
  originId: string,
  destinationId: string,
  currentTime: number = 0
): TransferWindow | null {
  const windows = findTransferWindows(
    originId,
    destinationId,
    currentTime,
    currentTime + calculateSynodicPeriod(originId, destinationId) * 2,
    KERBIN_DAY
  );

  return windows.length > 0 ? windows[0] : null;
}
