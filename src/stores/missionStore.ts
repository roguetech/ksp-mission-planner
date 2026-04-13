import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Mission, MissionPhase, Maneuver, MissionTemplate } from '../types';

interface MissionState {
  missions: Mission[];
  currentMission: Mission | null;
  templates: MissionTemplate[];
}

interface MissionActions {
  createMission: (name: string) => void;
  updateMission: (mission: Mission) => void;
  deleteMission: (id: string) => void;
  setCurrentMission: (mission: Mission | null) => void;
  addPhase: (phase: Omit<MissionPhase, 'id'>) => void;
  removePhase: (phaseId: string) => void;
  updatePhase: (phaseId: string, updates: Partial<MissionPhase>) => void;
  reorderPhases: (fromIndex: number, toIndex: number) => void;
  addManeuver: (phaseId: string, maneuver: Omit<Maneuver, 'id'>) => void;
  removeManeuver: (phaseId: string, maneuverId: string) => void;
  updateManeuver: (phaseId: string, maneuverId: string, updates: Partial<Maneuver>) => void;
  loadFromTemplate: (templateId: string) => void;
  exportMission: () => string;
  importMission: (json: string) => boolean;
}

type MissionStore = MissionState & MissionActions;

const generateId = () => Math.random().toString(36).substring(2, 9);

