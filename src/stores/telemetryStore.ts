import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { VesselTelemetry, TelemetryConnection } from '../types';

interface TelemetryState {
  // Connection
  connection: TelemetryConnection;

  // Current telemetry data
  telemetry: VesselTelemetry | null;

  // History for graphs (last 60 seconds of data)
  telemetryHistory: VesselTelemetry[];
  historyMaxLength: number;

  // Settings
  serverUrl: string;
  autoReconnect: boolean;
  updateInterval: number; // ms
}

interface TelemetryActions {
  // Connection management
  setServerUrl: (url: string) => void;
  setConnectionStatus: (status: TelemetryConnection['status'], error?: string) => void;

  // Telemetry updates
  updateTelemetry: (telemetry: VesselTelemetry) => void;
  clearTelemetry: () => void;

  // Settings
  setAutoReconnect: (enabled: boolean) => void;
  setUpdateInterval: (interval: number) => void;

  // Helpers
  getResourcePercentage: (resource: 'liquidFuel' | 'oxidizer' | 'monopropellant' | 'electricCharge') => number;
  getDeltaVPercentage: () => number;
}

type TelemetryStore = TelemetryState & TelemetryActions;

const DEFAULT_SERVER_URL = 'ws://localhost:8080';

export const useTelemetryStore = create<TelemetryStore>()(
  persist(
    (set, get) => ({
      // Initial state
      connection: {
        status: 'disconnected',
        serverUrl: DEFAULT_SERVER_URL,
        lastUpdate: null,
        error: null,
      },
      telemetry: null,
      telemetryHistory: [],
      historyMaxLength: 120, // 60 seconds at 2 updates/sec
      serverUrl: DEFAULT_SERVER_URL,
      autoReconnect: true,
      updateInterval: 500,

      // Connection management
      setServerUrl: (url) => {
        set({
          serverUrl: url,
          connection: {
            ...get().connection,
            serverUrl: url,
          },
        });
      },

      setConnectionStatus: (status, error) => {
        set({
          connection: {
            ...get().connection,
            status,
            error: error || null,
            lastUpdate: status === 'connected' ? Date.now() : get().connection.lastUpdate,
          },
        });
      },

      // Telemetry updates
      updateTelemetry: (telemetry) => {
        const { telemetryHistory, historyMaxLength } = get();

        // Add to history, keeping only recent entries
        const newHistory = [...telemetryHistory, telemetry];
        if (newHistory.length > historyMaxLength) {
          newHistory.shift();
        }

        set({
          telemetry,
          telemetryHistory: newHistory,
          connection: {
            ...get().connection,
            lastUpdate: Date.now(),
            status: 'connected',
          },
        });
      },

      clearTelemetry: () => {
        set({
          telemetry: null,
          telemetryHistory: [],
        });
      },

      // Settings
      setAutoReconnect: (enabled) => {
        set({ autoReconnect: enabled });
      },

      setUpdateInterval: (interval) => {
        set({ updateInterval: interval });
      },

      // Helpers
      getResourcePercentage: (resource) => {
        const { telemetry } = get();
        if (!telemetry) return 0;

        const current = telemetry[resource];
        const max = telemetry[`${resource}Max` as keyof VesselTelemetry] as number;

        if (!max || max === 0) return 0;
        return (current / max) * 100;
      },

      getDeltaVPercentage: () => {
        const { telemetry } = get();
        if (!telemetry || !telemetry.deltaVTotal) return 0;
        return (telemetry.deltaVRemaining / telemetry.deltaVTotal) * 100;
      },
    }),
    {
      name: 'ksp-telemetry-store',
      // Only persist settings, not live data
      partialize: (state) => ({
        serverUrl: state.serverUrl,
        autoReconnect: state.autoReconnect,
        updateInterval: state.updateInterval,
      }),
    }
  )
);

// Selectors
export const selectIsConnected = (state: TelemetryStore) =>
  state.connection.status === 'connected';

export const selectVesselPosition = (state: TelemetryStore) => {
  if (!state.telemetry) return null;
  return {
    bodyId: state.telemetry.bodyId,
    latitude: state.telemetry.latitude,
    longitude: state.telemetry.longitude,
    altitude: state.telemetry.altitude,
  };
};

export const selectOrbitalParams = (state: TelemetryStore) => {
  if (!state.telemetry) return null;
  return {
    apoapsis: state.telemetry.apoapsis,
    periapsis: state.telemetry.periapsis,
    inclination: state.telemetry.inclination,
    eccentricity: state.telemetry.eccentricity,
    orbitalPeriod: state.telemetry.orbitalPeriod,
  };
};
