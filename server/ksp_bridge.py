#!/usr/bin/env python3
"""
KSP Telemetry Bridge Server (Python version)

This server connects to KSP via kRPC and broadcasts telemetry data
to connected web clients via WebSocket.

Prerequisites:
    pip install krpc websockets

Usage:
    python ksp_bridge.py
"""

import asyncio
import json
import math
import time
import os
import socket
from typing import Set


def sanitize_for_json(obj):
    """Replace NaN and Infinity with None for valid JSON."""
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(v) for v in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    return obj

try:
    import krpc
except ImportError:
    print("Error: krpc not installed. Run: pip install krpc")
    exit(1)

try:
    import websockets
except ImportError:
    print("Error: websockets not installed. Run: pip install websockets")
    exit(1)

# Configuration
WS_PORT = int(os.environ.get('WS_PORT', 8080))
KRPC_HOST = os.environ.get('KRPC_HOST', 'localhost')
KRPC_RPC_PORT = int(os.environ.get('KRPC_RPC_PORT', 50000))
UPDATE_INTERVAL = float(os.environ.get('UPDATE_INTERVAL', 500)) / 1000  # Convert ms to seconds

# Connected WebSocket clients
clients: set = set()

# kRPC connection
conn = None


def situation_to_string(situation) -> str:
    """Convert kRPC VesselSituation enum to string."""
    mapping = {
        0: 'prelaunch',
        1: 'orbiting',
        2: 'subOrbital',
        3: 'escaping',
        4: 'flying',
        5: 'landed',
        6: 'splashed',
        7: 'docked',
    }
    # Handle both enum values and objects
    try:
        val = situation.value if hasattr(situation, 'value') else int(situation)
        return mapping.get(val, str(situation))
    except:
        return str(situation).lower().replace('_', '')