const defaultTemplates: MissionTemplate[] = [
  {
    id: 'mun-landing',
    name: 'Mun Landing',
    description: 'Standard round-trip mission to the Mun',
    phases: [
      {
        name: 'Launch to Orbit',
        maneuvers: [
          { type: 'launch', name: 'Launch', deltaV: 3400, origin: 'kerbin' },
          { type: 'circularize', name: 'Circularize at 80km', deltaV: 0, destination: 'kerbin' },
        ],
        startBody: 'kerbin',
        endBody: 'kerbin',
      },
      {
        name: 'Transfer to Mun',
        maneuvers: [
          { type: 'transfer', name: 'Trans-Munar Injection', deltaV: 860, origin: 'kerbin', destination: 'mun' },
          { type: 'correction', name: 'Mid-course Correction', deltaV: 10 },
          { type: 'capture', name: 'Munar Orbit Insertion', deltaV: 310, destination: 'mun' },
        ],
        startBody: 'kerbin',
        endBody: 'mun',
      },
      {
        name: 'Mun Surface Operations',
        maneuvers: [
          { type: 'land', name: 'Landing', deltaV: 580, destination: 'mun' },
          { type: 'ascent', name: 'Ascent to Orbit', deltaV: 580, origin: 'mun' },
        ],
        startBody: 'mun',
        endBody: 'mun',
      },
      {
        name: 'Return to Kerbin',
        maneuvers: [
          { type: 'transfer', name: 'Trans-Kerbin Injection', deltaV: 310, origin: 'mun', destination: 'kerbin' },
          { type: 'aerobrake', name: 'Kerbin Reentry', deltaV: 0, destination: 'kerbin' },
        ],
        startBody: 'mun',
        endBody: 'kerbin',
      },
    ],
  },
  {
    id: 'minmus-landing',
    name: 'Minmus Landing',
    description: 'Round-trip to Minmus - easier landing than Mun',
    phases: [
      {
        name: 'Launch to Orbit',
        maneuvers: [
          { type: 'launch', name: 'Launch', deltaV: 3400, origin: 'kerbin' },
          { type: 'circularize', name: 'Circularize at 80km', deltaV: 0, destination: 'kerbin' },
        ],
        startBody: 'kerbin',
        endBody: 'kerbin',
      },
      {
        name: 'Transfer to Minmus',
        maneuvers: [
          { type: 'transfer', name: 'Trans-Minmus Injection', deltaV: 930, origin: 'kerbin', destination: 'minmus' },
          { type: 'capture', name: 'Minmus Orbit Insertion', deltaV: 160, destination: 'minmus' },
        ],
        startBody: 'kerbin',
        endBody: 'minmus',
      },
      {
        name: 'Minmus Surface Operations',
        maneuvers: [
          { type: 'land', name: 'Landing', deltaV: 180, destination: 'minmus' },
          { type: 'ascent', name: 'Ascent to Orbit', deltaV: 180, origin: 'minmus' },
        ],
        startBody: 'minmus',
        endBody: 'minmus',
      },
      {
        name: 'Return to Kerbin',
        maneuvers: [
          { type: 'transfer', name: 'Trans-Kerbin Injection', deltaV: 160, origin: 'minmus', destination: 'kerbin' },
          { type: 'aerobrake', name: 'Kerbin Reentry', deltaV: 0, destination: 'kerbin' },
        ],
        startBody: 'minmus',
        endBody: 'kerbin',
      },
    ],
  },
  {
    id: 'duna-landing',
    name: 'Duna Landing',
    description: 'Interplanetary round-trip to Duna',
    phases: [
      {
        name: 'Launch to Orbit',
        maneuvers: [
          { type: 'launch', name: 'Launch', deltaV: 3400, origin: 'kerbin' },
        ],
        startBody: 'kerbin',
        endBody: 'kerbin',
      },
      {
        name: 'Transfer to Duna',
        maneuvers: [
          { type: 'transfer', name: 'Trans-Duna Injection', deltaV: 1060, origin: 'kerbin', destination: 'duna' },
          { type: 'aerobrake', name: 'Duna Aerobrake', deltaV: 0, destination: 'duna' },
        ],
        startBody: 'kerbin',
        endBody: 'duna',
      },
      {
        name: 'Duna Surface Operations',
        maneuvers: [
          { type: 'land', name: 'Landing (with chutes)', deltaV: 360, destination: 'duna' },
          { type: 'ascent', name: 'Ascent to Orbit', deltaV: 1450, origin: 'duna' },
        ],
        startBody: 'duna',
        endBody: 'duna',
      },
      {
        name: 'Return to Kerbin',
        maneuvers: [
          { type: 'transfer', name: 'Trans-Kerbin Injection', deltaV: 1060, origin: 'duna', destination: 'kerbin' },
          { type: 'aerobrake', name: 'Kerbin Reentry', deltaV: 0, destination: 'kerbin' },
        ],
        startBody: 'duna',
        endBody: 'kerbin',
      },
    ],
  },
  {
    id: 'jool-5',
    name: 'Jool-5 Challenge',
    description: 'Land on all 5 Jool moons and return',
    phases: [
      {
        name: 'Launch & Transfer',
        maneuvers: [
          { type: 'launch', name: 'Launch', deltaV: 3400, origin: 'kerbin' },
          { type: 'transfer', name: 'Trans-Jool Injection', deltaV: 1930, origin: 'kerbin', destination: 'jool' },
          { type: 'aerobrake', name: 'Jool Aerobrake', deltaV: 160, destination: 'jool' },
        ],
        startBody: 'kerbin',
        endBody: 'jool',
      },
      {
        name: 'Pol',
        maneuvers: [
          { type: 'transfer', name: 'To Pol', deltaV: 160 },
          { type: 'land', name: 'Pol Landing', deltaV: 290 },
          { type: 'ascent', name: 'Pol Ascent', deltaV: 290 },
        ],
        startBody: 'jool',
        endBody: 'pol',
      },
      {
        name: 'Bop',
        maneuvers: [
          { type: 'transfer', name: 'To Bop', deltaV: 440 },
          { type: 'land', name: 'Bop Landing', deltaV: 440 },
          { type: 'ascent', name: 'Bop Ascent', deltaV: 440 },
        ],
        startBody: 'pol',
        endBody: 'bop',
      },
      {
        name: 'Tylo',
        maneuvers: [
          { type: 'transfer', name: 'To Tylo', deltaV: 1500 },
          { type: 'land', name: 'Tylo Landing', deltaV: 2270 },
          { type: 'ascent', name: 'Tylo Ascent', deltaV: 2270 },
        ],
        startBody: 'bop',
        endBody: 'tylo',
      },
      {
        name: 'Vall',
        maneuvers: [
          { type: 'transfer', name: 'To Vall', deltaV: 1530 },
          { type: 'land', name: 'Vall Landing', deltaV: 860 },
          { type: 'ascent', name: 'Vall Ascent', deltaV: 860 },
        ],
        startBody: 'tylo',
        endBody: 'vall',
      },
      {
        name: 'Laythe',
        maneuvers: [
          { type: 'transfer', name: 'To Laythe', deltaV: 1070 },
          { type: 'aerobrake', name: 'Laythe Aerobrake', deltaV: 0 },
          { type: 'land', name: 'Laythe Landing', deltaV: 0 },
          { type: 'ascent', name: 'Laythe Ascent', deltaV: 2900 },
        ],
        startBody: 'vall',
        endBody: 'laythe',
      },
      {
        name: 'Return',
        maneuvers: [
          { type: 'transfer', name: 'Jool Escape', deltaV: 1930 },
          { type: 'aerobrake', name: 'Kerbin Reentry', deltaV: 0, destination: 'kerbin' },
        ],
        startBody: 'laythe',
        endBody: 'kerbin',
      },
    ],
  },
];

