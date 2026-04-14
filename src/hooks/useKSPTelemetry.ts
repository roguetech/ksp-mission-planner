import { useTelemetryStore } from '../stores/telemetryStore';
import { connectWs, disconnectWs } from '../services/telemetryWs';
import { VesselTelemetry } from '../types';

/**
 * Thin reactive wrapper around the module-level WebSocket singleton.
 *
 * The actual WebSocket lives in `src/services/telemetryWs.ts` so it is NOT
 * tied to any component's lifecycle and survives tab switches.
 */
export function useKSPTelemetry() {
  const { connection } = useTelemetryStore();

  return {
    connect: connectWs,
    disconnect: disconnectWs,
    isConnected: connection.status === 'connected',
    isConnecting: connection.status === 'connecting',
    connectionStatus: connection.status,
    error: connection.error,
  };
}

// Hook for subscribing to telemetry updates with a specific interval
export function useTelemetryUpdates(_intervalMs: number = 500) {
  const { telemetry, telemetryHistory } = useTelemetryStore();

  return {
    telemetry,
    history: telemetryHistory,
    hasData: telemetry !== null,
  };
}
