/**
 * KSP Telemetry Bridge Server
 *
 * This server connects to KSP via kRPC and broadcasts telemetry data
 * to connected web clients via WebSocket.
 *
 * Prerequisites:
 * 1. Install kRPC mod in KSP (https://github.com/krpc/krpc/releases)
 * 2. Start KSP and enable the kRPC server in-game
 * 3. Run this bridge server: npm start
 * 4. Connect from the KSP Mission Planner web app
 */

import { WebSocketServer, WebSocket } from 'ws';

// Configuration
const CONFIG = {
  // WebSocket server port (for web clients)
  wsPort: parseInt(process.env.WS_PORT || '8080'),

  // kRPC server settings
  krpcHost: process.env.KRPC_HOST || 'localhost',
  krpcRpcPort: parseInt(process.env.KRPC_RPC_PORT || '50000'),
  krpcStreamPort: parseInt(process.env.KRPC_STREAM_PORT || '50001'),

  // Update interval in milliseconds
  updateInterval: parseInt(process.env.UPDATE_INTERVAL || '500'),

  // Enable mock mode for testing without KSP
  mockMode: process.env.MOCK_MODE === 'true',
};

console.log('KSP Telemetry Bridge Server');
console.log('===========================');
console.log(`WebSocket Port: ${CONFIG.wsPort}`);
console.log(`kRPC Host: ${CONFIG.krpcHost}:${CONFIG.krpcRpcPort}`);
console.log(`Update Interval: ${CONFIG.updateInterval}ms`);
console.log(`Mock Mode: ${CONFIG.mockMode}`);
console.log('');

// WebSocket server for web clients
const wss = new WebSocketServer({ port: CONFIG.wsPort });