def get_telemetry() -> dict:
    """Fetch current telemetry from KSP."""
    global conn

    if not conn:
        return None

    try:
        vessel = conn.space_center.active_vessel
        if not vessel:
            return {"error": "No active vessel"}

        orbit = vessel.orbit
        body = orbit.body
        flight = vessel.flight(vessel.orbital_reference_frame)
        surface_flight = vessel.flight(body.reference_frame)
        resources = vessel.resources
        control = vessel.control

        # Calculate current thrust and TWR
        current_thrust = vessel.thrust
        available_thrust = vessel.available_thrust
        mass = vessel.mass
        surface_gravity = body.surface_gravity
        local_gravity = body.surface_gravity * (body.equatorial_radius / (body.equatorial_radius + flight.mean_altitude)) ** 2

        current_twr = current_thrust / (mass * local_gravity) if mass > 0 and local_gravity > 0 else 0
        max_twr = available_thrust / (mass * local_gravity) if mass > 0 and local_gravity > 0 else 0

        telemetry = {
            # Vessel info
            "name": vessel.name,
            "type": str(vessel.type).split('.')[-1].lower(),
            "situation": situation_to_string(vessel.situation),
            "missionTime": vessel.met,
            "mass": mass,
            "dryMass": vessel.dry_mass,

            # Position
            "bodyId": body.name.lower(),
            "bodyName": body.name,
            "latitude": flight.latitude,
            "longitude": flight.longitude,
            "altitude": flight.mean_altitude,
            "surfaceAltitude": flight.surface_altitude,
            "radarAltitude": surface_flight.surface_altitude,

            # Attitude
            "pitch": surface_flight.pitch,
            "heading": surface_flight.heading,
            "roll": surface_flight.roll,

            # Velocity
            "surfaceSpeed": flight.speed,
            "orbitalSpeed": orbit.speed,
            "verticalSpeed": flight.vertical_speed,
            "horizontalSpeed": flight.horizontal_speed,

            # G-Force
            "gForce": surface_flight.g_force,

            # Atmosphere
            "inAtmosphere": body.has_atmosphere and flight.mean_altitude < body.atmosphere_depth,
            "atmosphereDensity": surface_flight.atmosphere_density if body.has_atmosphere else 0,
            "dynamicPressure": surface_flight.dynamic_pressure if body.has_atmosphere else 0,
            "staticPressure": surface_flight.static_pressure if body.has_atmosphere else 0,
            "machNumber": surface_flight.mach if body.has_atmosphere else 0,
            "terminalVelocity": surface_flight.terminal_velocity if body.has_atmosphere and surface_flight.atmosphere_density > 0 else 0,

            # Orbital parameters
            "apoapsis": orbit.apoapsis_altitude,
            "periapsis": orbit.periapsis_altitude,
            "semiMajorAxis": orbit.semi_major_axis,
            "inclination": orbit.inclination * (180 / 3.14159),
            "eccentricity": orbit.eccentricity,
            "orbitalPeriod": orbit.period,
            "timeToApoapsis": orbit.time_to_apoapsis,
            "timeToPeriapsis": orbit.time_to_periapsis,
            "argumentOfPeriapsis": orbit.argument_of_periapsis * (180 / 3.14159),
            "longitudeOfAscendingNode": orbit.longitude_of_ascending_node * (180 / 3.14159),
            "meanAnomaly": orbit.mean_anomaly * (180 / 3.14159),
            "trueAnomaly": orbit.true_anomaly * (180 / 3.14159),

            # SOI
            "timeToSOIChange": orbit.time_to_soi_change if orbit.next_orbit else None,
            "nextBodyName": orbit.next_orbit.body.name if orbit.next_orbit else None,

            # Resources
            "liquidFuel": resources.amount('LiquidFuel'),
            "liquidFuelMax": resources.max('LiquidFuel'),
            "oxidizer": resources.amount('Oxidizer'),
            "oxidizerMax": resources.max('Oxidizer'),
            "monopropellant": resources.amount('MonoPropellant'),
            "monopropellantMax": resources.max('MonoPropellant'),
            "electricCharge": resources.amount('ElectricCharge'),
            "electricChargeMax": resources.max('ElectricCharge'),
            "xenonGas": resources.amount('XenonGas'),
            "xenonGasMax": resources.max('XenonGas'),
            "solidFuel": resources.amount('SolidFuel'),
            "solidFuelMax": resources.max('SolidFuel'),
            "ablator": resources.amount('Ablator'),
            "ablatorMax": resources.max('Ablator'),
            "ore": resources.amount('Ore'),
            "oreMax": resources.max('Ore'),

            # Performance
            "currentThrust": current_thrust,
            "availableThrust": available_thrust,
            "currentTWR": current_twr,
            "maxTWR": max_twr,
            "specificImpulse": vessel.specific_impulse if vessel.specific_impulse else 0,
            "deltaVRemaining": 0,  # Would need complex stage-by-stage calculation
            "deltaVTotal": 0,
            "currentStage": control.current_stage,
            "totalStages": control.current_stage,
            "throttle": control.throttle,

            # Control state
            "sas": control.sas,
            "rcs": control.rcs,
            "gear": control.gear,
            "lights": control.lights,
            "brakes": control.brakes,
            "abort": control.abort,

            # Crew
            "crewCount": len(vessel.crew),
            "crewCapacity": vessel.crew_capacity,
            "crewNames": [c.name for c in vessel.crew],

            # Comms
            "commNetSignal": vessel.comms.signal_strength if hasattr(vessel.comms, 'signal_strength') else 1.0,
            "canCommunicate": vessel.comms.can_communicate if hasattr(vessel.comms, 'can_communicate') else True,

            # Timestamp
            "timestamp": int(time.time() * 1000),
        }

        # Add maneuver node info if available
        try:
            nodes = control.nodes
            if nodes and len(nodes) > 0:
                node = nodes[0]
                telemetry["maneuverNode"] = {
                    "deltaV": node.delta_v,
                    "remainingDeltaV": node.remaining_delta_v,
                    "burnTime": node.remaining_burn_vector(vessel.orbital_reference_frame)[0] / vessel.available_thrust * vessel.mass if vessel.available_thrust > 0 else 0,
                    "timeToNode": node.time_to - conn.space_center.ut,
                    "prograde": node.prograde,
                    "normal": node.normal,
                    "radial": node.radial,
                }
        except:
            pass

        # Add target info if available
        try:
            target = conn.space_center.target_vessel or conn.space_center.target_body
            if target:
                if hasattr(target, 'orbit'):
                    target_orbit = target.orbit
                    telemetry["target"] = {
                        "name": target.name,
                        "distance": orbit.distance_at_closest_approach(target_orbit) if hasattr(orbit, 'distance_at_closest_approach') else None,
                        "relativeSpeed": orbit.relative_speed(target_orbit) if hasattr(orbit, 'relative_speed') else None,
                        "timeToClosestApproach": orbit.time_to_closest_approach(target_orbit) if hasattr(orbit, 'time_to_closest_approach') else None,
                    }
        except:
            pass

        # Add biome info
        try:
            telemetry["biome"] = vessel.biome
        except:
            telemetry["biome"] = None

        # Get science experiments on vessel and their data
        try:
            experiments_data = []
            for part in vessel.parts.all:
                for module in part.modules:
                    if module.name in ['ModuleScienceExperiment', 'ModuleScienceContainer']:
                        try:
                            exp_info = {
                                "partName": part.name,
                                "moduleName": module.name,
                            }
                            # Get fields from the module
                            if 'experimentID' in module.fields:
                                exp_info["experimentId"] = module.fields['experimentID']
                            if module.has_event('Deploy'):
                                exp_info["canDeploy"] = True
                            if module.has_event('Reset'):
                                exp_info["hasData"] = True
                            if module.has_event('Review Data'):
                                exp_info["hasData"] = True
                            experiments_data.append(exp_info)
                        except:
                            pass
            telemetry["vesselExperiments"] = experiments_data
        except Exception as e:
            telemetry["vesselExperiments"] = []

        # Get R&D science subjects (what science has been collected in career)
        try:
            if hasattr(conn, 'space_center') and hasattr(conn.space_center, 'science'):
                # Get total science points
                telemetry["totalSciencePoints"] = conn.space_center.science
        except:
            pass

        return telemetry

    except Exception as e:
        print(f"Error fetching telemetry: {e}", flush=True)
        return {"error": str(e)}


