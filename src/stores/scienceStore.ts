import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ScienceResult, ScienceSituation } from '../types';

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
}

type ScienceStore = ScienceState & ScienceActions;

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
