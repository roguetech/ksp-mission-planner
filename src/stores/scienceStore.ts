import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ScienceResult, ScienceSituation, VesselTelemetry } from '../types';
import { calculateScienceValue } from '../lib/science';
import { scienceExperiments } from '../data/experiments';
import { celestialBodies } from '../data/bodies';

interface ScienceState {
  collectedScience: ScienceResult[];
  unlockedTech: string[];
}

interface ScienceActions {
  markCollected: (
    experimentId: string,
    bodyId: string,
    biome: string,
    situation: ScienceSituation,
    value: number
  ) => void;
  markTransmitted: (
    experimentId: string,
    bodyId: string,
    biome: string,
    situation: ScienceSituation
  ) => void;
  unmarkCollected: (
    experimentId: string,
    bodyId: string,
    biome: string,
    situation: ScienceSituation
  ) => void;
  clearBodyScience: (bodyId: string) => void;
  clearAllScience: () => void;
  getTotalScience: () => number;
  unlockTech: (techId: string) => void;
  lockTech: (techId: string) => void;
  exportScience: () => string;
  importScience: (json: string) => boolean;
  /**
   * Sync from live telemetry.  Marks experiments as collected for the current
   * vessel's location when those experiments report they have data.  Returns
   * the number of newly-marked entries.
   */
  syncFromTelemetry: (telemetry: VesselTelemetry) => number;
  /**
   * Import all collected science subjects received from the game via kRPC.
   * Each subject has { experimentId, bodyId, situation, biome, value }.
   * The biome is the raw CamelCase string from KSP subject IDs — this function
   * normalises it against the body's known biome list.
   * Returns the number of newly-marked entries.
   */
  importFromGameData: (subjects: GameScienceSubject[]) => number;
}

/** Shape of subjects returned by the Python bridge's get_all_collected_science(). */
export interface GameScienceSubject {
  experimentId: string;
  bodyId: string;
  situation: ScienceSituation;
  biome: string;   // raw CamelCase from KSP subject ID, e.g. "NorthernIceShelf"
  value: number;   // science already recovered to R&D
}

type ScienceStore = ScienceState & ScienceActions;

// ── Telemetry helpers ─────────────────────────────────────────────────────────

/** Altitude (m above sea level) below which a body counts as "space low" */
const SPACE_LOW_ALTITUDE: Record<string, number> = {
  kerbin: 250_000,   mun: 60_000,    minmus: 30_000,
  duna:   140_000,   ike: 50_000,    eve: 400_000,
  gilly:  6_000,     dres: 25_000,   jool: 4_000_000,
  laythe: 200_000,   vall: 90_000,   tylo: 250_000,
  bop:    25_000,    pol: 22_000,    eeloo: 60_000,
  moho:   80_000,
};

/** Map a KSP vessel situation + altitude to a ScienceSituation (null if unmappable). */
export function kspSituationToScience(
  situation: string | undefined,
  altitude: number | undefined,
  bodyId: string,
): ScienceSituation | null {
  switch (situation) {
    case 'prelaunch':
    case 'landed':  return 'landed';
    case 'splashed': return 'splashed';
    case 'flying':
    case 'subOrbital': return 'flying';
    case 'orbiting':
    case 'docked':
    case 'escaping': {
      const threshold = SPACE_LOW_ALTITUDE[bodyId] ?? 250_000;
      return (altitude ?? 0) < threshold ? 'inSpaceLow' : 'inSpaceHigh';
    }
    default: return null;
  }
}

/** Normalise kRPC / KSP subject-ID experiment IDs to our store IDs. */
const EXPERIMENT_ALIASES: Record<string, string> = {
  temperatureScan:    'temperatureScan',
  thermometer:        'temperatureScan',
  barometerScan:      'barometerScan',
  seismicScan:        'seismicScan',
  gravityScan:        'gravityScan',
  atmosphereAnalysis: 'atmosphereAnalysis',
  crewReport:         'crewReport',
  evaReport:          'evaReport',
  surfaceSample:      'surfaceSample',
  mysteryGoo:         'mysteryGoo',
  scienceJr:          'scienceJr',
  // KSP internal ID for the Science Jr. (Materials Study) part
  science_module:     'scienceJr',
};

