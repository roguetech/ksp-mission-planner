import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RocketDesign, Stage, StagePart } from '../types';
import { calculateRocketStats } from '../lib/deltaV';

interface RocketState {
  designs: RocketDesign[];
  currentDesign: RocketDesign | null;
}

interface RocketActions {
  createDesign: (name: string) => void;
  updateDesign: (design: RocketDesign) => void;
  deleteDesign: (id: string) => void;
  duplicateDesign: (id: string) => void;
  setCurrentDesign: (design: RocketDesign | null) => void;
  addStage: () => void;
  removeStage: (stageId: string) => void;
  reorderStages: (fromIndex: number, toIndex: number) => void;
  addPartToStage: (stageId: string, partId: string) => void;
  removePartFromStage: (stageId: string, partId: string) => void;
  updatePartQuantity: (stageId: string, partId: string, quantity: number) => void;
  clearStage: (stageId: string) => void;
  exportDesign: () => string;
  importDesign: (json: string) => boolean;
  exportAllDesigns: () => string;
  importAllDesigns: (json: string) => boolean;
}

type RocketStore = RocketState & RocketActions;

const generateId = () => Math.random().toString(36).substring(2, 9);

const createEmptyStage = (): Stage => ({
  id: generateId(),
  parts: [],
  isActive: true,
});

