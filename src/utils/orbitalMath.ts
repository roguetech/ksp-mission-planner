import { TrackedVessel } from '../types';

const DEG = Math.PI / 180;

// ─── Coordinate transform ─────────────────────────────────────────────────────

/**
 * Rotate a point from the perifocal (orbital) frame to the equatorial frame
 * using standard orbital-mechanics rotation matrices.
 *
 * i, raan, argPe are in DEGREES.
 */
export function perifocalToEquatorial(
  x: number,
  y: number,
  inc_deg: number,
  raan_deg: number,
  argPe_deg: number,
): [number, number] {
  const i = inc_deg * DEG;
  const O = raan_deg * DEG;
  const w = argPe_deg * DEG;

  const ci = Math.cos(i), si = Math.sin(i);
  const cO = Math.cos(O), sO = Math.sin(O);
  const cw = Math.cos(w), sw = Math.sin(w);

  const ex = cO * cw - sO * sw * ci;
  const ey = sO * cw + cO * sw * ci;
  const px = -cO * sw - sO * cw * ci;
  const py = -sO * sw + cO * cw * ci;

  return [x * ex + y * px, x * ey + y * py];
}

// ─── Orbit path generation ────────────────────────────────────────────────────

/** Returns N equatorial-frame [x, y] points tracing the full orbit ellipse. */
export function orbitPoints(
  a: number,
  e: number,
  inc: number,
  raan: number,
  argPe: number,
  N = 180,
): [number, number][] {
  const b = a * Math.sqrt(1 - e * e);
  const c = a * e; // focus offset from ellipse centre
  const pts: [number, number][] = [];

  for (let k = 0; k < N; k++) {
    const E = (2 * Math.PI * k) / N; // eccentric anomaly
    // Position from focus (body centre)
    const xp = a * Math.cos(E) - c;
    const yp = b * Math.sin(E);
    pts.push(perifocalToEquatorial(xp, yp, inc, raan, argPe));
  }
  return pts;
}

/** Current position in equatorial frame from true anomaly. */
export function vesselEquatorialPos(v: TrackedVessel): [number, number] {
  const { semiMajorAxis: a, eccentricity: e, inclination, longitudeOfAscendingNode, argumentOfPeriapsis, trueAnomaly } = v;
  const theta = trueAnomaly * DEG;
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
  const xp = r * Math.cos(theta);
  const yp = r * Math.sin(theta);
  return perifocalToEquatorial(xp, yp, inclination, longitudeOfAscendingNode, argumentOfPeriapsis);
}

// ─── Rendezvous calculations ──────────────────────────────────────────────────

export interface RendezvousResult {
  /** Degrees — positive = target is ahead of active */
  phaseAngleCurrent: number;
  /** Degrees — required phase angle at departure for a Hohmann transfer */
  phaseAngleRequired: number;
  /** Seconds until the next transfer window */
  timeToWindow: number;
  /** Seconds — one-way Hohmann transfer time (half-period of transfer orbit) */
  transferTime: number;
  /** m/s — prograde burn at departure */
  deltaV1: number;
  /** m/s — braking burn at arrival */
  deltaV2: number;
  /** m/s — total Hohmann ΔV */
  totalDeltaV: number;
  /** Degrees — absolute difference in inclinations */
  relativeInclination: number;
  /** m/s — estimated plane-change ΔV at mid-transfer */
  planeChangeDeltaV: number;
  /** Transfer orbit semi-major axis (m) */
  transferSMA: number;
  /** Transfer orbit eccentricity */
  transferEcc: number;
  /** True if active is below target (ascending transfer) */
  ascending: boolean;
}

export function calculateRendezvous(
  active: TrackedVessel,
  target: TrackedVessel,
  mu: number, // gravitational parameter of the body (m³/s²)
): RendezvousResult | null {
  const r1 = active.semiMajorAxis;
  const r2 = target.semiMajorAxis;

  if (!r1 || !r2 || !mu || r1 <= 0 || r2 <= 0) return null;

  const ascending = r1 <= r2;
  const rLow = Math.min(r1, r2);
  const rHigh = Math.max(r1, r2);

  // Transfer orbit
  const aT = (rLow + rHigh) / 2;
  const eT = (rHigh - rLow) / (rHigh + rLow);
  const transferTime = Math.PI * Math.sqrt(aT ** 3 / mu);

  // Angular velocities (rad/s)
  const n1 = Math.sqrt(mu / r1 ** 3);
  const n2 = Math.sqrt(mu / r2 ** 3);

  // Current phase angle: target anomaly − active anomaly, normalised to (−180, 180]
  let phase = (target.trueAnomaly - active.trueAnomaly + 360) % 360;
  if (phase > 180) phase -= 360;

  // Required phase at departure so target arrives at rendezvous point simultaneously.
  // Target must travel π − (n2 × transferTime) radians ahead of the arrival point.
  const phaseReq_rad = (ascending ? Math.PI : -Math.PI) - n2 * transferTime * (ascending ? 1 : -1);
  const phaseReq_deg = (phaseReq_rad * 180) / Math.PI;

  // Rate of change of phase angle (rad/s)
  const dPhase = n2 - n1; // positive if target is slower (higher orbit)

  // Time to window
  let timeToWindow = 0;
  if (Math.abs(dPhase) < 1e-12) {
    timeToWindow = Infinity;
  } else {
    let phaseDiff_rad = (phaseReq_deg - phase) * DEG;
    // Bring into (0, 2π] range (we want the NEXT window)
    const synodic = (2 * Math.PI) / Math.abs(dPhase);
    phaseDiff_rad = ((phaseDiff_rad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    if (phaseDiff_rad < 0.01) phaseDiff_rad += 2 * Math.PI; // avoid 0-window
    timeToWindow = phaseDiff_rad / Math.abs(dPhase);
    // Cap at one synodic period
    if (timeToWindow > synodic) timeToWindow -= synodic;
    if (timeToWindow < 0) timeToWindow += synodic;
  }

  // Hohmann ΔV
  const v1_circ = Math.sqrt(mu / r1);
  const v2_circ = Math.sqrt(mu / r2);
  const v1_transfer = Math.sqrt(mu * (2 / r1 - 1 / aT));
  const v2_transfer = Math.sqrt(mu * (2 / r2 - 1 / aT));

  const dv1 = Math.abs(v1_transfer - v1_circ);
  const dv2 = Math.abs(v2_circ - v2_transfer);

  // Relative inclination & plane-change estimate
  const relInc = Math.abs(target.inclination - active.inclination);
  const vHalf = Math.sqrt(mu / aT); // approximate speed at mid-transfer
  const planeChangeDV = 2 * vHalf * Math.sin((relInc * DEG) / 2);

  return {
    phaseAngleCurrent: phase,
    phaseAngleRequired: phaseReq_deg,
    timeToWindow,
    transferTime,
    deltaV1: dv1,
    deltaV2: dv2,
    totalDeltaV: dv1 + dv2,
    relativeInclination: relInc,
    planeChangeDeltaV: planeChangeDV,
    transferSMA: aT,
    transferEcc: eT,
    ascending,
  };
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────

export function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '∞';
  const abs = Math.abs(Math.round(seconds));
  const d = Math.floor(abs / 86400);
  const h = Math.floor((abs % 86400) / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
