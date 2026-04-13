import { DeltaVConnection } from '../types';

// Delta-V requirements between locations (in m/s)
// Based on stock KSP delta-v map
// These are approximate values for Hohmann transfers

export const deltaVConnections: DeltaVConnection[] = [
  // Kerbin surface to orbit
  { from: 'kerbin-surface', to: 'kerbin-orbit', deltaV: 3400, notes: 'To 80km circular orbit' },
  { from: 'kerbin-orbit', to: 'kerbin-surface', deltaV: 0, isAerobrake: true, notes: 'Aerobraking' },

  // Kerbin orbit to moons
  { from: 'kerbin-orbit', to: 'mun-intercept', deltaV: 860, notes: 'Trans-Munar injection' },
  { from: 'mun-intercept', to: 'mun-orbit', deltaV: 310, notes: 'Munar orbit insertion' },
  { from: 'mun-orbit', to: 'mun-surface', deltaV: 580, notes: 'Landing' },
  { from: 'mun-surface', to: 'mun-orbit', deltaV: 580, notes: 'Ascent' },
  { from: 'mun-orbit', to: 'kerbin-orbit', deltaV: 310, notes: 'Return to Kerbin' },

  { from: 'kerbin-orbit', to: 'minmus-intercept', deltaV: 930, notes: 'Trans-Minmus injection' },
  { from: 'minmus-intercept', to: 'minmus-orbit', deltaV: 160, notes: 'Minmus orbit insertion' },
  { from: 'minmus-orbit', to: 'minmus-surface', deltaV: 180, notes: 'Landing' },
  { from: 'minmus-surface', to: 'minmus-orbit', deltaV: 180, notes: 'Ascent' },
  { from: 'minmus-orbit', to: 'kerbin-orbit', deltaV: 160, notes: 'Return to Kerbin' },

  // Interplanetary from Kerbin orbit
  { from: 'kerbin-orbit', to: 'moho-intercept', deltaV: 2520, notes: 'To Moho' },
  { from: 'moho-intercept', to: 'moho-orbit', deltaV: 2410, notes: 'Moho orbit insertion' },
  { from: 'moho-orbit', to: 'moho-surface', deltaV: 870, notes: 'Landing' },
  { from: 'moho-surface', to: 'moho-orbit', deltaV: 870, notes: 'Ascent' },

  { from: 'kerbin-orbit', to: 'eve-intercept', deltaV: 1030, notes: 'To Eve' },
  { from: 'eve-intercept', to: 'eve-orbit', deltaV: 80, isAerobrake: true, notes: 'Aerobraking available' },
  { from: 'eve-intercept', to: 'eve-orbit', deltaV: 1330, notes: 'Propulsive capture' },
  { from: 'eve-orbit', to: 'eve-surface', deltaV: 0, isAerobrake: true, notes: 'Aerobraking' },
  { from: 'eve-surface', to: 'eve-orbit', deltaV: 8000, notes: 'Ascent (very difficult!)' },

  { from: 'eve-orbit', to: 'gilly-intercept', deltaV: 60, notes: 'To Gilly' },
  { from: 'gilly-intercept', to: 'gilly-orbit', deltaV: 30, notes: 'Gilly orbit insertion' },
  { from: 'gilly-orbit', to: 'gilly-surface', deltaV: 30, notes: 'Landing' },
  { from: 'gilly-surface', to: 'gilly-orbit', deltaV: 30, notes: 'Ascent' },

  { from: 'kerbin-orbit', to: 'duna-intercept', deltaV: 1060, notes: 'To Duna' },
  { from: 'duna-intercept', to: 'duna-orbit', deltaV: 0, isAerobrake: true, notes: 'Aerobraking available' },
  { from: 'duna-intercept', to: 'duna-orbit', deltaV: 360, notes: 'Propulsive capture' },
  { from: 'duna-orbit', to: 'duna-surface', deltaV: 0, isAerobrake: true, notes: 'Parachutes work' },
  { from: 'duna-orbit', to: 'duna-surface', deltaV: 360, notes: 'Propulsive landing' },
  { from: 'duna-surface', to: 'duna-orbit', deltaV: 1450, notes: 'Ascent' },

  { from: 'duna-orbit', to: 'ike-intercept', deltaV: 30, notes: 'To Ike' },
  { from: 'ike-intercept', to: 'ike-orbit', deltaV: 180, notes: 'Ike orbit insertion' },
  { from: 'ike-orbit', to: 'ike-surface', deltaV: 390, notes: 'Landing' },
  { from: 'ike-surface', to: 'ike-orbit', deltaV: 390, notes: 'Ascent' },

  { from: 'kerbin-orbit', to: 'dres-intercept', deltaV: 1700, notes: 'To Dres' },
  { from: 'dres-intercept', to: 'dres-orbit', deltaV: 1290, notes: 'Dres orbit insertion' },
  { from: 'dres-orbit', to: 'dres-surface', deltaV: 430, notes: 'Landing' },
  { from: 'dres-surface', to: 'dres-orbit', deltaV: 430, notes: 'Ascent' },

  { from: 'kerbin-orbit', to: 'jool-intercept', deltaV: 1930, notes: 'To Jool' },
  { from: 'jool-intercept', to: 'jool-orbit', deltaV: 160, isAerobrake: true, notes: 'Aerobraking' },
  { from: 'jool-intercept', to: 'jool-orbit', deltaV: 2810, notes: 'Propulsive capture' },

  { from: 'jool-orbit', to: 'laythe-intercept', deltaV: 930, notes: 'To Laythe' },
  { from: 'laythe-intercept', to: 'laythe-orbit', deltaV: 0, isAerobrake: true, notes: 'Aerobraking' },
  { from: 'laythe-intercept', to: 'laythe-orbit', deltaV: 1070, notes: 'Propulsive capture' },
  { from: 'laythe-orbit', to: 'laythe-surface', deltaV: 0, isAerobrake: true, notes: 'Parachutes' },
  { from: 'laythe-surface', to: 'laythe-orbit', deltaV: 2900, notes: 'Ascent' },

  { from: 'jool-orbit', to: 'vall-intercept', deltaV: 620, notes: 'To Vall' },
  { from: 'vall-intercept', to: 'vall-orbit', deltaV: 910, notes: 'Vall orbit insertion' },
  { from: 'vall-orbit', to: 'vall-surface', deltaV: 860, notes: 'Landing' },
  { from: 'vall-surface', to: 'vall-orbit', deltaV: 860, notes: 'Ascent' },

  { from: 'jool-orbit', to: 'tylo-intercept', deltaV: 400, notes: 'To Tylo' },
  { from: 'tylo-intercept', to: 'tylo-orbit', deltaV: 1100, notes: 'Tylo orbit insertion' },
  { from: 'tylo-orbit', to: 'tylo-surface', deltaV: 2270, notes: 'Landing' },
  { from: 'tylo-surface', to: 'tylo-orbit', deltaV: 2270, notes: 'Ascent' },

  { from: 'jool-orbit', to: 'bop-intercept', deltaV: 220, notes: 'To Bop' },
  { from: 'bop-intercept', to: 'bop-orbit', deltaV: 220, notes: 'Bop orbit insertion' },
  { from: 'bop-orbit', to: 'bop-surface', deltaV: 220, notes: 'Landing' },
  { from: 'bop-surface', to: 'bop-orbit', deltaV: 220, notes: 'Ascent' },

  { from: 'jool-orbit', to: 'pol-intercept', deltaV: 160, notes: 'To Pol' },
  { from: 'pol-intercept', to: 'pol-orbit', deltaV: 160, notes: 'Pol orbit insertion' },
  { from: 'pol-orbit', to: 'pol-surface', deltaV: 130, notes: 'Landing' },
  { from: 'pol-surface', to: 'pol-orbit', deltaV: 130, notes: 'Ascent' },

  { from: 'kerbin-orbit', to: 'eeloo-intercept', deltaV: 1850, notes: 'To Eeloo' },
  { from: 'eeloo-intercept', to: 'eeloo-orbit', deltaV: 1370, notes: 'Eeloo orbit insertion' },
  { from: 'eeloo-orbit', to: 'eeloo-surface', deltaV: 620, notes: 'Landing' },
  { from: 'eeloo-surface', to: 'eeloo-orbit', deltaV: 620, notes: 'Ascent' },
];