function normaliseExperimentId(raw: string): string | null {
  const key = raw.trim();
  return EXPERIMENT_ALIASES[key] ?? (scienceExperiments.some(e => e.id === key) ? key : null);
}

export const useScienceStore = create<ScienceStore>()(
  persist(
    (set, get) => ({
      collectedScience: [],
      unlockedTech: ['start'],

      markCollected: (
        experimentId: string,
        bodyId: string,
        biome: string,
        situation: ScienceSituation,
        value: number
      ) => {
        set((state) => {
          // Check if already exists
          const existing = state.collectedScience.find(
            (s) =>
              s.experimentId === experimentId &&
              s.bodyId === bodyId &&
              s.biome === biome &&
              s.situation === situation
          );

          if (existing) {
            // Update existing
            return {
              collectedScience: state.collectedScience.map((s) =>
                s.experimentId === experimentId &&
                s.bodyId === bodyId &&
                s.biome === biome &&
                s.situation === situation
                  ? { ...s, collected: true, value }
                  : s
              ),
            };
          }

          // Add new
          return {
            collectedScience: [
              ...state.collectedScience,
              {
                experimentId,
                bodyId,
                biome,
                situation,
                value,
                collected: true,
                transmitted: false,
              },
            ],
          };
        });
      },

      markTransmitted: (
        experimentId: string,
        bodyId: string,
        biome: string,
        situation: ScienceSituation
      ) => {
        set((state) => ({
          collectedScience: state.collectedScience.map((s) =>
            s.experimentId === experimentId &&
            s.bodyId === bodyId &&
            s.biome === biome &&
            s.situation === situation
              ? { ...s, transmitted: true }
              : s
          ),
        }));
      },

      unmarkCollected: (
        experimentId: string,
        bodyId: string,
        biome: string,
        situation: ScienceSituation
      ) => {
        set((state) => ({
          collectedScience: state.collectedScience.filter(
            (s) =>
              !(
                s.experimentId === experimentId &&
                s.bodyId === bodyId &&
                s.biome === biome &&
                s.situation === situation
              )
          ),
        }));
      },

      clearBodyScience: (bodyId: string) => {
        set((state) => ({
          collectedScience: state.collectedScience.filter((s) => s.bodyId !== bodyId),
        }));
      },

      clearAllScience: () => {
        set({ collectedScience: [] });
      },

      getTotalScience: () => {
        return get().collectedScience.reduce((sum, s) => sum + (s.collected ? s.value : 0), 0);
      },

      unlockTech: (techId: string) => {
        set((state) => ({
          unlockedTech: state.unlockedTech.includes(techId)
            ? state.unlockedTech
            : [...state.unlockedTech, techId],
        }));
      },

      lockTech: (techId: string) => {
        set((state) => ({
          unlockedTech: state.unlockedTech.filter((id) => id !== techId),
        }));
      },

      exportScience: () => {
        const { collectedScience, unlockedTech } = get();
        return JSON.stringify(
          {
            version: 1,
            exportDate: new Date().toISOString(),
            collectedScience,
            unlockedTech,
            totalScience: get().getTotalScience(),
          },
          null,
          2
        );
      },

      importScience: (json: string) => {
        try {
          const data = JSON.parse(json);
          if (data.collectedScience && Array.isArray(data.collectedScience)) {
            set({
              collectedScience: data.collectedScience,
              unlockedTech: data.unlockedTech || ['start'],
            });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      syncFromTelemetry: (telemetry: VesselTelemetry) => {
        const bodyId = telemetry.bodyId?.toLowerCase() ?? 'kerbin';
        const biome  = telemetry.biome ?? '';
        const sciSit = kspSituationToScience(telemetry.situation, telemetry.altitude, bodyId);
        if (!sciSit) return 0;

        const { collectedScience } = get();
        const toMark: ScienceResult[] = [];

        // ── Mark experiments that the vessel reports as having data ──────────
        const vesselExps = telemetry.vesselExperiments ?? [];
        for (const ve of vesselExps) {
          if (!ve.hasData || !ve.experimentId) continue;
          const expId = normaliseExperimentId(ve.experimentId);
          if (!expId) continue;
          const exp = scienceExperiments.find(e => e.id === expId);
          if (!exp || !exp.situations.includes(sciSit)) continue;

          const effectiveBiome = (sciSit === 'landed' || sciSit === 'splashed') ? biome : '';
          const alreadyMarked = collectedScience.some(
            s => s.experimentId === expId && s.bodyId === bodyId &&
                 s.situation === sciSit && s.biome === effectiveBiome && s.collected,
          );
          if (alreadyMarked) continue;

          const { baseValue } = calculateScienceValue(expId, bodyId, sciSit, effectiveBiome || null);
          toMark.push({
            experimentId: expId,
            bodyId,
            biome: effectiveBiome,
            situation: sciSit,
            value: baseValue,
            collected: true,
            transmitted: false,
          });
        }

        if (toMark.length === 0) return 0;

        set(state => {
          let updated = [...state.collectedScience];
          for (const entry of toMark) {
            const idx = updated.findIndex(
              s => s.experimentId === entry.experimentId && s.bodyId === entry.bodyId &&
                   s.situation === entry.situation && s.biome === entry.biome,
            );
            if (idx >= 0) updated[idx] = { ...updated[idx], collected: true, value: entry.value };
            else updated = [...updated, entry];
          }
          return { collectedScience: updated };
        });

        return toMark.length;
      },

      importFromGameData: (subjects) => {
        const { collectedScience } = get();
        const toMark: ScienceResult[] = [];

        for (const subj of subjects) {
          // Map KSP internal IDs (e.g. "science_module") to our store IDs (e.g. "scienceJr")
          const expId = normaliseExperimentId(subj.experimentId);
          if (!expId) continue;
          const exp = scienceExperiments.find(e => e.id === expId);
          if (!exp) continue;
          if (!exp.situations.includes(subj.situation)) continue;

          // Normalise the CamelCase biome from the KSP subject ID against the
          // body's known biome list (e.g. "NorthernIceShelf" → "Northern Ice Shelf").
          const body = celestialBodies[subj.bodyId];
          let resolvedBiome = subj.biome;
          if (subj.biome && body?.biomes) {
            const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
            const rawNorm = norm(subj.biome);
            const match = body.biomes.find(b => norm(b) === rawNorm);
            if (match) resolvedBiome = match;
          }

          // Space / flying situations are global — no biome
          if (subj.situation === 'inSpaceLow' || subj.situation === 'inSpaceHigh' || subj.situation === 'flying') {
            resolvedBiome = '';
          }

          const already = collectedScience.some(
            s =>
              s.experimentId === expId &&
              s.bodyId === subj.bodyId &&
              s.situation === subj.situation &&
              s.biome === resolvedBiome &&
              s.collected,
          );
          if (already) continue;

          toMark.push({
            experimentId: expId,
            bodyId: subj.bodyId,
            situation: subj.situation,
            biome: resolvedBiome,
            value: subj.value,
            collected: true,
            transmitted: false,
          });
        }

        if (toMark.length === 0) return 0;

        set(state => {
          let updated = [...state.collectedScience];
          for (const entry of toMark) {
            const idx = updated.findIndex(
              s =>
                s.experimentId === entry.experimentId &&
                s.bodyId === entry.bodyId &&
                s.situation === entry.situation &&
                s.biome === entry.biome,
            );
            if (idx >= 0) updated[idx] = { ...updated[idx], collected: true, value: entry.value };
            else updated = [...updated, entry];
          }
          return { collectedScience: updated };
        });

        return toMark.length;
      },
    }),
    {
      name: 'ksp-science-store',
    }
  )
);

// Selectors
export const selectBodyProgress = (state: ScienceStore, bodyId: string) => {
  return state.collectedScience.filter((s) => s.bodyId === bodyId);
};

export const selectExperimentStatus = (
  state: ScienceStore,
  experimentId: string,
  bodyId: string,
  biome: string,
  situation: ScienceSituation
) => {
  return state.collectedScience.find(
    (s) =>
      s.experimentId === experimentId &&
      s.bodyId === bodyId &&
      s.biome === biome &&
      s.situation === situation
  );
};
