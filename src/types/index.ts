// Celestial Body Types
export interface OrbitalParameters {
  semiMajorAxis: number;      // meters
  eccentricity: number;
  inclination: number;         // degrees
  argumentOfPeriapsis: number; // degrees
  longitudeOfAscendingNode: number; // degrees
  meanAnomalyAtEpoch: number;  // degrees
  orbitalPeriod: number;       // seconds
}

export interface PhysicalParameters {
  radius: number;              // meters
  mass: number;                // kg
  gravitationalParameter: number; // m³/s² (GM)
  surfaceGravity: number;      // m/s²
  escapeVelocity: number;      // m/s
  rotationPeriod: number;      // seconds
  hasAtmosphere: boolean;
  atmosphereHeight?: number;   // meters
  atmospherePressure?: number; // atm at sea level
}

export interface CelestialBody {
  id: string;
  name: string;
  parent: string | null;       // null for the sun
  color: string;
  orbital: OrbitalParameters;
  physical: PhysicalParameters;
  soiRadius: number;           // meters
  biomes: string[];
  scienceMultiplier: number;
}

// Parts Types
export type PartCategory = 'engine' | 'fuelTank' | 'command' | 'structural' | 'utility';
export type FuelType = 'liquidFuel' | 'oxidizer' | 'monopropellant' | 'solidFuel' | 'xenon' | 'electricCharge';

export interface Engine {
  id: string;
  name: string;
  category: 'engine';
  mass: number;                // kg (dry)
  thrustVac: number;           // kN
  thrustAtm: number;           // kN (at 1 atm)
  ispVac: number;              // seconds
  ispAtm: number;              // seconds
  fuelConsumption: {
    type: FuelType;
    rate: number;              // units per second at max thrust
  }[];
  gimbalRange: number;         // degrees
  radialSize: string;          // 'tiny' | 'small' | 'medium' | 'large' | 'extraLarge'
}

export interface FuelTank {
  id: string;
  name: string;
  category: 'fuelTank';
  massEmpty: number;           // kg
  massFull: number;            // kg
  fuelCapacity: {
    type: FuelType;
    amount: number;            // units
  }[];
  radialSize: string;
}

export interface CommandPod {
  id: string;
  name: string;
  category: 'command';
  mass: number;                // kg
  crewCapacity: number;
  electricCharge: number;      // units
  monopropellant?: number;     // units
  sasLevel: number;            // 0-3
  radialSize: string;
}

export interface StructuralPart {
  id: string;
  name: string;
  category: 'structural';
  mass: number;
  radialSize?: string;
}

export interface UtilityPart {
  id: string;
  name: string;
  category: 'utility';
  mass: number;
}

export type Part = Engine | FuelTank | CommandPod | StructuralPart | UtilityPart;

// Rocket Builder Types
export interface StagePart {
  partId: string;
  quantity: number;
}

export interface Stage {
  id: string;
  parts: StagePart[];
  isActive: boolean;
}

export interface RocketDesign {
  id: string;
  name: string;
  stages: Stage[];
  createdAt: number;
  updatedAt: number;
}

export interface StageStats {
  dryMass: number;
  wetMass: number;
  deltaV: number;
  twr: number;
  thrustVac: number;
  thrustAtm: number;
  ispVac: number;
  ispAtm: number;
  burnTime: number;
}

export interface RocketStats {
  totalDeltaV: number;
  totalMass: number;
  stages: StageStats[];
}

// Mission Types
export type ManeuverType =
  | 'launch'
  | 'circularize'
  | 'transfer'
  | 'correction'
  | 'capture'
  | 'aerobrake'
  | 'land'
  | 'ascent'
  | 'rendezvous'
  | 'dock'
  | 'return';

export interface Maneuver {
  id: string;
  type: ManeuverType;
  name: string;
  deltaV: number;
  origin?: string;             // body id
  destination?: string;        // body id
  notes?: string;
}

export interface MissionPhase {
  id: string;
  name: string;
  maneuvers: Maneuver[];
  startBody: string;
  endBody: string;
}

