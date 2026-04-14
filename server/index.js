/**
 * KSP Telemetry Bridge Server
 *
 * Connects to KSP via kRPC, persists all telemetry to SQLite, broadcasts
 * live data via WebSocket, and exposes a REST API for flight replay.
 *
 * Ports (single HTTP server, both WebSocket + REST on same port):
 *   ws://localhost:8080   – live telemetry WebSocket
 *   http://localhost:8080 – REST API (see endpoints below)
 *
 * REST endpoints:
 *   GET  /api/vessels                       – list vessels with flight stats
 *   GET  /api/vessels/:name/snapshots       – all snapshots for a vessel
 *   DELETE /api/db                          – wipe all stored data
 */

import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Configuration ────────────────────────────────────────────────────────────

const CONFIG = {
  port: parseInt(process.env.WS_PORT || '8080'),
  krpcHost: process.env.KRPC_HOST || 'localhost',
  krpcRpcPort: parseInt(process.env.KRPC_RPC_PORT || '50000'),
  krpcStreamPort: parseInt(process.env.KRPC_STREAM_PORT || '50001'),
  updateInterval: parseInt(process.env.UPDATE_INTERVAL || '500'),
  mockMode: process.env.MOCK_MODE === 'true',
  dbPath: process.env.DB_PATH || path.join(__dirname, 'telemetry.db'),
};

console.log('KSP Telemetry Bridge Server');
console.log('===========================');
console.log(`Port:            ${CONFIG.port} (WebSocket + HTTP API)`);
console.log(`kRPC:            ${CONFIG.krpcHost}:${CONFIG.krpcRpcPort}`);
console.log(`Update interval: ${CONFIG.updateInterval}ms`);
console.log(`Mock mode:       ${CONFIG.mockMode}`);
console.log(`Database:        ${CONFIG.dbPath}`);
console.log('');

// ─── SQLite setup ─────────────────────────────────────────────────────────────

const db = new Database(CONFIG.dbPath);
db.pragma('journal_mode = WAL');   // write-ahead log — safe & fast
db.pragma('synchronous = NORMAL'); // balance durability vs speed

db.exec(`
  CREATE TABLE IF NOT EXISTS snapshots (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    vessel_name  TEXT    NOT NULL,
    body_id      TEXT    NOT NULL,
    timestamp    INTEGER NOT NULL,
    data         TEXT    NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_snap_vessel    ON snapshots (vessel_name);
  CREATE INDEX IF NOT EXISTS idx_snap_timestamp ON snapshots (timestamp);

  CREATE TABLE IF NOT EXISTS vessels (
    name  TEXT PRIMARY KEY,
    data  TEXT NOT NULL
  );
`);

// Prepared statements
const stmtInsertSnapshot = db.prepare(
  'INSERT INTO snapshots (vessel_name, body_id, timestamp, data) VALUES (?,?,?,?)'
);
const stmtUpsertVessel = db.prepare(
  'INSERT OR REPLACE INTO vessels (name, data) VALUES (?,?)'
);

/** Persist one telemetry frame to SQLite (synchronous — fine on a background loop). */
function saveTelemetry(telemetry) {
  const json = JSON.stringify(telemetry);
  stmtInsertSnapshot.run(telemetry.name, telemetry.bodyId, telemetry.timestamp, json);
  stmtUpsertVessel.run(telemetry.name, json);
}

// ─── HTTP + WebSocket server ──────────────────────────────────────────────────

