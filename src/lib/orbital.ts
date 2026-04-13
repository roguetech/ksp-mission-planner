import { CelestialBody } from '../types';
import { celestialBodies, G0 } from '../data/bodies';

// Orbital mechanics calculations

/**
 * Calculate orbital velocity at a given altitude
 * v = sqrt(μ/r)
 */
export function orbitalVelocity(mu: number, radius: number): number {
  return Math.sqrt(mu / radius);
}

/**
 * Calculate orbital period
 * T = 2π * sqrt(a³/μ)
 */
export function orbitalPeriod(semiMajorAxis: number, mu: number): number {
  return 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / mu);
}

/**
 * Calculate semi-major axis from period
 * a = (μ * T² / 4π²)^(1/3)
 */
export function semiMajorAxisFromPeriod(period: number, mu: number): number {
  return Math.pow((mu * Math.pow(period, 2)) / (4 * Math.pow(Math.PI, 2)), 1 / 3);
}

/**
 * Calculate escape velocity
 * v_esc = sqrt(2μ/r)
 */
export function escapeVelocity(mu: number, radius: number): number {
  return Math.sqrt((2 * mu) / radius);
}

/**
 * Calculate sphere of influence radius
 * r_SOI = a * (m/M)^(2/5)
 */
export function sphereOfInfluence(
  semiMajorAxis: number,
  bodyMass: number,
  parentMass: number
): number {
  return semiMajorAxis * Math.pow(bodyMass / parentMass, 0.4);
}

/**
 * Calculate vis-viva equation for velocity at a point in an orbit
 * v = sqrt(μ * (2/r - 1/a))
 */
export function visViva(mu: number, radius: number, semiMajorAxis: number): number {
  return Math.sqrt(mu * (2 / radius - 1 / semiMajorAxis));
}

/**
 * Calculate Hohmann transfer delta-v
 */
export function hohmannTransfer(
  mu: number,
  r1: number,
  r2: number
): { deltaV1: number; deltaV2: number; totalDeltaV: number; transferTime: number } {
  // Transfer orbit semi-major axis
  const a_transfer = (r1 + r2) / 2;

  // Velocity at departure orbit
  const v1 = orbitalVelocity(mu, r1);

  // Velocity at departure point of transfer orbit
  const v_transfer1 = visViva(mu, r1, a_transfer);

  // First burn (departure)
  const deltaV1 = Math.abs(v_transfer1 - v1);

  // Velocity at arrival orbit
  const v2 = orbitalVelocity(mu, r2);

  // Velocity at arrival point of transfer orbit
  const v_transfer2 = visViva(mu, r2, a_transfer);

  // Second burn (arrival/circularization)
  const deltaV2 = Math.abs(v2 - v_transfer2);

  // Total delta-v
  const totalDeltaV = deltaV1 + deltaV2;

  // Transfer time (half the transfer orbit period)
  const transferTime = orbitalPeriod(a_transfer, mu) / 2;

  return { deltaV1, deltaV2, totalDeltaV, transferTime };
}

/**
 * Calculate synodic period between two bodies
 * 1/P_syn = |1/P1 - 1/P2|
 */
export function synodicPeriod(period1: number, period2: number): number {
  return Math.abs(1 / (1 / period1 - 1 / period2));
}

/**
 * Calculate phase angle for Hohmann transfer
 * θ = 180° * (1 - (1/(2 * sqrt(2))) * sqrt((r1/r2 + 1)³))
 * Simplified: θ = 180° - 180° * (a_transfer/r2)^1.5
 */
export function phaseAngle(r1: number, r2: number): number {
  const a_transfer = (r1 + r2) / 2;
  const angle = 180 - 180 * Math.pow(a_transfer / r2, 1.5);
  // Normalize to 0-360
  return ((angle % 360) + 360) % 360;
}

/**
 * Calculate ejection angle for interplanetary transfer
 * Based on the velocity excess (hyperbolic excess velocity)
 */