export interface Mission {
  id: string;
  name: string;
  phases: MissionPhase[];
  totalDeltaV: number;
  createdAt: number;
  updatedAt: number;
}

export interface TemplateManeuver {
  type: ManeuverType;
  name: string;
  deltaV: number;
  origin?: string;
  destination?: string;
  notes?: string;
}

export interface TemplatePhase {
  name: string;
  maneuvers: TemplateManeuver[];
  startBody: string;
  endBody: string;
}

export interface MissionTemplate {
  id: string;
  name: string;
  description: string;
  phases: TemplatePhase[];
}

// Transfer Window Types
export interface TransferWindow {
  departureTime: number;       // Kerbin days from epoch
  arrivalTime: number;
  flightTime: number;
  departureDeltaV: number;
  arrivalDeltaV: number;
  totalDeltaV: number;
  phaseAngle: number;
  ejectionAngle: number;
}

export interface PorkchopData {
  origin: string;
  destination: string;
  departureRange: [number, number];  // min/max Kerbin days
  arrivalRange: [number, number];
  data: number[][];                   // 2D array of deltaV values
  windows: TransferWindow[];
}

// Science Types
export type ScienceSituation =
  | 'landed'
  | 'splashed'
  | 'flying'
  | 'inSpaceLow'
  | 'inSpaceHigh';

export interface ScienceExperiment {
  id: string;
  name: string;
  baseValue: number;
  dataScale: number;
  transmissionValue: number;  // multiplier for transmission vs recovery
  situations: ScienceSituation[];
  requiresAtmosphere?: boolean;
  requiresWater?: boolean;
}

export interface ScienceResult {
  experimentId: string;
  bodyId: string;
  biome: string;
  situation: ScienceSituation;
  value: number;
  collected: boolean;
  transmitted: boolean;
}

export interface TechNode {
  id: string;
  name: string;
  cost: number;               // science points
  parents: string[];          // prerequisite tech ids
  unlocks: string[];          // part ids
}

// App Settings
export interface AppSettings {
  darkMode: boolean;
  showAdvancedStats: boolean;
  defaultBody: string;
  useMetricUnits: boolean;
}

// Store Types
export interface MissionStore {
  missions: Mission[];
  currentMission: Mission | null;
  templates: MissionTemplate[];
  createMission: (name: string) => void;
  updateMission: (mission: Mission) => void;
  deleteMission: (id: string) => void;
  setCurrentMission: (mission: Mission | null) => void;
  addPhase: (phase: Omit<MissionPhase, 'id'>) => void;
  removePhase: (phaseId: string) => void;
  addManeuver: (phaseId: string, maneuver: Omit<Maneuver, 'id'>) => void;
  removeManeuver: (phaseId: string, maneuverId: string) => void;
  loadFromTemplate: (templateId: string) => void;
  exportMission: () => string;
  importMission: (json: string) => void;
}

export interface RocketStore {
  designs: RocketDesign[];
  currentDesign: RocketDesign | null;
  createDesign: (name: string) => void;
  updateDesign: (design: RocketDesign) => void;
  deleteDesign: (id: string) => void;
  setCurrentDesign: (design: RocketDesign | null) => void;
  addStage: () => void;
  removeStage: (stageId: string) => void;
  addPartToStage: (stageId: string, partId: string) => void;
  removePartFromStage: (stageId: string, partId: string) => void;
  updatePartQuantity: (stageId: string, partId: string, quantity: number) => void;
  exportDesign: () => string;
  importDesign: (json: string) => void;
}

export interface ScienceStore {
  collectedScience: ScienceResult[];
  markCollected: (result: Omit<ScienceResult, 'collected' | 'transmitted'>) => void;
  markTransmitted: (experimentId: string, bodyId: string, biome: string, situation: ScienceSituation) => void;
  clearScience: () => void;
  getTotalScience: () => number;
  exportScience: () => string;
  importScience: (json: string) => void;
}

export interface SettingsStore extends AppSettings {
  updateSettings: (settings: Partial<AppSettings>) => void;
}

