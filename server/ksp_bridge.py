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

        # Total science points in the R&D facility
        try:
            telemetry["totalSciencePoints"] = conn.space_center.science
        except Exception:
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


# ── Science subject parsing ───────────────────────────────────────────────────

# KSP internal body names → our lowercase IDs
_KSP_BODY_MAP = {
    'Kerbin': 'kerbin', 'Mun': 'mun', 'Minmus': 'minmus',
    'Eve': 'eve', 'Gilly': 'gilly', 'Duna': 'duna', 'Ike': 'ike',
    'Dres': 'dres', 'Jool': 'jool', 'Laythe': 'laythe', 'Vall': 'vall',
    'Tylo': 'tylo', 'Bop': 'bop', 'Pol': 'pol', 'Eeloo': 'eeloo',
    'Moho': 'moho', 'Sun': 'kerbol',
}
_BODY_NAMES_DESC = sorted(_KSP_BODY_MAP.keys(), key=len, reverse=True)

# KSP situation strings → our ScienceSituation values
_KSP_SIT_MAP = {
    'InSpaceLow':  'inSpaceLow',
    'InSpaceHigh': 'inSpaceHigh',
    'FlyingLow':   'flying',
    'FlyingHigh':  'flying',
    'SrfLanded':   'landed',
    'SrfSplashed': 'splashed',
}
_SIT_CODES_DESC = sorted(_KSP_SIT_MAP.keys(), key=len, reverse=True)


def parse_science_subject_id(subject_id: str) -> dict | None:
    """
    Parse a KSP science subject ID into its components.
    Format: {experimentId}@{BodyName}{SituationCode}{BiomeName}
    Returns dict with experimentId, bodyId, situation, biome — or None if unparseable.
    """
    if '@' not in subject_id:
        return None
    experiment_id, location = subject_id.split('@', 1)

    # Extract body
    body_id = None
    for name in _BODY_NAMES_DESC:
        if location.startswith(name):
            body_id = _KSP_BODY_MAP[name]
            location = location[len(name):]
            break
    if body_id is None:
        return None

    # Extract situation
    situation = None
    for code in _SIT_CODES_DESC:
        if location.startswith(code):
            situation = _KSP_SIT_MAP[code]
            location = location[len(code):]
            break
    if situation is None:
        return None

    # Remainder is the biome (may be empty for space/flying)
    biome = location  # raw CamelCase biome, frontend normalises

    return {
        'experimentId': experiment_id,
        'bodyId': body_id,
        'situation': situation,
        'biome': biome,        # CamelCase, e.g. "NorthernIceShelf"
    }


def get_all_collected_science() -> list:
    """
    Return all science subjects that have had science recovered to R&D.

    Strategy (each tried in order, stops at first success with > 0 results):
    1. conn.space_center.science_subjects  (kRPC property, most versions)
    2. conn.space_center.science_subjects() (kRPC procedure form)
    3. Scan every experiment part on every vessel for stored data
    4. Scan every experiment part for its current-location science_subject history
    """
    global conn
    if not conn:
        return []
    collected = {}

    # ── Strategy 1 & 2: R&D subject list via kRPC ────────────────────────────
    for _attempt in range(2):
        try:
            raw_subjects = (conn.space_center.science_subjects
                            if _attempt == 0
                            else conn.space_center.science_subjects())
            count_before = len(collected)
            for subj in raw_subjects:
                try:
                    sci = subj.science
                    if sci <= 0:
                        continue
                    sid = subj.id
                    parsed = parse_science_subject_id(sid)
                    if parsed:
                        collected[sid] = {**parsed, 'value': sci}
                except Exception as inner:
                    print(f"[Science]  subject error: {inner}", flush=True)
            added = len(collected) - count_before
            print(f"[Science] Strategy {_attempt + 1}: {added} subjects with science > 0", flush=True)
            if len(collected) > 0:
                return list(collected.values())
        except Exception as e:
            print(f"[Science] Strategy {_attempt + 1} failed: {e}", flush=True)

    # ── Strategy 3: stored data in experiment containers on all vessels ────────
    print("[Science] Falling back to vessel experiment scan…", flush=True)
    try:
        for vessel in conn.space_center.vessels:
            try:
                for exp in vessel.parts.experiments:
                    try:
                        for data in exp.data:
                            try:
                                subj = data.science_subject
                                sid = subj.id
                                if sid not in collected:
                                    parsed = parse_science_subject_id(sid)
                                    if parsed:
                                        val = (subj.science or 0) + (data.amount or 0)
                                        collected[sid] = {**parsed, 'value': val}
                            except Exception:
                                pass
                    except Exception:
                        pass
            except Exception:
                pass
    except Exception as e:
        print(f"[Science] Strategy 3 error: {e}", flush=True)

    # ── Strategy 4: science_subject history at each vessel's current location ──
    # For experiments with no stored data, science_subject.science reveals how
    # much has already been recovered for this vessel's current location.
    try:
        for vessel in conn.space_center.vessels:
            try:
                for exp in vessel.parts.experiments:
                    try:
                        subj = exp.science_subject
                        sci = subj.science
                        if sci > 0:
                            sid = subj.id
                            if sid not in collected:
                                parsed = parse_science_subject_id(sid)
                                if parsed:
                                    collected[sid] = {**parsed, 'value': sci}
                    except Exception:
                        pass
            except Exception:
                pass
    except Exception as e:
        print(f"[Science] Strategy 4 error: {e}", flush=True)

    print(f"[Science] Vessel scan total: {len(collected)} subjects", flush=True)
    return list(collected.values())