export function ejectionAngle(
  mu: number,
  parkingOrbitRadius: number,
  excessVelocity: number
): number {
  const v_orbit = orbitalVelocity(mu, parkingOrbitRadius);
  const v_escape = escapeVelocity(mu, parkingOrbitRadius);

  // Velocity at periapsis of escape hyperbola
  const v_periapsis = Math.sqrt(excessVelocity * excessVelocity + v_escape * v_escape);

  // Ejection angle (from prograde)
  const angle = Math.acos(v_orbit / v_periapsis) * (180 / Math.PI);

  return 180 - angle;
}

/**
 * Calculate delta-v for ejection burn
 */
export function ejectionDeltaV(
  mu: number,
  parkingOrbitRadius: number,
  excessVelocity: number
): number {
  const v_orbit = orbitalVelocity(mu, parkingOrbitRadius);
  const v_escape = escapeVelocity(mu, parkingOrbitRadius);

  // Velocity at periapsis of escape hyperbola
  const v_periapsis = Math.sqrt(excessVelocity * excessVelocity + v_escape * v_escape);

  return v_periapsis - v_orbit;
}

/**
 * Calculate delta-v for capture burn
 */
export function captureDeltaV(
  mu: number,
  captureOrbitRadius: number,
  approachVelocity: number
): number {
  const v_orbit = orbitalVelocity(mu, captureOrbitRadius);
  const v_escape = escapeVelocity(mu, captureOrbitRadius);

  // Velocity at periapsis of approach hyperbola
  const v_periapsis = Math.sqrt(approachVelocity * approachVelocity + v_escape * v_escape);

  return v_periapsis - v_orbit;
}

/**
 * Get orbital altitude from surface altitude
 */
export function orbitalAltitude(surfaceAltitude: number, bodyRadius: number): number {
  return surfaceAltitude + bodyRadius;
}

/**
 * Calculate TWR (Thrust to Weight Ratio) on a body
 */
export function calculateTWR(thrust: number, mass: number, surfaceGravity: number): number {
  const weight = mass * surfaceGravity;
  return thrust / weight;
}

/**
 * Calculate required thrust for a minimum TWR
 */
export function requiredThrust(mass: number, surfaceGravity: number, minTWR: number): number {
  return mass * surfaceGravity * minTWR;
}

/**
 * Get body by ID
 */
export function getBody(bodyId: string): CelestialBody | undefined {
  return celestialBodies[bodyId];
}

/**
 * Calculate mean motion (angular velocity)
 * n = sqrt(μ/a³)
 */
export function meanMotion(mu: number, semiMajorAxis: number): number {
  return Math.sqrt(mu / Math.pow(semiMajorAxis, 3));
}

/**
 * Calculate mean anomaly at a given time
 * M = M0 + n * t
 */
export function meanAnomaly(
  meanAnomalyAtEpoch: number,
  meanMotion: number,
  time: number
): number {
  return (meanAnomalyAtEpoch + meanMotion * time) % (2 * Math.PI);
}

/**
 * Solve Kepler's equation for eccentric anomaly
 * M = E - e * sin(E)
 * Uses Newton-Raphson iteration
 */
export function eccentricAnomaly(
  meanAnomaly: number,
  eccentricity: number,
  tolerance: number = 1e-8
): number {
  let E = meanAnomaly; // Initial guess

  for (let i = 0; i < 100; i++) {
    const dE = (E - eccentricity * Math.sin(E) - meanAnomaly) / (1 - eccentricity * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < tolerance) break;
  }

  return E;
}

/**
 * Calculate true anomaly from eccentric anomaly
 */
export function trueAnomaly(eccentricAnomaly: number, eccentricity: number): number {
  return (
    2 *
    Math.atan2(
      Math.sqrt(1 + eccentricity) * Math.sin(eccentricAnomaly / 2),
      Math.sqrt(1 - eccentricity) * Math.cos(eccentricAnomaly / 2)
    )
  );
}

/**
 * Calculate orbital radius at a given true anomaly
 * r = a * (1 - e²) / (1 + e * cos(ν))
 */
export function orbitalRadius(
  semiMajorAxis: number,
  eccentricity: number,
  trueAnomaly: number
): number {
  return (
    (semiMajorAxis * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(trueAnomaly))
  );
}

/**
 * Standard gravity constant
 */
export { G0 };
