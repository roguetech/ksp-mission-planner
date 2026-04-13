import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { landingDeltaV, recommendedTWR, bodyBiomeData } from '../data/biomeCoordinates';
import { celestialBodies } from '../data/bodies';

export interface LandingSite {
  id: string;
  name: string;
  bodyId: string;
  biome: string;
  latitude: number;
  longitude: number;
  notes: string;
  createdAt: number;
  // Calculated values
  landingDeltaV: number;
  recommendedTWR: number;
  difficulty: 'easy' | 'moderate' | 'hard' | 'extreme';
  scienceValue: number;
}

export interface LandingPlan {
  id: string;
  name: string;
  sites: LandingSite[];
  totalDeltaV: number;
  createdAt: number;
  updatedAt: number;
}

interface LandingState {
  landingSites: LandingSite[];
  landingPlans: LandingPlan[];
  selectedBodyId: string;
  selectedBiome: string | null;
  selectedSiteId: string | null;
}

interface LandingActions {
  // Site management
  addLandingSite: (site: Omit<LandingSite, 'id' | 'createdAt' | 'landingDeltaV' | 'recommendedTWR' | 'difficulty' | 'scienceValue'>) => string;
  updateLandingSite: (id: string, updates: Partial<LandingSite>) => void;
  removeLandingSite: (id: string) => void;
  clearAllSites: () => void;

  // Plan management
  createLandingPlan: (name: string, siteIds: string[]) => string;
  updateLandingPlan: (id: string, updates: Partial<LandingPlan>) => void;
  removeLandingPlan: (id: string) => void;
  addSiteToPlan: (planId: string, siteId: string) => void;
  removeSiteFromPlan: (planId: string, siteId: string) => void;

  // Selection
  setSelectedBody: (bodyId: string) => void;
  setSelectedBiome: (biome: string | null) => void;
  setSelectedSite: (siteId: string | null) => void;

  // Calculations
  calculateLandingRequirements: (bodyId: string) => {
    landingDeltaV: number;
    ascentDeltaV: number;
    totalDeltaV: number;
    recommendedTWR: number;
    surfaceGravity: number;
  };

  // Export/Import
  exportSites: () => string;
  importSites: (json: string) => boolean;
}

type LandingStore = LandingState & LandingActions;

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Get difficulty and science value for a biome
const getBiomeInfo = (bodyId: string, biomeName: string) => {
  const biomeData = bodyBiomeData[bodyId];
  if (!biomeData) {
    return { difficulty: 'moderate' as const, scienceValue: 5 };
  }

  const biome = biomeData.biomes.find((b) => b.name === biomeName);
  if (!biome) {
    return { difficulty: 'moderate' as const, scienceValue: 5 };
  }

  return { difficulty: biome.difficulty, scienceValue: biome.scienceValue };
};