export const useRocketStore = create<RocketStore>()(
  persist(
    (set, get) => ({
      designs: [],
      currentDesign: null,

      createDesign: (name: string) => {
        const newDesign: RocketDesign = {
          id: generateId(),
          name,
          stages: [createEmptyStage()],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          designs: [...state.designs, newDesign],
          currentDesign: newDesign,
        }));
      },

      updateDesign: (design: RocketDesign) => {
        set((state) => ({
          designs: state.designs.map((d) =>
            d.id === design.id ? { ...design, updatedAt: Date.now() } : d
          ),
          currentDesign:
            state.currentDesign?.id === design.id
              ? { ...design, updatedAt: Date.now() }
              : state.currentDesign,
        }));
      },

      deleteDesign: (id: string) => {
        set((state) => ({
          designs: state.designs.filter((d) => d.id !== id),
          currentDesign: state.currentDesign?.id === id ? null : state.currentDesign,
        }));
      },

      duplicateDesign: (id: string) => {
        const { designs } = get();
        const original = designs.find((d) => d.id === id);
        if (!original) return;

        const duplicate: RocketDesign = {
          ...original,
          id: generateId(),
          name: `${original.name} (Copy)`,
          stages: original.stages.map((stage) => ({
            ...stage,
            id: generateId(),
            parts: [...stage.parts],
          })),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          designs: [...state.designs, duplicate],
          currentDesign: duplicate,
        }));
      },

      setCurrentDesign: (design: RocketDesign | null) => {
        set({ currentDesign: design });
      },

      addStage: () => {
        const { currentDesign } = get();
        if (!currentDesign) return;

        const updatedDesign = {
          ...currentDesign,
          stages: [...currentDesign.stages, createEmptyStage()],
        };

        get().updateDesign(updatedDesign);
      },

      removeStage: (stageId: string) => {
        const { currentDesign } = get();
        if (!currentDesign) return;

        // Don't remove the last stage
        if (currentDesign.stages.length <= 1) return;

        const updatedDesign = {
          ...currentDesign,
          stages: currentDesign.stages.filter((s) => s.id !== stageId),
        };

        get().updateDesign(updatedDesign);
      },

      reorderStages: (fromIndex: number, toIndex: number) => {
        const { currentDesign } = get();
        if (!currentDesign) return;

        const stages = [...currentDesign.stages];
        const [removed] = stages.splice(fromIndex, 1);
        stages.splice(toIndex, 0, removed);

        const updatedDesign = {
          ...currentDesign,
          stages,
        };

        get().updateDesign(updatedDesign);
      },

      addPartToStage: (stageId: string, partId: string) => {
        const { currentDesign } = get();
        if (!currentDesign) return;

        const updatedDesign = {
          ...currentDesign,
          stages: currentDesign.stages.map((stage) => {
            if (stage.id !== stageId) return stage;

            const existingPart = stage.parts.find((p) => p.partId === partId);
            if (existingPart) {
              // Increment quantity
              return {
                ...stage,
                parts: stage.parts.map((p) =>
                  p.partId === partId ? { ...p, quantity: p.quantity + 1 } : p
                ),
              };
            } else {
              // Add new part
              return {
                ...stage,
                parts: [...stage.parts, { partId, quantity: 1 }],
              };
            }
          }),
        };

        get().updateDesign(updatedDesign);
      },

      removePartFromStage: (stageId: string, partId: string) => {
        const { currentDesign } = get();
        if (!currentDesign) return;

        const updatedDesign = {
          ...currentDesign,
          stages: currentDesign.stages.map((stage) => {
            if (stage.id !== stageId) return stage;

            return {
              ...stage,
              parts: stage.parts.filter((p) => p.partId !== partId),
            };
          }),
        };

        get().updateDesign(updatedDesign);
      },

      updatePartQuantity: (stageId: string, partId: string, quantity: number) => {
        const { currentDesign } = get();
        if (!currentDesign) return;

        if (quantity <= 0) {
          get().removePartFromStage(stageId, partId);
          return;
        }

        const updatedDesign = {
          ...currentDesign,
          stages: currentDesign.stages.map((stage) => {
            if (stage.id !== stageId) return stage;

            return {
              ...stage,
              parts: stage.parts.map((p) =>
                p.partId === partId ? { ...p, quantity } : p
              ),
            };
          }),
        };

        get().updateDesign(updatedDesign);
      },

      clearStage: (stageId: string) => {
        const { currentDesign } = get();
        if (!currentDesign) return;

        const updatedDesign = {
          ...currentDesign,
          stages: currentDesign.stages.map((stage) =>
            stage.id === stageId ? { ...stage, parts: [] } : stage
          ),
        };

        get().updateDesign(updatedDesign);
      },

      exportDesign: () => {
        const { currentDesign } = get();
        if (!currentDesign) return '{}';

        // Include calculated stats in export
        const stats = calculateRocketStats(currentDesign);

        return JSON.stringify(
          {
            design: currentDesign,
            stats: {
              totalDeltaV: stats.totalDeltaV,
              totalMass: stats.totalMass,
              stageCount: stats.stages.length,
            },
          },
          null,
          2
        );
      },

      importDesign: (json: string) => {
        try {
          const data = JSON.parse(json);
          const design = data.design || data;

          if (!design.id || !design.name || !Array.isArray(design.stages)) {
            return false;
          }

          // Assign new IDs to avoid conflicts
          const newDesign: RocketDesign = {
            ...design,
            id: generateId(),
            stages: design.stages.map((stage: Stage) => ({
              ...stage,
              id: generateId(),
              parts: [...(stage.parts || [])],
            })),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          set((state) => ({
            designs: [...state.designs, newDesign],
            currentDesign: newDesign,
          }));

          return true;
        } catch {
          return false;
        }
      },

      exportAllDesigns: () => {
        const { designs } = get();
        return JSON.stringify(
          {
            version: 1,
            exportDate: new Date().toISOString(),
            designs,
          },
          null,
          2
        );
      },

      importAllDesigns: (json: string) => {
        try {
          const data = JSON.parse(json);
          const designs = data.designs || data;

          if (!Array.isArray(designs)) {
            return false;
          }

          const newDesigns: RocketDesign[] = designs.map((design: RocketDesign) => ({
            ...design,
            id: generateId(),
            stages: design.stages.map((stage: Stage) => ({
              ...stage,
              id: generateId(),
              parts: [...(stage.parts || [])],
            })),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }));

          set((state) => ({
            designs: [...state.designs, ...newDesigns],
          }));

          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'ksp-rocket-store',
    }
  )
);

// Selectors
export const selectCurrentDesignStats = (state: RocketStore) => {
  if (!state.currentDesign) return null;
  return calculateRocketStats(state.currentDesign);
};