def get_tracking_data() -> dict | None:
    """Fetch all vessels from the tracking station."""
    global conn
    if not conn:
        return None
    try:
        all_vessels = conn.space_center.vessels
        tracked = []
        for v in all_vessels:
            try:
                orbit = v.orbit
                body = orbit.body
                flight = v.flight(v.orbital_reference_frame)
                inc_rad = orbit.inclination
                arg_pe_rad = orbit.argument_of_periapsis
                raan_rad = orbit.longitude_of_ascending_node
                ta_rad = orbit.true_anomaly
                ma_rad = orbit.mean_anomaly
                tracked.append({
                    "name": v.name,
                    "vesselType": str(v.type).split('.')[-1],
                    "situation": situation_to_string(v.situation),
                    "bodyId": body.name.lower(),
                    "bodyName": body.name,
                    "semiMajorAxis": orbit.semi_major_axis,
                    "apoapsis": orbit.apoapsis_altitude,
                    "periapsis": orbit.periapsis_altitude,
                    "eccentricity": orbit.eccentricity,
                    "inclination": inc_rad * 180 / math.pi,
                    "argumentOfPeriapsis": arg_pe_rad * 180 / math.pi,
                    "longitudeOfAscendingNode": raan_rad * 180 / math.pi,
                    "trueAnomaly": ta_rad * 180 / math.pi,
                    "meanAnomaly": ma_rad * 180 / math.pi,
                    "orbitalPeriod": orbit.period,
                    "timeToApoapsis": orbit.time_to_apoapsis,
                    "timeToPeriapsis": orbit.time_to_periapsis,
                    "orbitalSpeed": orbit.speed,
                    "latitude": flight.latitude,
                    "longitude": flight.longitude,
                    "altitude": flight.mean_altitude,
                    "timestamp": int(time.time() * 1000),
                })
            except Exception:
                pass  # skip vessels we can't read
        return {"type": "tracking", "vessels": tracked}
    except Exception as e:
        print(f"Error fetching tracking data: {e}", flush=True)
        return None


# Cache the last tracking snapshot so new clients get it immediately
last_tracking_snapshot: str | None = None


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


async def tracking_loop():
    """Fetch all vessels every 2 seconds and broadcast as tracking data."""
    global last_tracking_snapshot
    while True:
        tracking = get_tracking_data()
        if tracking is not None:
            sanitized = sanitize_for_json(tracking)
            msg = json.dumps(sanitized)
            last_tracking_snapshot = msg
            if clients:
                await broadcast(msg)
        await asyncio.sleep(2.0)


async def handle_client(websocket):
    """Handle a WebSocket client connection."""
    clients.add(websocket)
    print(f"Client connected. Total clients: {len(clients)}")

    # Send the most recent tracking snapshot immediately so the client
    # doesn't have to wait up to 2 seconds for the next interval tick.
    if last_tracking_snapshot:
        try:
            await websocket.send(last_tracking_snapshot)
        except Exception:
            pass

    try:
        async for message in websocket:
            try:
                msg = json.loads(message)
                if msg.get('type') == 'requestAllScience':
                    print("[Science] Client requested full science import", flush=True)
                    subjects = get_all_collected_science()
                    response = sanitize_for_json({'type': 'allScience', 'subjects': subjects})
                    await websocket.send(json.dumps(response))
                    print(f"[Science] Sent {len(subjects)} subjects to client", flush=True)
            except Exception as e:
                print(f"[WS] Error handling client message: {e}", flush=True)
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

        # Start telemetry and tracking loops
        asyncio.create_task(telemetry_loop())
        asyncio.create_task(tracking_loop())

        # Run forever
        await asyncio.Future()  # Run forever


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutting down...")
