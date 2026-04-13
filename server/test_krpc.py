#!/usr/bin/env python3
"""Quick test to verify kRPC connection."""
import krpc

print("Testing kRPC connection...")
print("NOTE: Check KSP - you may need to accept the connection in the kRPC dialog!")
print()

try:
    conn = krpc.connect(name='Test Connection')
    print(f"Connected to KSP!")
    print(f"kRPC Version: {conn.krpc.get_status().version}")

    vessel = conn.space_center.active_vessel
    if vessel:
        print(f"Active Vessel: {vessel.name}")
        print(f"Situation: {vessel.situation}")
        orbit = vessel.orbit
        print(f"Body: {orbit.body.name}")
        print(f"Altitude: {vessel.flight().mean_altitude:.0f} m")
    else:
        print("No active vessel (you may be in the main menu)")

    conn.close()
    print("\nConnection test successful!")
except Exception as e:
    print(f"Connection failed: {e}")