// Track connected clients
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('Web client connected');
  clients.add(ws);

  ws.on('close', () => {
    console.log('Web client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Broadcast telemetry to all connected clients
function broadcast(data) {
  const json = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  }
}

// Mock telemetry generator for testing
function generateMockTelemetry() {
  const time = Date.now() / 1000;
  const altitude = 75000 + Math.sin(time / 100) * 5000;
  const speed = 2200 + Math.sin(time / 50) * 100;

  return {
    name: 'Mock Vessel',
    type: 'ship',
    situation: 'orbiting',
    missionTime: Math.floor(time % 86400),

    bodyId: 'kerbin',
    latitude: Math.sin(time / 200) * 45,
    longitude: (time * 2) % 360 - 180,
    altitude: altitude,
    surfaceAltitude: altitude,

    surfaceSpeed: speed,
    orbitalSpeed: speed + 50,
    verticalSpeed: Math.sin(time / 30) * 10,

    apoapsis: 80000,
    periapsis: 70000,
    inclination: 0.5,
    eccentricity: 0.01,
    orbitalPeriod: 2700,
    timeToApoapsis: 1350 - (time % 2700),
    timeToPeriapsis: 675 - (time % 2700),

    liquidFuel: 800 - (time % 200),
    liquidFuelMax: 1000,
    oxidizer: 980 - (time % 250),
    oxidizerMax: 1200,
    monopropellant: 50,
    monopropellantMax: 100,
    electricCharge: 1000 - Math.sin(time / 10) * 50,
    electricChargeMax: 1000,

    currentTWR: 0,
    maxTWR: 1.8,
    deltaVRemaining: 2500 - (time % 500),
    deltaVTotal: 3500,
    currentStage: 2,
    totalStages: 3,

    crewCount: 1,
    crewCapacity: 3,

    timestamp: Date.now(),
  };
}

// Start mock mode
if (CONFIG.mockMode) {
  console.log('Starting in MOCK MODE - generating fake telemetry');

  setInterval(() => {
    if (clients.size > 0) {
      const telemetry = generateMockTelemetry();
      broadcast(telemetry);
    }
  }, CONFIG.updateInterval);

  console.log(`\nServer ready! Connect from web app to ws://localhost:${CONFIG.wsPort}`);
} else {
  // Real kRPC connection
  console.log('Attempting to connect to kRPC...');
  console.log('Make sure KSP is running with kRPC mod enabled.');
  console.log('');

  // Dynamic import for krpc-node
  import('krpc-node').then(async (krpcModule) => {
    const { createClient, spaceCenter } = krpcModule.default;

    try {
      const client = await createClient({
        host: CONFIG.krpcHost,
        rpcPort: CONFIG.krpcRpcPort,
        streamPort: CONFIG.krpcStreamPort,
        name: 'KSP Mission Planner',
      });

      console.log('Connected to kRPC!');

      // Main telemetry loop
      const updateTelemetry = async () => {
        try {
          // Get the active vessel
          const vessel = await client.send(spaceCenter.getActiveVessel());

          if (!vessel) {
            broadcast({ error: 'No active vessel' });
            return;
          }

          // Get vessel properties
          const name = await vessel.name.get();
          const situation = await vessel.situation.get();
          const missionTime = await vessel.met.get();

          // Get orbit
          const orbit = await vessel.orbit.get();
          const body = await orbit.body.get();
          const bodyName = await body.name.get();

          // Get orbital parameters
          const apoapsis = await orbit.apoapsisAltitude.get();
          const periapsis = await orbit.periapsisAltitude.get();
          const inclination = await orbit.inclination.get();
          const eccentricity = await orbit.eccentricity.get();
          const orbitalPeriod = await orbit.period.get();
          const timeToApoapsis = await orbit.timeToApoapsis.get();
          const timeToPeriapsis = await orbit.timeToPeriapsis.get();
          const orbitalSpeed = await orbit.speed.get();

          // Get flight data
          const refFrame = await vessel.orbitalReferenceFrame.get();
          const flight = await vessel.flight(refFrame);
          const latitude = await flight.latitude.get();
          const longitude = await flight.longitude.get();
          const altitude = await flight.meanAltitude.get();
          const surfaceAltitude = await flight.surfaceAltitude.get();
          const surfaceSpeed = await flight.speed.get();
          const verticalSpeed = await flight.verticalSpeed.get();

          // Get resources
          const resources = await vessel.resources.get();
          const liquidFuel = await resources.amount('LiquidFuel');
          const liquidFuelMax = await resources.max('LiquidFuel');
          const oxidizer = await resources.amount('Oxidizer');
          const oxidizerMax = await resources.max('Oxidizer');
          const monopropellant = await resources.amount('MonoPropellant');
          const monopropellantMax = await resources.max('MonoPropellant');
          const electricCharge = await resources.amount('ElectricCharge');
          const electricChargeMax = await resources.max('ElectricCharge');

          // Get control/staging info
          const control = await vessel.control.get();
          const currentStage = await control.currentStage.get();

          const telemetry = {
            name,
            type: 'ship',
            situation: situationToString(situation),
            missionTime,

            bodyId: bodyName.toLowerCase(),
            latitude,
            longitude,
            altitude,
            surfaceAltitude,

            surfaceSpeed,
            orbitalSpeed,
            verticalSpeed,

            apoapsis,
            periapsis,
            inclination: inclination * (180 / Math.PI),
            eccentricity,
            orbitalPeriod,
            timeToApoapsis,
            timeToPeriapsis,

            liquidFuel,
            liquidFuelMax,
            oxidizer,
            oxidizerMax,
            monopropellant,
            monopropellantMax,
            electricCharge,
            electricChargeMax,

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

          broadcast(telemetry);
        } catch (error) {
          console.error('Error fetching telemetry:', error.message);
        }
      };

      setInterval(updateTelemetry, CONFIG.updateInterval);

      console.log(`\nServer ready! Connect from web app to ws://localhost:${CONFIG.wsPort}`);

    } catch (error) {
      console.error('Failed to connect to kRPC:', error.message);
      console.log('\nMake sure:');
      console.log('1. KSP is running');
      console.log('2. kRPC mod is installed and enabled');
      console.log('3. kRPC server is started in the game');
      console.log('\nOr start with MOCK_MODE=true for testing without KSP');
      process.exit(1);
    }
  }).catch((error) => {
    console.error('Failed to load krpc-node module:', error.message);
    console.log('\nRun: npm install');
    console.log('Or start with MOCK_MODE=true for testing without kRPC');
    process.exit(1);
  });
}

// Helper to convert situation enum to string
function situationToString(value) {
  const situations = {
    0: 'prelaunch',
    1: 'orbiting',
    2: 'subOrbital',
    3: 'escaping',
    4: 'flying',
    5: 'landed',
    6: 'splashed',
    7: 'docked',
  };
  return situations[value] || value?.toString() || 'unknown';
}

console.log(`WebSocket server listening on port ${CONFIG.wsPort}`);
