import { CelestialBody } from '../types';

// Standard gravitational parameter for calculations
export const G0 = 9.80665; // m/s², standard gravity

// Kerbin day and year for time calculations
export const KERBIN_DAY = 21600; // seconds (6 hours)
export const KERBIN_YEAR = 9203545; // seconds (~426.08 days)

export const celestialBodies: Record<string, CelestialBody> = {
  kerbol: {
    id: 'kerbol',
    name: 'Kerbol',
    parent: null,
    color: '#ffcc00',
    orbital: {
      semiMajorAxis: 0,
      eccentricity: 0,
      inclination: 0,
      argumentOfPeriapsis: 0,
      longitudeOfAscendingNode: 0,
      meanAnomalyAtEpoch: 0,
      orbitalPeriod: 0,
    },
    physical: {
      radius: 261600000,
      mass: 1.7565459e28,
      gravitationalParameter: 1.1723328e18,
      surfaceGravity: 17.1,
      escapeVelocity: 94672,
      rotationPeriod: 432000,
      hasAtmosphere: true,
      atmosphereHeight: 600000,
      atmospherePressure: 16,
    },
    soiRadius: Infinity,
    biomes: ['Sun'],
    scienceMultiplier: 1,
  },

  moho: {
    id: 'moho',
    name: 'Moho',
    parent: 'kerbol',
    color: '#8b4513',
    orbital: {
      semiMajorAxis: 5263138304,
      eccentricity: 0.2,
      inclination: 7,
      argumentOfPeriapsis: 15,
      longitudeOfAscendingNode: 70,
      meanAnomalyAtEpoch: 3.14,
      orbitalPeriod: 2215754,
    },
    physical: {
      radius: 250000,
      mass: 2.5263314e21,
      gravitationalParameter: 1.6860938e11,
      surfaceGravity: 2.7,
      escapeVelocity: 1161,
      rotationPeriod: 1210000,
      hasAtmosphere: false,
    },
    soiRadius: 9646663,
    biomes: ['North Pole', 'Northern Sinkhole', 'Midlands', 'Western Lowlands', 'Central Lowlands', 'Highlands', 'Minor Craters', 'South Pole', 'Canyon', 'South Eastern Lowlands'],
    scienceMultiplier: 10,
  },

  eve: {
    id: 'eve',
    name: 'Eve',
    parent: 'kerbol',
    color: '#800080',
    orbital: {
      semiMajorAxis: 9832684544,
      eccentricity: 0.01,
      inclination: 2.1,
      argumentOfPeriapsis: 0,
      longitudeOfAscendingNode: 15,
      meanAnomalyAtEpoch: 3.14,
      orbitalPeriod: 5657995,
    },
    physical: {
      radius: 700000,
      mass: 1.2243980e23,
      gravitationalParameter: 8.1717302e12,
      surfaceGravity: 16.7,
      escapeVelocity: 4832,
      rotationPeriod: 80500,
      hasAtmosphere: true,
      atmosphereHeight: 90000,
      atmospherePressure: 5,
    },
    soiRadius: 85109365,
    biomes: ['Poles', 'Midlands', 'Lowlands', 'Highlands', 'Peaks', 'Impact Ejecta', 'Foothills', 'Explodium Sea', 'Crater Lake', 'Western Sea', 'Olympus', 'Akatsuki Lake', 'Crater Bay'],
    scienceMultiplier: 8,
  },

  gilly: {
    id: 'gilly',
    name: 'Gilly',
    parent: 'eve',
    color: '#a0522d',
    orbital: {
      semiMajorAxis: 31500000,
      eccentricity: 0.55,
      inclination: 12,
      argumentOfPeriapsis: 10,
      longitudeOfAscendingNode: 80,
      meanAnomalyAtEpoch: 0.9,
      orbitalPeriod: 388587,
    },
    physical: {
      radius: 13000,
      mass: 1.2420363e17,
      gravitationalParameter: 8289449.8,
      surfaceGravity: 0.049,
      escapeVelocity: 35,
      rotationPeriod: 28255,
      hasAtmosphere: false,
    },
    soiRadius: 126123,
    biomes: ['Midlands', 'Lowlands', 'Highlands'],
    scienceMultiplier: 9,
  },

  kerbin: {
    id: 'kerbin',
    name: 'Kerbin',
    parent: 'kerbol',
    color: '#4169e1',
    orbital: {
      semiMajorAxis: 13599840256,
      eccentricity: 0,
      inclination: 0,
      argumentOfPeriapsis: 0,
      longitudeOfAscendingNode: 0,
      meanAnomalyAtEpoch: 3.14,
      orbitalPeriod: 9203545,
    },
    physical: {
      radius: 600000,
      mass: 5.2915158e22,
      gravitationalParameter: 3.5316e12,
      surfaceGravity: 9.81,
      escapeVelocity: 3431,
      rotationPeriod: 21549.425,
      hasAtmosphere: true,
      atmosphereHeight: 70000,
      atmospherePressure: 1,
    },
    soiRadius: 84159286,
    biomes: ['Ice Caps', 'Northern Ice Shelf', 'Southern Ice Shelf', 'Tundra', 'Highlands', 'Mountains', 'Grasslands', 'Deserts', 'Badlands', 'Shores', 'Water', 'KSC'],
    scienceMultiplier: 1,
  },

  mun: {
    id: 'mun',
    name: 'Mun',
    parent: 'kerbin',
    color: '#808080',
    orbital: {
      semiMajorAxis: 12000000,
      eccentricity: 0,
      inclination: 0,
      argumentOfPeriapsis: 0,
      longitudeOfAscendingNode: 0,
      meanAnomalyAtEpoch: 1.7,
      orbitalPeriod: 138984,
    },
    physical: {
      radius: 200000,
      mass: 9.7599066e20,
      gravitationalParameter: 6.5138398e10,
      surfaceGravity: 1.63,
      escapeVelocity: 807,
      rotationPeriod: 138984,
      hasAtmosphere: false,
    },
    soiRadius: 2429559,
    biomes: ['Midlands', 'Highlands', 'Lowlands', 'Farside Basin', 'East Farside Crater', 'Farside Crater', 'Northwest Crater', 'Southwest Crater', 'Poles', 'Canyon', 'Twin Craters', 'Canyons', 'Polar Lowlands', 'Polar Crater', 'Northern Basin', 'East Crater'],
    scienceMultiplier: 4,
  },

  minmus: {
    id: 'minmus',
    name: 'Minmus',
    parent: 'kerbin',
    color: '#98fb98',
    orbital: {
      semiMajorAxis: 47000000,
      eccentricity: 0,
      inclination: 6,
      argumentOfPeriapsis: 38,
      longitudeOfAscendingNode: 78,
      meanAnomalyAtEpoch: 0.9,
      orbitalPeriod: 1077311,
    },
    physical: {
      radius: 60000,
      mass: 2.6457580e19,
      gravitationalParameter: 1.7658000e9,
      surfaceGravity: 0.491,
      escapeVelocity: 242,
      rotationPeriod: 40400,
      hasAtmosphere: false,
    },
    soiRadius: 2247428,
    biomes: ['Midlands', 'Highlands', 'Lowlands', 'Flats', 'Great Flats', 'Greater Flats', 'Lesser Flats', 'Poles', 'Slopes', 'Frozen Lakes'],
    scienceMultiplier: 5,
  },

  duna: {
    id: 'duna',
    name: 'Duna',
    parent: 'kerbol',
    color: '#cd5c5c',
    orbital: {
      semiMajorAxis: 20726155264,
      eccentricity: 0.051,
      inclination: 0.06,
      argumentOfPeriapsis: 0,
      longitudeOfAscendingNode: 135.5,
      meanAnomalyAtEpoch: 3.14,
      orbitalPeriod: 17315400,
    },
    physical: {
      radius: 320000,
      mass: 4.5154270e21,
      gravitationalParameter: 3.0136321e11,
      surfaceGravity: 2.94,
      escapeVelocity: 1372,
      rotationPeriod: 65517,
      hasAtmosphere: true,
      atmosphereHeight: 50000,
      atmospherePressure: 0.0666,
    },
    soiRadius: 47921949,
    biomes: ['Midlands', 'Highlands', 'Lowlands', 'Craters', 'Polar Highlands', 'Polar Craters', 'Poles', 'Northern Shelf', 'Southern Basin', 'Eastern Canyon', 'Western Canyon'],
    scienceMultiplier: 7,
  },

  ike: {
    id: 'ike',
    name: 'Ike',
    parent: 'duna',
    color: '#696969',
    orbital: {
      semiMajorAxis: 3200000,
      eccentricity: 0.03,
      inclination: 0.2,
      argumentOfPeriapsis: 0,
      longitudeOfAscendingNode: 0,
      meanAnomalyAtEpoch: 1.7,
      orbitalPeriod: 65518,
    },
    physical: {
      radius: 130000,
      mass: 2.7821615e20,
      gravitationalParameter: 1.8568369e10,
      surfaceGravity: 1.1,
      escapeVelocity: 534,
      rotationPeriod: 65518,
      hasAtmosphere: false,
    },
    soiRadius: 1049599,
    biomes: ['Midlands', 'Eastern Mountain Ridge', 'Western Mountain Ridge', 'Central Mountain Range', 'Polar Lowlands', 'South Eastern Mountain Range', 'South Pole', 'Polar Lowlands'],
    scienceMultiplier: 7,
  },

  dres: {
    id: 'dres',
    name: 'Dres',
    parent: 'kerbol',
    color: '#a9a9a9',
    orbital: {
      semiMajorAxis: 40839348203,
      eccentricity: 0.145,
      inclination: 5,
      argumentOfPeriapsis: 90,
      longitudeOfAscendingNode: 280,
      meanAnomalyAtEpoch: 3.14,
      orbitalPeriod: 47893063,
    },
    physical: {
      radius: 138000,
      mass: 3.2190937e20,
      gravitationalParameter: 2.1484489e10,
      surfaceGravity: 1.13,
      escapeVelocity: 558,
      rotationPeriod: 34800,
      hasAtmosphere: false,
    },
    soiRadius: 32832840,
    biomes: ['Midlands', 'Highlands', 'Lowlands', 'Ridges', 'Impact Craters', 'Impact Ejecta', 'Canyons', 'Poles'],
    scienceMultiplier: 8,
  },

  jool: {
    id: 'jool',
    name: 'Jool',
    parent: 'kerbol',
    color: '#228b22',
    orbital: {
      semiMajorAxis: 68773560320,
      eccentricity: 0.05,
      inclination: 1.304,
      argumentOfPeriapsis: 0,
      longitudeOfAscendingNode: 52,
      meanAnomalyAtEpoch: 0.1,
      orbitalPeriod: 104661432,
    },
    physical: {
      radius: 6000000,
      mass: 4.2332127e24,
      gravitationalParameter: 2.8252800e14,
      surfaceGravity: 7.85,
      escapeVelocity: 9704,
      rotationPeriod: 36000,
      hasAtmosphere: true,
      atmosphereHeight: 200000,
      atmospherePressure: 15,
    },
    soiRadius: 2455985200,
    biomes: ['Global'],
    scienceMultiplier: 6,
  },

  laythe: {
    id: 'laythe',
    name: 'Laythe',
    parent: 'jool',
    color: '#1e90ff',
    orbital: {
      semiMajorAxis: 27184000,
      eccentricity: 0,
      inclination: 0,
      argumentOfPeriapsis: 0,
      longitudeOfAscendingNode: 0,
      meanAnomalyAtEpoch: 3.14,
      orbitalPeriod: 52981,
    },
    physical: {
      radius: 500000,
      mass: 2.9397311e22,
      gravitationalParameter: 1.9620000e12,
      surfaceGravity: 7.85,
      escapeVelocity: 2801,
      rotationPeriod: 52981,
      hasAtmosphere: true,
      atmosphereHeight: 50000,
      atmospherePressure: 0.6,
    },
    soiRadius: 3723646,
    biomes: ['Poles', 'Shores', 'Dunes', 'Crescent Bay', 'The Sagen Sea', 'Crater Bay', 'Crater Island', 'Shallows', 'Craters', 'Peaks', 'Crater Lake'],
    scienceMultiplier: 10,
  },

  vall: {
    id: 'vall',
    name: 'Vall',
    parent: 'jool',
    color: '#add8e6',
    orbital: {
      semiMajorAxis: 43152000,
      eccentricity: 0,
      inclination: 0,
      argumentOfPeriapsis: 0,
      longitudeOfAscendingNode: 0,
      meanAnomalyAtEpoch: 0.9,
      orbitalPeriod: 105962,
    },
    physical: {
      radius: 300000,
      mass: 3.1087655e21,
      gravitationalParameter: 2.0748150e11,
      surfaceGravity: 2.31,
      escapeVelocity: 1176,
      rotationPeriod: 105962,
      hasAtmosphere: false,
    },
    soiRadius: 2406401,
    biomes: ['Lowlands', 'Midlands', 'Highlands', 'Mountains', 'Poles', 'Northeast Basin', 'Northwest Basin', 'Southern Basin', 'Southern Valleys'],
    scienceMultiplier: 10,
  },

  tylo: {
    id: 'tylo',
    name: 'Tylo',
    parent: 'jool',
    color: '#d3d3d3',
    orbital: {
      semiMajorAxis: 68500000,
      eccentricity: 0,
      inclination: 0.025,
      argumentOfPeriapsis: 0,
      longitudeOfAscendingNode: 0,
      meanAnomalyAtEpoch: 3.14,
      orbitalPeriod: 211926,
    },
    physical: {
      radius: 600000,
      mass: 4.2332127e22,
      gravitationalParameter: 2.8252800e12,
      surfaceGravity: 7.85,
      escapeVelocity: 3068,
      rotationPeriod: 211926,
      hasAtmosphere: false,
    },
    soiRadius: 10856518,
    biomes: ['Lowlands', 'Midlands', 'Highlands', 'Mara', 'Minor Craters', 'Major Craters', 'Gagarin Crater', 'Grissom Crater', 'Galileio Crater', 'Tycho Crater'],
    scienceMultiplier: 12,
  },

  bop: {
    id: 'bop',
    name: 'Bop',
    parent: 'jool',
    color: '#8b4513',
    orbital: {
      semiMajorAxis: 128500000,
      eccentricity: 0.235,
      inclination: 15,
      argumentOfPeriapsis: 25,
      longitudeOfAscendingNode: 10,
      meanAnomalyAtEpoch: 0.9,
      orbitalPeriod: 544507,
    },
    physical: {
      radius: 65000,
      mass: 3.7261090e19,
      gravitationalParameter: 2.4868349e9,
      surfaceGravity: 0.589,
      escapeVelocity: 277,
      rotationPeriod: 544507,
      hasAtmosphere: false,
    },
    soiRadius: 1221061,
    biomes: ['Poles', 'Slopes', 'Peaks', 'Valley', 'Ridges'],
    scienceMultiplier: 10,
  },

  pol: {
    id: 'pol',
    name: 'Pol',
    parent: 'jool',
    color: '#f0e68c',
    orbital: {
      semiMajorAxis: 179890000,
      eccentricity: 0.171,
      inclination: 4.25,
      argumentOfPeriapsis: 15,
      longitudeOfAscendingNode: 2,
      meanAnomalyAtEpoch: 0.9,
      orbitalPeriod: 901903,
    },
    physical: {
      radius: 44000,
      mass: 1.0813507e19,
      gravitationalParameter: 7.2170208e8,
      surfaceGravity: 0.373,
      escapeVelocity: 181,
      rotationPeriod: 901903,
      hasAtmosphere: false,
    },
    soiRadius: 1042139,
    biomes: ['Lowlands', 'Midlands', 'Highlands', 'Poles'],
    scienceMultiplier: 10,
  },

  eeloo: {
    id: 'eeloo',
    name: 'Eeloo',
    parent: 'kerbol',
    color: '#e0ffff',
    orbital: {
      semiMajorAxis: 90118820000,
      eccentricity: 0.26,
      inclination: 6.15,
      argumentOfPeriapsis: 260,
      longitudeOfAscendingNode: 50,
      meanAnomalyAtEpoch: 3.14,
      orbitalPeriod: 156992048,
    },
    physical: {
      radius: 210000,
      mass: 1.1149224e21,
      gravitationalParameter: 7.4410815e10,
      surfaceGravity: 1.69,
      escapeVelocity: 841,
      rotationPeriod: 19460,
      hasAtmosphere: false,
    },
    soiRadius: 119082942,
    biomes: ['Midlands', 'Lowlands', 'Ice Canyons', 'Highlands', 'Craters', 'Fragipan', 'Babbage Patch', 'Mu Glacier', 'Poles'],
    scienceMultiplier: 12,
  },
};

// Get all bodies as an array
export const bodiesArray = Object.values(celestialBodies);

// Get bodies by parent
export function getBodiesByParent(parentId: string | null): CelestialBody[] {
  return bodiesArray.filter((body) => body.parent === parentId);
}

// Get all moons of a body
export function getMoons(bodyId: string): CelestialBody[] {
  return getBodiesByParent(bodyId);
}

// Get parent body
export function getParent(bodyId: string): CelestialBody | null {
  const body = celestialBodies[bodyId];
  if (!body || !body.parent) return null;
  return celestialBodies[body.parent] || null;
}

// Get the root parent (usually Kerbol)
export function getRootParent(bodyId: string): CelestialBody {
  let current = celestialBodies[bodyId];
  while (current.parent) {
    current = celestialBodies[current.parent];
  }
  return current;
}
