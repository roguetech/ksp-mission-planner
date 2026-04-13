# KSP Telemetry Bridge Server

This server connects to Kerbal Space Program via the kRPC mod and broadcasts live telemetry data to the KSP Mission Planner web application.

## Prerequisites

1. **KSP with kRPC mod installed**
   - Download kRPC from: https://github.com/krpc/krpc/releases
   - Extract to your KSP GameData folder: `~/.local/share/Steam/steamapps/common/Kerbal Space Program/GameData/`

2. **Node.js 18+**

## Quick Start

### Testing with Mock Mode (No KSP Required)

```bash
cd server
npm install
MOCK_MODE=true npm start
```

This will generate fake telemetry data for testing the web interface.

### Real KSP Connection

1. Start KSP
2. In the game, open the kRPC window (icon in the toolbar)
3. Click "Start Server"
4. Note the RPC port (default: 50000)

5. Start the bridge server:
```bash
cd server
npm install
npm start
```

6. Open the KSP Mission Planner web app
7. Go to the "Live" tab
8. Click "Connect to KSP"

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `WS_PORT` | 8080 | WebSocket server port for web clients |
| `KRPC_HOST` | localhost | kRPC server hostname |
| `KRPC_RPC_PORT` | 50000 | kRPC RPC port |
| `KRPC_STREAM_PORT` | 50001 | kRPC stream port |
| `UPDATE_INTERVAL` | 500 | Telemetry update interval in ms |
| `MOCK_MODE` | false | Enable mock telemetry for testing |

Example:
```bash
WS_PORT=9000 KRPC_HOST=192.168.1.100 npm start
```

## Troubleshooting

### "Failed to connect to kRPC"

- Make sure KSP is running
- Open the kRPC window in-game and click "Start Server"
- Check if the port is correct (default: 50000)
- Make sure no firewall is blocking the connection

### "Failed to load krpc-node module"

```bash
npm install
```

### Web client won't connect

- Check that the bridge server is running
- Verify the WebSocket URL in the web app matches (default: ws://localhost:8080)
- Check browser console for errors

## Telemetry Data

The server broadcasts the following data:

- **Vessel Info**: name, type, situation, mission time
- **Position**: body, latitude, longitude, altitude
- **Velocity**: surface speed, orbital speed, vertical speed
- **Orbital Parameters**: apoapsis, periapsis, inclination, eccentricity
- **Resources**: liquid fuel, oxidizer, monopropellant, electric charge
- **Performance**: TWR, delta-V, stage info
- **Crew**: count and capacity
