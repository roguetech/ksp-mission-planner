import { create } from 'zustand';
import { TrackedVessel } from '../types';

interface TrackingState {
  vessels: TrackedVessel[];
  targetVesselName: string | null;
  lastUpdate: number | null;
}

interface TrackingActions {
  updateVessels: (vessels: TrackedVessel[]) => void;
  setTarget: (name: string | null) => void;
  clearTracking: () => void;
}

export const useTrackingStore = create<TrackingState & TrackingActions>((set) => ({
  vessels: [],
  targetVesselName: null,
  lastUpdate: null,

  updateVessels: (vessels) =>
    set({ vessels, lastUpdate: Date.now() }),

  setTarget: (name) =>
    set({ targetVesselName: name }),

  clearTracking: () =>
    set({ vessels: [], targetVesselName: null, lastUpdate: null }),
}));