export const useLandingStore = create<LandingStore>()(
  persist(
    (set, get) => ({
      landingSites: [],
      landingPlans: [],
      selectedBodyId: 'mun',
      selectedBiome: null,
      selectedSiteId: null,

      addLandingSite: (site) => {
        const id = generateId();
        const biomeInfo = getBiomeInfo(site.bodyId, site.biome);

        const newSite: LandingSite = {
          ...site,
          id,
          createdAt: Date.now(),
          landingDeltaV: landingDeltaV[site.bodyId] || 500,
          recommendedTWR: recommendedTWR[site.bodyId] || 2.0,
          difficulty: biomeInfo.difficulty,
          scienceValue: biomeInfo.scienceValue,
        };

        set((state) => ({
          landingSites: [...state.landingSites, newSite],
        }));

        return id;
      },

      updateLandingSite: (id, updates) => {
        set((state) => ({
          landingSites: state.landingSites.map((site) =>
            site.id === id ? { ...site, ...updates } : site
          ),
        }));
      },

      removeLandingSite: (id) => {
        set((state) => ({
          landingSites: state.landingSites.filter((site) => site.id !== id),
          // Also remove from any plans
          landingPlans: state.landingPlans.map((plan) => ({
            ...plan,
            sites: plan.sites.filter((s) => s.id !== id),
            totalDeltaV: plan.sites
              .filter((s) => s.id !== id)
              .reduce((sum, s) => sum + s.landingDeltaV, 0),
          })),
        }));
      },

      clearAllSites: () => {
        set({ landingSites: [], landingPlans: [] });
      },

      createLandingPlan: (name, siteIds) => {
        const id = generateId();
        const { landingSites } = get();
        const sites = landingSites.filter((s) => siteIds.includes(s.id));
        const totalDeltaV = sites.reduce((sum, s) => sum + s.landingDeltaV, 0);

        const newPlan: LandingPlan = {
          id,
          name,
          sites,
          totalDeltaV,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          landingPlans: [...state.landingPlans, newPlan],
        }));

        return id;
      },

      updateLandingPlan: (id, updates) => {
        set((state) => ({
          landingPlans: state.landingPlans.map((plan) =>
            plan.id === id
              ? {
                  ...plan,
                  ...updates,
                  updatedAt: Date.now(),
                  totalDeltaV: updates.sites
                    ? updates.sites.reduce((sum, s) => sum + s.landingDeltaV, 0)
                    : plan.totalDeltaV,
                }
              : plan
          ),
        }));
      },

      removeLandingPlan: (id) => {
        set((state) => ({
          landingPlans: state.landingPlans.filter((plan) => plan.id !== id),
        }));
      },

      addSiteToPlan: (planId, siteId) => {
        const { landingSites, landingPlans } = get();
        const site = landingSites.find((s) => s.id === siteId);
        const plan = landingPlans.find((p) => p.id === planId);

        if (!site || !plan) return;
        if (plan.sites.some((s) => s.id === siteId)) return;

        set((state) => ({
          landingPlans: state.landingPlans.map((p) =>
            p.id === planId
              ? {
                  ...p,
                  sites: [...p.sites, site],
                  totalDeltaV: p.totalDeltaV + site.landingDeltaV,
                  updatedAt: Date.now(),
                }
              : p
          ),
        }));
      },

      removeSiteFromPlan: (planId, siteId) => {
        set((state) => ({
          landingPlans: state.landingPlans.map((plan) =>
            plan.id === planId
              ? {
                  ...plan,
                  sites: plan.sites.filter((s) => s.id !== siteId),
                  totalDeltaV: plan.sites
                    .filter((s) => s.id !== siteId)
                    .reduce((sum, s) => sum + s.landingDeltaV, 0),
                  updatedAt: Date.now(),
                }
              : plan
          ),
        }));
      },

      setSelectedBody: (bodyId) => {
        set({ selectedBodyId: bodyId, selectedBiome: null });
      },

      setSelectedBiome: (biome) => {
        set({ selectedBiome: biome });
      },

      setSelectedSite: (siteId) => {
        set({ selectedSiteId: siteId });
      },

      calculateLandingRequirements: (bodyId) => {
        const body = celestialBodies[bodyId];
        if (!body) {
          return {
            landingDeltaV: 0,
            ascentDeltaV: 0,
            totalDeltaV: 0,
            recommendedTWR: 2.0,
            surfaceGravity: 0,
          };
        }

        const dv = landingDeltaV[bodyId] || 500;
        const twr = recommendedTWR[bodyId] || 2.0;

        // Ascent is roughly the same as landing for airless bodies
        // For bodies with atmosphere, it can be less (aerobraking) or more (thick atmosphere like Eve)
        let ascentMultiplier = 1.0;
        if (body.physical.hasAtmosphere) {
          // Eve is special - extremely hard to ascend from
          if (bodyId === 'eve') {
            ascentMultiplier = 0.5; // Landing is easier than ascent
          } else {
            ascentMultiplier = 0.7; // Aerobraking helps with landing
          }
        }

        const ascentDeltaV = Math.round(dv / ascentMultiplier);

        return {
          landingDeltaV: dv,
          ascentDeltaV,
          totalDeltaV: dv + ascentDeltaV,
          recommendedTWR: twr,
          surfaceGravity: body.physical.surfaceGravity,
        };
      },

      exportSites: () => {
        const { landingSites, landingPlans } = get();
        return JSON.stringify(
          {
            version: 1,
            exportDate: new Date().toISOString(),
            landingSites,
            landingPlans,
          },
          null,
          2
        );
      },

      importSites: (json) => {
        try {
          const data = JSON.parse(json);

          if (data.landingSites && Array.isArray(data.landingSites)) {
            set({
              landingSites: data.landingSites,
              landingPlans: data.landingPlans || [],
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
      name: 'ksp-landing-store',
    }
  )
);

// Selectors
export const selectSitesForBody = (state: LandingStore, bodyId: string) =>
  state.landingSites.filter((s) => s.bodyId === bodyId);

export const selectSitesForBiome = (state: LandingStore, bodyId: string, biome: string) =>
  state.landingSites.filter((s) => s.bodyId === bodyId && s.biome === biome);

export const selectPlansForBody = (state: LandingStore, bodyId: string) =>
  state.landingPlans.filter((p) => p.sites.some((s) => s.bodyId === bodyId));
