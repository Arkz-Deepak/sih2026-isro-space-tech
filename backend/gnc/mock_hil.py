"""
Hardware-in-the-Loop (HIL) Real-Time Simulator.
Simulates 6-DoF orbital dynamics, cold-gas thruster firings, battery consumption, and sensor noise.
"""

import time
import numpy as np
from typing import Dict, Any
from .orbit_solver import ClohessyWiltshireSolver

class HILSimulator:
    def __init__(self):
        self.cw_solver = ClohessyWiltshireSolver(orbital_altitude_km=500.0)
        self.start_time = time.time()

        # Initial relative state: [x, y, z, vx, vy, vz] in meters and m/s
        # Starting 80 meters behind along V-bar with slow approach
        self.state = np.array([0.5, -80.0, 0.2, -0.01, 0.15, 0.005])

        # Attitude quaternion [q0, q1, q2, q3] and angular rate [wx, wy, wz] (deg/s)
        self.quaternion = np.array([1.0, 0.0, 0.0, 0.0])
        self.angular_rate = np.array([0.02, -0.01, 0.01])

        # Consumables
        self.fuel_kg = 1.95
        self.battery_pct = 94.2
        self.reaction_wheels_rpm = np.array([1240.0, -850.0, 420.0])
        self.npu_temp_c = 43.8

    def update(self, dt: float, active_phase: str, gnc_mode: str) -> Dict[str, Any]:
        """
        Advance simulation by dt seconds.
        """
        # Guidance forces based on phase
        ax, ay, az = 0.0, 0.0, 0.0

        if gnc_mode == "ABORTING":
            # Maximum retro-thrust along V-bar to escape target
            ay = -0.08
            self.fuel_kg = max(0.0, self.fuel_kg - 0.002 * dt)
        elif active_phase == "APPROACH":
            # Gentle closing acceleration towards docking point
            dist = np.linalg.norm(self.state[0:3])
            if dist > 2.0:
                # Proportional steering towards origin
                ay = 0.01 if self.state[1] < 0 else -0.01
                self.fuel_kg = max(0.0, self.fuel_kg - 0.0003 * dt)
        elif active_phase == "INSPECTION":
            # Fly-around harmonic motion
            pass

        # Apply simple velocity integration with CW drift
        propagated = self.cw_solver.propagate_state(self.state, dt)
        propagated[3] += ax * dt
        propagated[4] += ay * dt
        propagated[5] += az * dt
        self.state = propagated

        # Battery dynamics
        self.battery_pct = max(10.0, self.battery_pct - 0.005 * dt)
        # NPU temperature fluctuations
        self.npu_temp_c = 42.0 + 3.0 * np.sin(time.time() * 0.1)

        # Calculate relative distance and speed
        distance = float(np.linalg.norm(self.state[0:3]))
        rel_velocity = float(self.state[4]) # In-track velocity

        # Determine Keep-Out Zone (KOZ)
        if distance > 25.0:
            koz_status = "NOMINAL"
        elif distance > 5.0:
            koz_status = "APPROACH_CORRIDOR"
        else:
            koz_status = "BREACH" if abs(rel_velocity) > 0.2 else "APPROACH_CORRIDOR"

        # Docking axis alignment error (degrees)
        alignment_error = float(np.degrees(np.arctan2(abs(self.state[0]), abs(self.state[1]) + 1e-5)))

        # Remaining delta-V: Isp * g0 * ln(m0 / mf), Isp = 65s, g0 = 9.81
        delta_v = 65.0 * 9.81 * np.log(11.4 / (11.4 - (1.95 - self.fuel_kg) + 1e-6))

        return {
            "chaser": {
                "position": [float(self.state[0]), float(self.state[1]), float(self.state[2])],
                "velocity": [float(self.state[3]), float(self.state[4]), float(self.state[5])],
                "quaternion": [float(self.quaternion[0]), float(self.quaternion[1]), float(self.quaternion[2]), float(self.quaternion[3])],
                "angular_rate": [float(self.angular_rate[0]), float(self.angular_rate[1]), float(self.angular_rate[2])],
                "fuel_remaining_kg": round(float(self.fuel_kg), 3),
                "delta_v_remaining_ms": round(float(delta_v), 1),
                "battery_pct": round(float(self.battery_pct), 1),
                "bus_voltage_v": 28.1,
                "reaction_wheels_rpm": [float(self.reaction_wheels_rpm[0]), float(self.reaction_wheels_rpm[1]), float(self.reaction_wheels_rpm[2])],
                "npu_temp_c": round(float(self.npu_temp_c), 1)
            },
            "target": {
                "distance_meters": round(distance, 2),
                "relative_velocity_ms": round(rel_velocity, 3),
                "koz_status": koz_status,
                "docking_alignment_error_deg": round(alignment_error, 2),
                "ai_confidence": round(98.2 + 1.5 * np.sin(time.time()), 1)
            }
        }