async def broadcast(message: str):
    """Send message to all connected clients."""
    if clients:
        await asyncio.gather(
            *[client.send(message) for client in clients],
            return_exceptions=True
        )


async def telemetry_loop():
    """Main loop that fetches and broadcasts telemetry."""
    while True:
        if clients:  # Only fetch if clients are connected
            telemetry = get_telemetry()
            if telemetry:
                # Sanitize NaN/Infinity values before JSON encoding
                sanitized = sanitize_for_json(telemetry)
                await broadcast(json.dumps(sanitized))
        await asyncio.sleep(UPDATE_INTERVAL)


async def handle_client(websocket):
    """Handle a WebSocket client connection."""
    clients.add(websocket)
    print(f"Client connected. Total clients: {len(clients)}")

    try:
        async for message in websocket:
            # Handle any client messages if needed
            pass
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        clients.discard(websocket)
        print(f"Client disconnected. Total clients: {len(clients)}")


async def main():
    global conn

    print("KSP Telemetry Bridge Server (Python)", flush=True)
    print("=" * 40, flush=True)
    print(f"WebSocket Port: {WS_PORT}", flush=True)
    print(f"kRPC Host: {KRPC_HOST}:{KRPC_RPC_PORT}", flush=True)
    print(f"Update Interval: {UPDATE_INTERVAL * 1000}ms", flush=True)
    print(flush=True)

    # Check if kRPC is reachable first
    print("Checking kRPC availability...", flush=True)
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(3)
    try:
        sock.connect((KRPC_HOST, KRPC_RPC_PORT))
        sock.close()
    except (socket.timeout, ConnectionRefusedError, OSError) as e:
        print(f"Cannot reach kRPC at {KRPC_HOST}:{KRPC_RPC_PORT}", flush=True)
        print(f"Error: {e}", flush=True)
        print("\nMake sure:", flush=True)
        print("1. KSP is running", flush=True)
        print("2. kRPC mod is installed and enabled", flush=True)
        print("3. kRPC server is started in the game", flush=True)
        return

    # Connect to kRPC
    print("Connecting to kRPC...", flush=True)
    try:
        conn = krpc.connect(
            name='KSP Mission Planner',
            address=KRPC_HOST,
            rpc_port=KRPC_RPC_PORT,
        )
        print(f"Connected to KSP! Version: {conn.krpc.get_status().version}", flush=True)
    except Exception as e:
        print(f"Failed to connect to kRPC: {e}", flush=True)
        print("\nMake sure:", flush=True)
        print("1. KSP is running", flush=True)
        print("2. kRPC mod is installed and enabled", flush=True)
        print("3. kRPC server is started in the game", flush=True)
        return

    # Start WebSocket server
    print(f"\nStarting WebSocket server on port {WS_PORT}...", flush=True)
    async with websockets.serve(handle_client, "0.0.0.0", WS_PORT) as server:
        print(f"Server ready! Connect from web app to ws://localhost:{WS_PORT}", flush=True)

        # Start telemetry loop
        telemetry_task = asyncio.create_task(telemetry_loop())

        # Run forever
        await asyncio.Future()  # Run forever


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutting down...")
