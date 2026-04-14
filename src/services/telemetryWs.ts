/**
 * Module-level WebSocket singleton for KSP telemetry.
 *
 * Lives outside of React so the connection persists when the user switches
 * between tabs.  Components interact via the Zustand store (for state) and
 * the exported connect / disconnect functions (for actions).
 */

import { useTelemetryStore } from '../stores/telemetryStore';
import { useTrackingStore } from '../stores/trackingStore';
import { useScienceStore } from '../stores/scienceStore';
import { VesselTelemetry } from '../types';

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let destroyed = false; // prevents reconnect after an explicit disconnect

// One-shot callback set by requestAllScienceFromGame(); cleared after first use.
let pendingImportCallback: ((newCount: number, rawCount: number) => void) | null = null;

function clearReconnect() {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

export function connectWs(): void {
  // Clean up any existing socket first
  if (ws) {
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    ws.close();
    ws = null;
  }
  clearReconnect();
  destroyed = false;

  const { serverUrl, setConnectionStatus, updateTelemetry } = useTelemetryStore.getState();

  // Normalise URL
  let url = serverUrl.trim();
  if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
    if (url.startsWith('https://')) url = 'wss://' + url.slice(8);
    else if (url.startsWith('http://')) url = 'ws://' + url.slice(7);
    else url = 'ws://' + url;
  }

  setConnectionStatus('connecting');

  try {
    ws = new WebSocket(url);
  } catch {
    setConnectionStatus('error', 'Invalid server URL');
    return;
  }

  ws.onopen = () => {
    console.log('[WS] Connected to', url);
    useTelemetryStore.getState().setConnectionStatus('connected');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data as string);
      if (data.type === 'tracking') {
        console.log('[WS] Tracking update:', data.vessels?.length, 'vessels');
        useTrackingStore.getState().updateVessels(data.vessels);
      } else if (data.type === 'allScience') {
        const rawCount = data.subjects?.length ?? 0;
        console.log('[WS] All science import:', rawCount, 'subjects from server');
        const newCount = useScienceStore.getState().importFromGameData(data.subjects ?? []);
        console.log('[WS] Matched and added:', newCount, 'new entries');
        if (pendingImportCallback) {
          pendingImportCallback(newCount, rawCount);
          pendingImportCallback = null;
        }
      } else {
        updateTelemetry({ ...(data as VesselTelemetry), timestamp: Date.now() });
      }
    } catch (err) {
      console.error('[WS] Failed to parse message:', err);
    }
  };

  ws.onerror = () => {
    useTelemetryStore.getState().setConnectionStatus('error', 'Connection error');
  };

  ws.onclose = (event) => {
    console.log('[WS] Closed:', event.code, event.reason);
    ws = null;

    if (destroyed) return;

    if (event.code !== 1000) {
      useTelemetryStore.getState().setConnectionStatus(
        'error',
        `Disconnected: ${event.reason || 'Connection lost'}`,
      );

      const { autoReconnect } = useTelemetryStore.getState();
      if (autoReconnect) {
        console.log('[WS] Reconnecting in 3 s…');
        reconnectTimer = setTimeout(connectWs, 3000);
      }
    } else {
      useTelemetryStore.getState().setConnectionStatus('disconnected');
    }
  };
}

export function disconnectWs(): void {
  destroyed = true;
  clearReconnect();

  if (ws) {
    ws.close(1000, 'User disconnected');
    ws = null;
  }

  useTelemetryStore.getState().setConnectionStatus('disconnected');
  useTelemetryStore.getState().clearTelemetry();
}

/** True if the socket is currently open. */
export function isWsConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}

/** Send a JSON message to the server (no-op if not connected). */
export function sendWsMessage(payload: object): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

/**
 * Request a full R&D science import from the game.
 * `onComplete` receives (newCount, rawCount) where rawCount is how many subjects
 * the server returned and newCount is how many were actually new/added.
 * Both are -1 if not connected.
 */
export function requestAllScienceFromGame(
  onComplete: (newCount: number, rawCount: number) => void,
): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    onComplete(-1, -1);
    return;
  }
  pendingImportCallback = onComplete;
  ws.send(JSON.stringify({ type: 'requestAllScience' }));
}
