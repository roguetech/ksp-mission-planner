import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { VesselTelemetry } from '../types';

// ─── Schema ──────────────────────────────────────────────────────────────────

interface TelemetryDBSchema extends DBSchema {
  // One record per time-step for flight-path history
  snapshots: {
    key: number; // auto-increment _id
    value: VesselTelemetry & { _id?: number };
    indexes: {
      'by-timestamp': number;
      'by-vessel': string;
    };
  };
  // Latest known telemetry per vessel (upsert on every update)
  vessels: {
    key: string; // vessel name
    value: VesselTelemetry;
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DB_NAME = 'ksp-telemetry';
const DB_VERSION = 1;

// ─── DB singleton ─────────────────────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase<TelemetryDBSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<TelemetryDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<TelemetryDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const snapshots = db.createObjectStore('snapshots', {
          keyPath: '_id',
          autoIncrement: true,
        });
        snapshots.createIndex('by-timestamp', 'timestamp');
        snapshots.createIndex('by-vessel', 'name');

        db.createObjectStore('vessels', { keyPath: 'name' });
      },
    });
  }
  return dbPromise;
}

// ─── Write operations ─────────────────────────────────────────────────────────

/** Persist a flight-path snapshot (throttled by the caller). */
export async function saveSnapshot(telemetry: VesselTelemetry): Promise<void> {
  const db = await getDb();
  // Strip internal _id so IDB assigns a fresh one
  const { _id: _, ...record } = telemetry as VesselTelemetry & { _id?: number };
  await db.put('snapshots', record as VesselTelemetry);
}

/** Upsert latest position for this vessel. */
export async function saveVessel(telemetry: VesselTelemetry): Promise<void> {
  const db = await getDb();
  await db.put('vessels', telemetry);
}

// ─── Read operations ──────────────────────────────────────────────────────────

/** All tracked vessels (last known positions). */
export async function getAllVessels(): Promise<VesselTelemetry[]> {
  const db = await getDb();
  return db.getAll('vessels');
}

/**
 * Snapshots for one vessel, optionally since a timestamp.
 * Ordered ascending by timestamp.
 */
export async function getSnapshotsForVessel(
  vesselName: string,
  sinceMs?: number,
): Promise<VesselTelemetry[]> {
  const db = await getDb();
  const records = await db.getAllFromIndex('snapshots', 'by-vessel', vesselName);
  return sinceMs ? records.filter((r) => r.timestamp >= sinceMs) : records;
}

/** Total number of stored snapshots. */
export async function getSnapshotCount(): Promise<number> {
  const db = await getDb();
  return db.count('snapshots');
}

/** Total number of tracked vessels in DB. */
export async function getVesselCount(): Promise<number> {
  const db = await getDb();
  return db.count('vessels');
}

// ─── Flight stats ─────────────────────────────────────────────────────────────

export interface VesselFlightStats {
  name: string;
  snapshotCount: number;
  firstTimestamp: number;
  lastTimestamp: number;
  bodies: string[]; // unique bodyId values, ordered by first appearance
  latestTelemetry: VesselTelemetry;
}

/**
 * Returns per-vessel flight statistics derived from the snapshots store.
 * Sorted by most-recently-updated vessel first.
 */
export async function getVesselsWithStats(): Promise<VesselFlightStats[]> {
  const db = await getDb();
  const vessels = await db.getAll('vessels');

  const result: VesselFlightStats[] = [];
  for (const vessel of vessels) {
    const snapshots = await db.getAllFromIndex('snapshots', 'by-vessel', vessel.name);
    if (snapshots.length === 0) continue;

    // Preserve body visit order
    const bodyOrder: string[] = [];
    const bodySet = new Set<string>();
    for (const s of snapshots) {
      if (!bodySet.has(s.bodyId)) {
        bodyOrder.push(s.bodyId);
        bodySet.add(s.bodyId);
      }
    }

    const timestamps = snapshots.map((s) => s.timestamp);
    result.push({
      name: vessel.name,
      snapshotCount: snapshots.length,
      firstTimestamp: Math.min(...timestamps),
      lastTimestamp: Math.max(...timestamps),
      bodies: bodyOrder,
      latestTelemetry: vessel,
    });
  }

  return result.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
}

// ─── Maintenance ──────────────────────────────────────────────────────────────

/** Wipe all stored telemetry data. */
export async function clearAll(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['snapshots', 'vessels'], 'readwrite');
  await tx.objectStore('snapshots').clear();
  await tx.objectStore('vessels').clear();
  await tx.done;
}