// Simplified delta-V map for common missions
export interface MissionDeltaV {
  name: string;
  totalDeltaV: number;
  legs: { name: string; deltaV: number }[];
}

export const commonMissions: MissionDeltaV[] = [
  {
    name: 'Kerbin Orbit',
    totalDeltaV: 3400,
    legs: [{ name: 'Launch to orbit', deltaV: 3400 }],
  },
  {
    name: 'Mun Landing (Round Trip)',
    totalDeltaV: 6540,
    legs: [
      { name: 'Launch to orbit', deltaV: 3400 },
      { name: 'Trans-Munar injection', deltaV: 860 },
      { name: 'Munar orbit insertion', deltaV: 310 },
      { name: 'Landing', deltaV: 580 },
      { name: 'Ascent', deltaV: 580 },
      { name: 'Trans-Kerbin injection', deltaV: 310 },
      { name: 'Kerbin reentry', deltaV: 0 },
    ],
  },
  {
    name: 'Minmus Landing (Round Trip)',
    totalDeltaV: 6010,
    legs: [
      { name: 'Launch to orbit', deltaV: 3400 },
      { name: 'Trans-Minmus injection', deltaV: 930 },
      { name: 'Minmus orbit insertion', deltaV: 160 },
      { name: 'Landing', deltaV: 180 },
      { name: 'Ascent', deltaV: 180 },
      { name: 'Trans-Kerbin injection', deltaV: 160 },
      { name: 'Kerbin reentry', deltaV: 0 },
    ],
  },
  {
    name: 'Duna Landing (Round Trip)',
    totalDeltaV: 7740,
    legs: [
      { name: 'Launch to orbit', deltaV: 3400 },
      { name: 'Trans-Duna injection', deltaV: 1060 },
      { name: 'Duna aerobrake', deltaV: 0 },
      { name: 'Landing (chutes)', deltaV: 360 },
      { name: 'Ascent', deltaV: 1450 },
      { name: 'Duna escape', deltaV: 410 },
      { name: 'Trans-Kerbin injection', deltaV: 1060 },
      { name: 'Kerbin reentry', deltaV: 0 },
    ],
  },
  {
    name: 'Eve Orbit (One Way)',
    totalDeltaV: 4510,
    legs: [
      { name: 'Launch to orbit', deltaV: 3400 },
      { name: 'Trans-Eve injection', deltaV: 1030 },
      { name: 'Eve aerobrake', deltaV: 80 },
    ],
  },
  {
    name: 'Jool System (One Way)',
    totalDeltaV: 5490,
    legs: [
      { name: 'Launch to orbit', deltaV: 3400 },
      { name: 'Trans-Jool injection', deltaV: 1930 },
      { name: 'Jool aerobrake', deltaV: 160 },
    ],
  },
];

// Get delta-V between two bodies
export function getDeltaVBetween(from: string, to: string): DeltaVConnection | undefined {
  return deltaVConnections.find(
    (conn) => conn.from === from && conn.to === to
  );
}

// Get all connections from a location
export function getConnectionsFrom(from: string): DeltaVConnection[] {
  return deltaVConnections.filter((conn) => conn.from === from);
}

// Get all connections to a location
export function getConnectionsTo(to: string): DeltaVConnection[] {
  return deltaVConnections.filter((conn) => conn.to === to);
}