// Delta-V Map Types
export interface DeltaVConnection {
  from: string;
  to: string;
  deltaV: number;
  isAerobrake?: boolean;
  notes?: string;
}

export interface DeltaVMapData {
  nodes: {
    id: string;
    name: string;
    x: number;
    y: number;
  }[];
  connections: DeltaVConnection[];
}

// Telemetry Types (for live KSP connection)
export type VesselSituation =
  | 'prelaunch'
  | 'landed'
  | 'splashed'
  | 'flying'
  | 'subOrbital'
  | 'orbiting'
  | 'escaping'
  | 'docked';

export interface ManeuverNode {
  deltaV: number;
  remainingDeltaV: number;
  burnTime: number;
  timeToNode: number;
  prograde: number;
  normal: number;
  radial: number;
}

export interface TargetInfo {
  name: string;
  distance?: number;
  relativeSpeed?: number;
  timeToClosestApproach?: number;
}

export interface VesselTelemetry {
  // Vessel info
  name: string;
  type: string;
  situation: VesselSituation;
  missionTime: number; // seconds
  mass?: number;
  dryMass?: number;

  // Position
  bodyId: string;
  bodyName?: string;
  latitude: number;
  longitude: number;
  altitude: number; // meters above sea level
  surfaceAltitude: number; // meters above terrain
  radarAltitude?: number;
  biome?: string;

  // Attitude
  pitch?: number;
  heading?: number;
  roll?: number;

  // Velocity
  surfaceSpeed: number; // m/s
  orbitalSpeed: number; // m/s
  verticalSpeed: number; // m/s
  horizontalSpeed?: number;

  // G-Force
  gForce?: number;

  // Atmosphere
  inAtmosphere?: boolean;
  atmosphereDensity?: number;
  dynamicPressure?: number;
  staticPressure?: number;
  machNumber?: number;
  terminalVelocity?: number;

  // Orbital parameters (when in orbit)
  apoapsis?: number;
  periapsis?: number;
  semiMajorAxis?: number;
  inclination?: number;
  eccentricity?: number;
  orbitalPeriod?: number;
  timeToApoapsis?: number;
  timeToPeriapsis?: number;
  argumentOfPeriapsis?: number;
  longitudeOfAscendingNode?: number;
  meanAnomaly?: number;
  trueAnomaly?: number;

  // SOI
  timeToSOIChange?: number;
  nextBodyName?: string;

  // Resources
  liquidFuel: number;
  liquidFuelMax: number;
  oxidizer: number;
  oxidizerMax: number;
  monopropellant: number;
  monopropellantMax: number;
  electricCharge: number;
  electricChargeMax: number;
  xenonGas?: number;
  xenonGasMax?: number;
  solidFuel?: number;
  solidFuelMax?: number;
  ablator?: number;
  ablatorMax?: number;
  ore?: number;
  oreMax?: number;

  // Performance
  currentThrust?: number;
  availableThrust?: number;
  currentTWR: number;
  maxTWR: number;
  specificImpulse?: number;
  deltaVRemaining: number;
  deltaVTotal: number;
  currentStage: number;
  totalStages: number;
  throttle?: number;

  // Control state
  sas?: boolean;
  rcs?: boolean;
  gear?: boolean;
  lights?: boolean;
  brakes?: boolean;
  abort?: boolean;

  // Crew
  crewCount: number;
  crewCapacity: number;
  crewNames?: string[];

  // Comms
  commNetSignal?: number;
  canCommunicate?: boolean;

  // Maneuver node
  maneuverNode?: ManeuverNode;

  // Target
  target?: TargetInfo;

  // Science
  totalSciencePoints?: number;
  vesselExperiments?: VesselExperiment[];

  // Timestamp
  timestamp: number;
}

export interface VesselExperiment {
  partName: string;
  moduleName: string;
  experimentId?: string;
  hasData?: boolean;
  canDeploy?: boolean;
}

export interface TelemetryConnection {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  serverUrl: string;
  lastUpdate: number | null;
  error: string | null;
}