const httpServer = http.createServer((req, res) => {
  // CORS headers so the Vite dev server can call the API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${CONFIG.port}`);

  // GET /api/vessels
  if (req.method === 'GET' && url.pathname === '/api/vessels') {
    try {
      const vessels = db.prepare('SELECT name, data FROM vessels').all();
      const result = vessels.map((row) => {
        const latest = JSON.parse(row.data);
        const stats = db.prepare(`
          SELECT COUNT(*) AS count, MIN(timestamp) AS first, MAX(timestamp) AS last
          FROM snapshots WHERE vessel_name = ?
        `).get(row.name);

        // Ordered unique body IDs (by first appearance)
        const bodyRows = db.prepare(`
          SELECT DISTINCT body_id FROM snapshots WHERE vessel_name = ?
          ORDER BY MIN(id)
        `).all(row.name);

        return {
          name: row.name,
          snapshotCount: stats.count,
          firstTimestamp: stats.first,
          lastTimestamp: stats.last,
          bodies: bodyRows.map((b) => b.body_id),
          latestTelemetry: latest,
        };
      });
      result.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
      sendJson(res, 200, result);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // GET /api/vessels/:name/snapshots
  const snapMatch = url.pathname.match(/^\/api\/vessels\/(.+)\/snapshots$/);
  if (req.method === 'GET' && snapMatch) {
    try {
      const vesselName = decodeURIComponent(snapMatch[1]);
      const since = url.searchParams.get('since');

      let rows;
      if (since) {
        rows = db.prepare(
          'SELECT data FROM snapshots WHERE vessel_name = ? AND timestamp >= ? ORDER BY timestamp ASC'
        ).all(vesselName, parseInt(since));
      } else {
        rows = db.prepare(
          'SELECT data FROM snapshots WHERE vessel_name = ? ORDER BY timestamp ASC'
        ).all(vesselName);
      }

      const snapshots = rows.map((r) => JSON.parse(r.data));
      sendJson(res, 200, snapshots);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // DELETE /api/db
  if (req.method === 'DELETE' && url.pathname === '/api/db') {
    try {
      db.exec('DELETE FROM snapshots; DELETE FROM vessels;');
      sendJson(res, 200, { ok: true });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 404
  sendJson(res, 404, { error: 'Not found' });
});

function sendJson(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}

const wss = new WebSocketServer({ server: httpServer });
const clients = new Set();
let lastTrackingSnapshot = null;

wss.on('connection', (ws) => {
  console.log('Web client connected');
  clients.add(ws);

  // Send tracking snapshot immediately so the client doesn't wait up to 2 s
  if (CONFIG.mockMode) {
    ws.send(JSON.stringify(generateMockTracking()));
  } else if (lastTrackingSnapshot) {
    ws.send(JSON.stringify(lastTrackingSnapshot));
  }

  ws.on('close', () => { console.log('Web client disconnected'); clients.delete(ws); });
  ws.on('error', () => clients.delete(ws));
});

function broadcast(data) {
  if (data.type === 'tracking') lastTrackingSnapshot = data;
  const json = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) client.send(json);
  }
}

httpServer.listen(CONFIG.port, () => {
  console.log(`Server listening on port ${CONFIG.port}`);
  console.log(`  WebSocket: ws://localhost:${CONFIG.port}`);
  console.log(`  REST API:  http://localhost:${CONFIG.port}/api/vessels`);
  console.log('');
});

// ─── Mock telemetry ───────────────────────────────────────────────────────────

// Kerbin constants
const KERBIN_MU = 3.5316e12;   // m³/s²
const KERBIN_R  = 600000;      // m

function meanMotion(sma) { return Math.sqrt(KERBIN_MU / sma ** 3); }

function mockTrackedVessel(name, vesselType, sma, ecc, inc, raan, argPe, startAngle) {
  const time = Date.now() / 1000;
  const n = meanMotion(sma);
  const trueAnomaly = ((startAngle + n * time * 180 / Math.PI) % 360 + 360) % 360;
  const theta = trueAnomaly * Math.PI / 180;
  const r = sma * (1 - ecc * ecc) / (1 + ecc * Math.cos(theta));
  const period = 2 * Math.PI * Math.sqrt(sma ** 3 / KERBIN_MU);
  const orbSpeed = Math.sqrt(KERBIN_MU * (2 / r - 1 / sma));
  return {
    name,
    vesselType,
    situation: 'orbiting',
    bodyId: 'kerbin',
    bodyName: 'Kerbin',
    semiMajorAxis: sma,
    apoapsis: sma * (1 + ecc) - KERBIN_R,
    periapsis: sma * (1 - ecc) - KERBIN_R,
    eccentricity: ecc,
    inclination: inc,
    argumentOfPeriapsis: argPe,
    longitudeOfAscendingNode: raan,
    trueAnomaly,
    meanAnomaly: trueAnomaly, // close enough for mock
    orbitalPeriod: period,
    timeToApoapsis: period / 2,
    timeToPeriapsis: period / 2,
    orbitalSpeed: orbSpeed,
    latitude: Math.sin(inc * Math.PI / 180) * Math.sin(theta) * 90,
    longitude: ((raan + argPe + trueAnomaly) % 360 + 360) % 360 - 180,
    altitude: r - KERBIN_R,
    timestamp: Date.now(),
  };
}

function generateMockTelemetry() {
  const time = Date.now() / 1000;
  // Active vessel: 80 km equatorial orbit
  const sma = KERBIN_R + 80000;
  const n = meanMotion(sma);
  const trueAnomaly = (n * time * 180 / Math.PI) % 360;
  const altitude = 75000 + Math.sin(time / 100) * 5000;
  const speed = 2200 + Math.sin(time / 50) * 100;
  return {
    name: 'Mock Vessel',
    type: 'ship',
    situation: 'orbiting',
    missionTime: Math.floor(time % 86400),
    bodyId: 'kerbin',
    bodyName: 'Kerbin',
    latitude: Math.sin(time / 200) * 5,
    longitude: (time * 2) % 360 - 180,
    altitude,
    surfaceAltitude: altitude,
    surfaceSpeed: speed,
    orbitalSpeed: speed + 50,
    verticalSpeed: Math.sin(time / 30) * 10,
    heading: (time * 5) % 360,
    pitch: Math.sin(time / 40) * 5,
    apoapsis: 85000,
    periapsis: 75000,
    inclination: 0.5,
    eccentricity: 0.007,
    semiMajorAxis: sma,
    trueAnomaly,
    argumentOfPeriapsis: 0,
    longitudeOfAscendingNode: 0,
    orbitalPeriod: 2 * Math.PI * Math.sqrt(sma ** 3 / KERBIN_MU),
    timeToApoapsis: 1350 - (time % 2700),
    timeToPeriapsis: 675 - (time % 2700),
    liquidFuel: Math.max(0, 800 - (time % 200)),
    liquidFuelMax: 1000,
    oxidizer: Math.max(0, 980 - (time % 250)),
    oxidizerMax: 1200,
    monopropellant: 50,
    monopropellantMax: 100,
    electricCharge: 1000 - Math.sin(time / 10) * 50,
    electricChargeMax: 1000,
    currentTWR: 0,
    maxTWR: 1.8,
    deltaVRemaining: Math.max(0, 2500 - (time % 500)),
    deltaVTotal: 3500,
    currentStage: 2,
    totalStages: 3,
    crewCount: 1,
    crewCapacity: 3,
    timestamp: Date.now(),
  };
}

function generateMockTracking() {
  return {
    type: 'tracking',
    vessels: [
      mockTrackedVessel('Station Alpha',   'Station', KERBIN_R + 250000, 0,     0,  0,   0,  60),
      mockTrackedVessel('Relay Sat I',     'Probe',   KERBIN_R + 100000, 0.01, 15,  30,  0, 120),
      mockTrackedVessel('Polar Observer',  'Probe',   KERBIN_R + 200000, 0,    87,  90,  0, 200),
      mockTrackedVessel('Docking Target',  'Ship',    KERBIN_R +  80000, 0.005, 5,   0, 20,   0),
      // Also include the active mock vessel in the tracking list
      {
        name: 'Mock Vessel',
        vesselType: 'Ship',
        situation: 'orbiting',
        bodyId: 'kerbin', bodyName: 'Kerbin',
        semiMajorAxis: KERBIN_R + 80000,
        apoapsis: 85000, periapsis: 75000,
        eccentricity: 0.007, inclination: 0.5,
        argumentOfPeriapsis: 0, longitudeOfAscendingNode: 0,
        trueAnomaly: (meanMotion(KERBIN_R + 80000) * Date.now() / 1000 * 180 / Math.PI) % 360,
        meanAnomaly: 0, orbitalPeriod: 2 * Math.PI * Math.sqrt((KERBIN_R + 80000) ** 3 / KERBIN_MU),
        timeToApoapsis: 0, timeToPeriapsis: 0,
        orbitalSpeed: 2253, latitude: 0, longitude: 0,
        altitude: 80000, timestamp: Date.now(),
      },
    ],
  };
}

if (CONFIG.mockMode) {
  console.log('Starting in MOCK MODE — generating fake telemetry\n');
  setInterval(() => {
    const telemetry = generateMockTelemetry();
    saveTelemetry(telemetry);
    if (clients.size > 0) broadcast(telemetry);
  }, CONFIG.updateInterval);

  // Tracking station update at 2 s
  setInterval(() => {
    if (clients.size > 0) broadcast(generateMockTracking());
  }, 2000);
} else {
  // ─── Real kRPC connection ──────────────────────────────────────────────────
  console.log('Attempting to connect to kRPC...');
  console.log('Make sure KSP is running with kRPC mod enabled.\n');

  import('krpc-node').then(async (krpcModule) => {
    const { createClient, spaceCenter } = krpcModule.default;
    try {
      const client = await createClient({
        host: CONFIG.krpcHost,
        rpcPort: CONFIG.krpcRpcPort,
        streamPort: CONFIG.krpcStreamPort,
        name: 'KSP Mission Planner',
      });
      console.log('Connected to kRPC!\n');

      const updateTelemetry = async () => {
        try {
          const vessel = await client.send(spaceCenter.getActiveVessel());
          if (!vessel) { broadcast({ error: 'No active vessel' }); return; }

          const name       = await vessel.name.get();
          const situation  = await vessel.situation.get();
          const missionTime = await vessel.met.get();
          const orbit      = await vessel.orbit.get();
          const body       = await orbit.body.get();
          const bodyName   = await body.name.get();

          const apoapsis      = await orbit.apoapsisAltitude.get();
          const periapsis     = await orbit.periapsisAltitude.get();
          const inclination   = await orbit.inclination.get();
          const eccentricity  = await orbit.eccentricity.get();
          const orbitalPeriod = await orbit.period.get();
          const timeToApoapsis = await orbit.timeToApoapsis.get();
          const timeToPeriapsis = await orbit.timeToPeriapsis.get();
          const orbitalSpeed  = await orbit.speed.get();

          const refFrame     = await vessel.orbitalReferenceFrame.get();
          const flight       = await vessel.flight(refFrame);
          const latitude     = await flight.latitude.get();
          const longitude    = await flight.longitude.get();
          const altitude     = await flight.meanAltitude.get();
          const surfaceAltitude = await flight.surfaceAltitude.get();
          const surfaceSpeed = await flight.speed.get();
          const verticalSpeed = await flight.verticalSpeed.get();
          const heading      = await flight.heading.get();

          const resources    = await vessel.resources.get();
          const liquidFuel   = await resources.amount('LiquidFuel');
          const liquidFuelMax = await resources.max('LiquidFuel');
          const oxidizer     = await resources.amount('Oxidizer');
          const oxidizerMax  = await resources.max('Oxidizer');
          const monopropellant = await resources.amount('MonoPropellant');
          const monopropellantMax = await resources.max('MonoPropellant');
          const electricCharge = await resources.amount('ElectricCharge');
          const electricChargeMax = await resources.max('ElectricCharge');

          const control      = await vessel.control.get();
          const currentStage = await control.currentStage.get();

          const telemetry = {
            name,
            type: 'ship',
            situation: situationToString(situation),
            missionTime,
            bodyId: bodyName.toLowerCase(),
            bodyName,
            latitude,
            longitude,
            altitude,
            surfaceAltitude,
            surfaceSpeed,
            orbitalSpeed,
            verticalSpeed,
            heading,
            apoapsis,
            periapsis,
            inclination: inclination * (180 / Math.PI),
            eccentricity,
            orbitalPeriod,
            timeToApoapsis,
            timeToPeriapsis,
            liquidFuel, liquidFuelMax,
            oxidizer, oxidizerMax,
            monopropellant, monopropellantMax,
            electricCharge, electricChargeMax,
            currentTWR: 0,
            maxTWR: 0,
            deltaVRemaining: 0,
            deltaVTotal: 0,
            currentStage,
            totalStages: currentStage,
            crewCount: 0,
            crewCapacity: 0,
            timestamp: Date.now(),
          };

          saveTelemetry(telemetry);
          broadcast(telemetry);
        } catch (error) {
          console.error('Error fetching telemetry:', error.message);
        }
      };

      // Tracking station: all vessels, updated every 2 s
      const updateTracking = async () => {
        try {
          const allVessels = await client.send(spaceCenter.getVessels());
          const tracked = [];
          for (const v of allVessels) {
            try {
              const vName      = await v.name.get();
              const vType      = await v.type.get();
              const vSituation = await v.situation.get();
              const vOrbit     = await v.orbit.get();
              const vBody      = await vOrbit.body.get();
              const vBodyName  = await vBody.name.get();

              const sma     = await vOrbit.semiMajorAxis.get();
              const ecc     = await vOrbit.eccentricity.get();
              const inc     = await vOrbit.inclination.get();
              const raan    = await vOrbit.longitudeOfAscendingNode.get();
              const argPe   = await vOrbit.argumentOfPeriapsis.get();
              const ta      = await vOrbit.trueAnomaly.get();
              const ma      = await vOrbit.meanAnomaly.get();
              const period  = await vOrbit.period.get();
              const tta     = await vOrbit.timeToApoapsis.get();
              const ttp     = await vOrbit.timeToPeriapsis.get();
              const apo     = await vOrbit.apoapsisAltitude.get();
              const peri    = await vOrbit.periapsisAltitude.get();
              const speed   = await vOrbit.speed.get();

              const bRadius = await vBody.equatorialRadius.get();

              const refFrame = await v.orbitalReferenceFrame.get();
              const fl = await v.flight(refFrame);
              const lat = await fl.latitude.get();
              const lng = await fl.longitude.get();
              const alt = await fl.meanAltitude.get();

              tracked.push({
                name: vName,
                vesselType: vType?.toString() ?? 'Unknown',
                situation: situationToString(vSituation),
                bodyId: vBodyName.toLowerCase(),
                bodyName: vBodyName,
                semiMajorAxis: sma,
                apoapsis: apo,
                periapsis: peri,
                eccentricity: ecc,
                inclination: inc * 180 / Math.PI,
                argumentOfPeriapsis: argPe * 180 / Math.PI,
                longitudeOfAscendingNode: raan * 180 / Math.PI,
                trueAnomaly: ta * 180 / Math.PI,
                meanAnomaly: ma * 180 / Math.PI,
                orbitalPeriod: period,
                timeToApoapsis: tta,
                timeToPeriapsis: ttp,
                orbitalSpeed: speed,
                latitude: lat,
                longitude: lng,
                altitude: alt,
                timestamp: Date.now(),
              });
            } catch { /* skip vessels we can't read */ }
          }
          broadcast({ type: 'tracking', vessels: tracked });
        } catch (error) {
          console.error('Error fetching tracking data:', error.message);
        }
      };

      setInterval(updateTelemetry, CONFIG.updateInterval);
      setInterval(updateTracking, 2000);
    } catch (error) {
      console.error('Failed to connect to kRPC:', error.message);
      console.log('\nOr start with MOCK_MODE=true for testing without KSP');
      process.exit(1);
    }
  }).catch((error) => {
    console.error('Failed to load krpc-node:', error.message);
    process.exit(1);
  });
}

function situationToString(value) {
  const map = { 0:'prelaunch',1:'orbiting',2:'subOrbital',3:'escaping',4:'flying',5:'landed',6:'splashed',7:'docked' };
  return map[value] ?? value?.toString() ?? 'unknown';
}
