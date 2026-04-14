/**
 * REST client for the telemetry bridge server's SQLite-backed API.
 * Falls back gracefully when the server is offline.
 */
import { VesselTelemetry } from '../types';
import { VesselFlightStats } from './telemetryDb';

// Matches the server's port; can be overridden for production
const BASE = 'http://localhost:8080';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json() as Promise<T>;
}

/** Returns true if the bridge server's HTTP API is reachable. */
export async function isServerAvailable(): Promise<boolean> {
  try {
    await apiFetch('/api/vessels');
    return true;
  } catch {
    return false;
  }
}

/** Fetch all vessel flight stats from the server DB. */
export async function fetchVesselsFromServer(): Promise<VesselFlightStats[]> {
  return apiFetch<VesselFlightStats[]>('/api/vessels');
}

/** Fetch all snapshots for one vessel from the server DB. */
export async function fetchSnapshotsFromServer(
  vesselName: string,
  sinceMs?: number,
): Promise<VesselTelemetry[]> {
  const params = sinceMs ? `?since=${sinceMs}` : '';
  return apiFetch<VesselTelemetry[]>(
    `/api/vessels/${encodeURIComponent(vesselName)}/snapshots${params}`,
  );
}

/** Wipe all data in the server DB. */
export async function clearServerDb(): Promise<void> {
  await apiFetch('/api/db', { method: 'DELETE' });
}
