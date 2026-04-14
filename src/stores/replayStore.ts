import { create } from 'zustand';
import { VesselTelemetry } from '../types';
import { getSnapshotsForVessel } from '../services/telemetryDb';
import { fetchSnapshotsFromServer, fetchVesselsFromServer, isServerAvailable } from '../services/telemetryServerApi';
import { VesselFlightStats } from '../services/telemetryDb';

export const REPLAY_SPEEDS = [1, 2, 5, 10, 50] as const;
export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number];

interface ReplayState {
  isActive: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  snapshots: VesselTelemetry[];
  currentIndex: number;
  speed: ReplaySpeed;
  selectedVessel: string | null;
  /** Where the loaded snapshots came from */
  dataSource: 'server' | 'indexeddb' | null;
  /** Vessel list loaded for the panel */
  vesselStats: VesselFlightStats[];
  vesselStatsLoading: boolean;
}

interface ReplayActions {
  loadVesselStats: () => Promise<void>;
  loadVessel: (name: string) => Promise<void>;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (index: number) => void;
  stepForward: () => void;
  stepBack: () => void;
  setSpeed: (speed: ReplaySpeed) => void;
  /** Advance one frame — called by the playback interval. */
  advance: () => void;
}

type ReplayStore = ReplayState & ReplayActions;

export const useReplayStore = create<ReplayStore>((set, get) => ({
  isActive: false,
  isPlaying: false,
  isLoading: false,
  snapshots: [],
  currentIndex: 0,
  speed: 1,
  selectedVessel: null,
  dataSource: null,
  vesselStats: [],
  vesselStatsLoading: false,

  loadVesselStats: async () => {
    set({ vesselStatsLoading: true });
    try {
      const serverUp = await isServerAvailable();
      if (serverUp) {
        const stats = await fetchVesselsFromServer();
        set({ vesselStats: stats, vesselStatsLoading: false });
      } else {
        const { getVesselsWithStats } = await import('../services/telemetryDb');
        const stats = await getVesselsWithStats();
        set({ vesselStats: stats, vesselStatsLoading: false });
      }
    } catch (err) {
      console.error('[Replay] loadVesselStats failed:', err);
      set({ vesselStatsLoading: false });
    }
  },

  loadVessel: async (name) => {
    set({ isLoading: true, isPlaying: false, currentIndex: 0, isActive: false });
    try {
      let raw: VesselTelemetry[];
      let source: 'server' | 'indexeddb';
      try {
        raw = await fetchSnapshotsFromServer(name);
        source = 'server';
      } catch {
        raw = await getSnapshotsForVessel(name);
        source = 'indexeddb';
      }
      raw.sort((a, b) => a.timestamp - b.timestamp);
      set({
        snapshots: raw,
        selectedVessel: name,
        currentIndex: 0,
        isActive: raw.length > 0,
        isLoading: false,
        dataSource: source,
      });
    } catch (err) {
      console.error('[Replay] loadVessel failed:', err);
      set({ isLoading: false });
    }
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),

  stop: () => set({ isPlaying: false, currentIndex: 0 }),

  seek: (index) => {
    const { snapshots } = get();
    set({ currentIndex: Math.max(0, Math.min(index, snapshots.length - 1)) });
  },

  stepForward: () => {
    const { currentIndex, snapshots } = get();
    if (currentIndex < snapshots.length - 1) set({ currentIndex: currentIndex + 1 });
  },

  stepBack: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) set({ currentIndex: currentIndex - 1 });
  },

  setSpeed: (speed) => set({ speed }),

  advance: () => {
    const { currentIndex, snapshots } = get();
    if (currentIndex >= snapshots.length - 1) {
      set({ isPlaying: false });
      return;
    }
    set({ currentIndex: currentIndex + 1 });
  },
}));
