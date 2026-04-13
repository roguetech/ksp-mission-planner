import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppSettings } from '../types';

interface SettingsState extends AppSettings {
  currentTab: string;
  selectedBody: string;
  transferOrigin: string;
  transferDestination: string;
}

interface SettingsActions {
  updateSettings: (settings: Partial<AppSettings>) => void;
  setCurrentTab: (tab: string) => void;
  setSelectedBody: (bodyId: string) => void;
  setTransferOrigin: (bodyId: string) => void;
  setTransferDestination: (bodyId: string) => void;
  resetSettings: () => void;
}

type SettingsStore = SettingsState & SettingsActions;

const defaultSettings: SettingsState = {
  darkMode: true,
  showAdvancedStats: false,
  defaultBody: 'kerbin',
  useMetricUnits: true,
  currentTab: 'deltaV',
  selectedBody: 'kerbin',
  transferOrigin: 'kerbin',
  transferDestination: 'duna',
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,

      updateSettings: (settings: Partial<AppSettings>) => {
        set((state) => ({ ...state, ...settings }));
      },

      setCurrentTab: (tab: string) => {
        set({ currentTab: tab });
      },

      setSelectedBody: (bodyId: string) => {
        set({ selectedBody: bodyId });
      },

      setTransferOrigin: (bodyId: string) => {
        set({ transferOrigin: bodyId });
      },

      setTransferDestination: (bodyId: string) => {
        set({ transferDestination: bodyId });
      },

      resetSettings: () => {
        set(defaultSettings);
      },
    }),
    {
      name: 'ksp-settings-store',
    }
  )
);