export const useMissionStore = create<MissionStore>()(
  persist(
    (set, get) => ({
      missions: [],
      currentMission: null,
      templates: defaultTemplates,

      createMission: (name: string) => {
        const newMission: Mission = {
          id: generateId(),
          name,
          phases: [],
          totalDeltaV: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          missions: [...state.missions, newMission],
          currentMission: newMission,
        }));
      },

      updateMission: (mission: Mission) => {
        set((state) => ({
          missions: state.missions.map((m) =>
            m.id === mission.id ? { ...mission, updatedAt: Date.now() } : m
          ),
          currentMission:
            state.currentMission?.id === mission.id
              ? { ...mission, updatedAt: Date.now() }
              : state.currentMission,
        }));
      },

      deleteMission: (id: string) => {
        set((state) => ({
          missions: state.missions.filter((m) => m.id !== id),
          currentMission: state.currentMission?.id === id ? null : state.currentMission,
        }));
      },

      setCurrentMission: (mission: Mission | null) => {
        set({ currentMission: mission });
      },

      addPhase: (phase: Omit<MissionPhase, 'id'>) => {
        const { currentMission } = get();
        if (!currentMission) return;

        const newPhase: MissionPhase = {
          ...phase,
          id: generateId(),
          maneuvers: phase.maneuvers.map((m) => ({ ...m, id: generateId() })),
        };

        const updatedMission = {
          ...currentMission,
          phases: [...currentMission.phases, newPhase],
          totalDeltaV: currentMission.totalDeltaV + phase.maneuvers.reduce((sum, m) => sum + m.deltaV, 0),
        };

        get().updateMission(updatedMission);
      },

      removePhase: (phaseId: string) => {
        const { currentMission } = get();
        if (!currentMission) return;

        const phase = currentMission.phases.find((p) => p.id === phaseId);
        if (!phase) return;

        const phaseDeltaV = phase.maneuvers.reduce((sum, m) => sum + m.deltaV, 0);

        const updatedMission = {
          ...currentMission,
          phases: currentMission.phases.filter((p) => p.id !== phaseId),
          totalDeltaV: currentMission.totalDeltaV - phaseDeltaV,
        };

        get().updateMission(updatedMission);
      },

      updatePhase: (phaseId: string, updates: Partial<MissionPhase>) => {
        const { currentMission } = get();
        if (!currentMission) return;

        const updatedMission = {
          ...currentMission,
          phases: currentMission.phases.map((p) =>
            p.id === phaseId ? { ...p, ...updates } : p
          ),
        };

        // Recalculate total delta-v
        updatedMission.totalDeltaV = updatedMission.phases.reduce(
          (sum, phase) => sum + phase.maneuvers.reduce((mSum, m) => mSum + m.deltaV, 0),
          0
        );

        get().updateMission(updatedMission);
      },

      reorderPhases: (fromIndex: number, toIndex: number) => {
        const { currentMission } = get();
        if (!currentMission) return;

        const phases = [...currentMission.phases];
        const [removed] = phases.splice(fromIndex, 1);
        phases.splice(toIndex, 0, removed);

        const updatedMission = {
          ...currentMission,
          phases,
        };

        get().updateMission(updatedMission);
      },

      addManeuver: (phaseId: string, maneuver: Omit<Maneuver, 'id'>) => {
        const { currentMission } = get();
        if (!currentMission) return;

        const newManeuver: Maneuver = {
          ...maneuver,
          id: generateId(),
        };

        const updatedMission = {
          ...currentMission,
          phases: currentMission.phases.map((p) =>
            p.id === phaseId
              ? { ...p, maneuvers: [...p.maneuvers, newManeuver] }
              : p
          ),
          totalDeltaV: currentMission.totalDeltaV + maneuver.deltaV,
        };

        get().updateMission(updatedMission);
      },

      removeManeuver: (phaseId: string, maneuverId: string) => {
        const { currentMission } = get();
        if (!currentMission) return;

        const phase = currentMission.phases.find((p) => p.id === phaseId);
        const maneuver = phase?.maneuvers.find((m) => m.id === maneuverId);
        if (!maneuver) return;

        const updatedMission = {
          ...currentMission,
          phases: currentMission.phases.map((p) =>
            p.id === phaseId
              ? { ...p, maneuvers: p.maneuvers.filter((m) => m.id !== maneuverId) }
              : p
          ),
          totalDeltaV: currentMission.totalDeltaV - maneuver.deltaV,
        };

        get().updateMission(updatedMission);
      },

      updateManeuver: (phaseId: string, maneuverId: string, updates: Partial<Maneuver>) => {
        const { currentMission } = get();
        if (!currentMission) return;

        const phase = currentMission.phases.find((p) => p.id === phaseId);
        const oldManeuver = phase?.maneuvers.find((m) => m.id === maneuverId);
        if (!oldManeuver) return;

        const deltaVDiff = (updates.deltaV ?? oldManeuver.deltaV) - oldManeuver.deltaV;

        const updatedMission = {
          ...currentMission,
          phases: currentMission.phases.map((p) =>
            p.id === phaseId
              ? {
                  ...p,
                  maneuvers: p.maneuvers.map((m) =>
                    m.id === maneuverId ? { ...m, ...updates } : m
                  ),
                }
              : p
          ),
          totalDeltaV: currentMission.totalDeltaV + deltaVDiff,
        };

        get().updateMission(updatedMission);
      },

      loadFromTemplate: (templateId: string) => {
        const template = get().templates.find((t) => t.id === templateId);
        if (!template) return;

        const newMission: Mission = {
          id: generateId(),
          name: template.name,
          phases: template.phases.map((p) => ({
            ...p,
            id: generateId(),
            maneuvers: p.maneuvers.map((m) => ({ ...m, id: generateId() })),
          })),
          totalDeltaV: template.phases.reduce(
            (sum, phase) => sum + phase.maneuvers.reduce((mSum, m) => mSum + m.deltaV, 0),
            0
          ),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          missions: [...state.missions, newMission],
          currentMission: newMission,
        }));
      },

      exportMission: () => {
        const { currentMission } = get();
        if (!currentMission) return '{}';
        return JSON.stringify(currentMission, null, 2);
      },

      importMission: (json: string) => {
        try {
          const mission = JSON.parse(json) as Mission;
          if (!mission.id || !mission.name || !Array.isArray(mission.phases)) {
            return false;
          }

          // Assign new IDs to avoid conflicts
          mission.id = generateId();
          mission.phases = mission.phases.map((p) => ({
            ...p,
            id: generateId(),
            maneuvers: p.maneuvers.map((m) => ({ ...m, id: generateId() })),
          }));
          mission.createdAt = Date.now();
          mission.updatedAt = Date.now();

          set((state) => ({
            missions: [...state.missions, mission],
            currentMission: mission,
          }));

          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'ksp-mission-store',
    }
  )
);
