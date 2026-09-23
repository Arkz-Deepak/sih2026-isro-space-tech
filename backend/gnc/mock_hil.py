"""
Hardware-in-the-Loop (HIL) Real-Time Simulator.
Integrates Clohessy-Wiltshire relative orbit propagation, ZEM/ZEV guidance,
Thruster allocation, UKF sensor fusion, and gripper states.
"""

import time
import numpy as np
from typing import Dict, Any, Optional
from .orbit_solver import ClohessyWiltshireSolver
from .guidance_zem_zev import ZEMZEVGuidance
from .thruster_controller import ThrusterController
from .ukf_estimator import ProximityUKF

class HILSimulator:
    def __init__(self):
        self.cw_solver = ClohessyWiltshireSolver(orbital_altitude_km=500.0)
        self.guidance = ZEMZEVGuidance(orbital_altitude_km=500.0)
        self.thrusters = ThrusterController(dry_mass_kg=9.4, wet_mass_kg=11.4)
        self.ukf = ProximityUKF(dt=0.05)
        self.start_time = time.time()

        # True Physical Relative State: [x, y, z, vx, vy, vz] in LVLH (m, m/s)
        # Starting 80m behind on V-bar (-y) with gentle closing velocity (+0.15 m/s)
        self.state = np.array([0.5, -80.0, 0.2, -0.01, 0.15, 0.005], dtype=float)

        # Target tumbling state: [xf, yf, zf, vxf, vyf, vzf]
        self.target_state = np.zeros(6)

        # Attitude quaternion [q0, q1, q2, q3] and angular rate [wx, wy, wz] (deg/s)
        self.quaternion = np.array([1.0, 0.0, 0.0, 0.0])
        self.angular_rate = np.array([0.02, -0.01, 0.01])

        # Consumables & Avionics
        self.battery_pct = 95.4
        self.reaction_wheels_rpm = np.array([1240.0, -850.0, 420.0])
        self.npu_temp_c = 43.8

        # Gripper mechanism state
        self.gripper_state = "STOWED" # STOWED, DEPLOYED, ELECTRO_ADHESION_ACTIVE, CAPTURED, RELEASED
        self.active_nozzles_firing = np.zeros(8)
        self.pending_manual_thrust = np.zeros(3)
        self.time_to_go = 300.0 # seconds until nominal docking point

    def fire_manual_pulse(self, axis: str, duration_sec: float = 0.1):
        """
        Manually trigger thruster pulse along designated body axis.
        """
        pulse_force = 0.020 # 20 mN pulse
        if axis == "X+": self.pending_manual_thrust[0] += pulse_force
        elif axis == "X-": self.pending_manual_thrust[0] -= pulse_force
        elif axis == "Y+": self.pending_manual_thrust[1] += pulse_force
        elif axis == "Y-": self.pending_manual_thrust[1] -= pulse_force
        elif axis == "Z+": self.pending_manual_thrust[2] += pulse_force
        elif axis == "Z-": self.pending_manual_thrust[2] -= pulse_force

    GRIPPER_NORMALIZATION = {
        # Action verbs -> Canonical state
        "DEPLOY": "DEPLOYED",
        "STOW": "STOWED",
        "ENGAGE_ELECTRO_ADHESION": "ELECTRO_ADHESION_ACTIVE",
        "RELEASE": "RELEASED",
        # Direct canonical states
        "STOWED": "STOWED",
        "DEPLOYED": "DEPLOYED",
        "ELECTRO_ADHESION_ACTIVE": "ELECTRO_ADHESION_ACTIVE",
        "CAPTURED": "CAPTURED",
        "RELEASED": "RELEASED",
    }

    def set_gripper_state(self, state: str) -> bool:
        if not state:
            return False
        normalized = self.GRIPPER_NORMALIZATION.get(state.strip().upper())
        if normalized:
            self.gripper_state = normalized
            return True
        return False

    def update(self, dt: float, active_phase: str, gnc_mode: str) -> Dict[str, Any]:
        """
        Advance simulation physics, sensor fusion, and actuators by dt seconds.
        """
        # 1. Compute Guidance Force
        commanded_force = np.zeros(3)

        if gnc_mode == "ABORTING":
            # Maximum retro-thrust along -y (retreating along V-bar)
            commanded_force = np.array([0.0, -0.060, 0.0]) # 60 mN retro
            self.time_to_go = 999.0

        elif active_phase in ["APPROACH", "CAPTURE"]:
            # ZEM/ZEV feedback guidance towards docking port
            dist = np.linalg.norm(self.state[0:3])
            self.time_to_go = max(10.0, dist / max(0.05, abs(self.state[4])))

            a_cmd, zem, zev = self.guidance.compute_acceleration_command(
                current_state=self.state,
                target_state=self.target_state,
                time_to_go=self.time_to_go,
                max_accel=0.015 # m/s^2
            )
            commanded_force = a_cmd * self.thrusters.mass

            if active_phase == "CAPTURE" and dist < 0.8:
                self.gripper_state = "CAPTURED"

        elif active_phase == "INSPECTION":
            # Harmonic relative fly-around motion (out-of-plane circle)
            omega = self.cw_solver.omega
            target_radius = 15.0 # 15m inspection standoff
            t = time.time() - self.start_time
            # Commanded circular fly-around trajectory
            x_des = target_radius * np.sin(omega * t)
            z_des = target_radius * np.cos(omega * t)
            pos_err = np.array([x_des, -15.0, z_des]) - self.state[0:3]
            commanded_force = 0.005 * pos_err

        # Add any manual operator pulse
        commanded_force += self.pending_manual_thrust
        self.pending_manual_thrust = np.zeros(3) # Reset manual pulse

        # 2. Thruster Control Allocation & Fuel Burn
        nozzles, fuel_burned = self.thrusters.allocate_thrust(commanded_force, dt=dt)
        self.active_nozzles_firing = nozzles

        # Resulting applied acceleration
        actual_accel = np.sum([self.thrusters.thrust_directions[i] * nozzles[i] for i in range(8)], axis=0) / self.thrusters.mass

        # 3. Propagate Physical Orbit Dynamics via Clohessy-Wiltshire
        phi = self.cw_solver.state_transition_matrix(dt)
        propagated = np.dot(phi, self.state)
        propagated[3:6] += actual_accel * dt
        self.state = propagated

        # 4. Synthesize Sensor Measurements with Realistic Space Noise
        noise_vision = np.random.normal(0.0, 0.05, 3)
        measured_vision_pos = self.state[0:3] + noise_vision
        noise_lidar = np.random.normal(0.0, 0.015)
        measured_lidar_range = np.linalg.norm(self.state[0:3]) + noise_lidar

        # 5. UKF Sensor Fusion Step
        self.ukf.predict(phi, acceleration=actual_accel)
        filtered_state = self.ukf.update_optical_and_lidar(measured_vision_pos, measured_lidar_range)

        # 6. Attitude Quaternion & Reaction Wheel Dynamics
        # Slowly spin reaction wheels to absorb gravity gradient torques
        self.reaction_wheels_rpm += np.random.normal(0.0, 1.5, 3)
        # Small angular rate precession
        omega_deg = self.angular_rate + np.sin(time.time() * 0.2) * 0.005
        # Quaternion integration: dq/dt = 0.5 * q * [0, wx, wy, wz]
        qw, qx, qy, qz = self.quaternion
        w_rad = np.radians(omega_deg) * dt * 0.5
        new_q = np.array([
            qw - qx*w_rad[0] - qy*w_rad[1] - qz*w_rad[2],
            qx + qw*w_rad[0] + qy*w_rad[2] - qz*w_rad[1],
            qy + qw*w_rad[1] - qx*w_rad[2] + qz*w_rad[0],
            qz + qw*w_rad[2] + qx*w_rad[1] - qy*w_rad[0]
        ])
        self.quaternion = new_q / np.linalg.norm(new_q)

        # 7. Subsystem Thermals & Power
        self.battery_pct = max(10.0, self.battery_pct - (0.004 * dt))
        self.npu_temp_c = 42.0 + 3.5 * np.sin(time.time() * 0.08)

        # 8. Range, Velocity, and Safety KOZ metrics
        distance = float(np.linalg.norm(self.state[0:3]))
        rel_velocity = float(self.state[4])

        if distance > 25.0:
            koz_status = "NOMINAL"
        elif distance > 5.0:
            koz_status = "APPROACH_CORRIDOR"
        else:
            koz_status = "BREACH" if abs(rel_velocity) > 0.18 else "APPROACH_CORRIDOR"

        # Docking axis alignment error in degrees
        alignment_error = float(np.degrees(np.arctan2(
            np.linalg.norm([self.state[0], self.state[2]]),
            abs(self.state[1]) + 1e-5
        )))

        # Remaining Delta-V using Tsiolkovsky Rocket Equation
        delta_v = self.thrusters.isp_seconds * self.thrusters.g0 * np.log(
            self.thrusters.mass / (self.thrusters.dry_mass + 1e-6)
        )

        return {
            "chaser": {
                "position": [round(float(self.state[0]), 3), round(float(self.state[1]), 3), round(float(self.state[2]), 3)],
                "velocity": [round(float(self.state[3]), 4), round(float(self.state[4]), 4), round(float(self.state[5]), 4)],
                "quaternion": [round(float(self.quaternion[0]), 4), round(float(self.quaternion[1]), 4), round(float(self.quaternion[2]), 4), round(float(self.quaternion[3]), 4)],
                "angular_rate": [round(float(omega_deg[0]), 3), round(float(omega_deg[1]), 3), round(float(omega_deg[2]), 3)],
                "fuel_remaining_kg": round(float(self.thrusters.fuel_mass), 3),
                "delta_v_remaining_ms": round(float(delta_v), 1),
                "battery_pct": round(float(self.battery_pct), 1),
                "bus_voltage_v": 28.1,
                "reaction_wheels_rpm": [round(float(self.reaction_wheels_rpm[0]), 0), round(float(self.reaction_wheels_rpm[1]), 0), round(float(self.reaction_wheels_rpm[2]), 0)],
                "npu_temp_c": round(float(self.npu_temp_c), 1),
                "gripper_state": self.gripper_state,
                "active_thrusters": [round(float(t), 4) for t in self.active_nozzles_firing]
            },
            "target": {
                "distance_meters": round(distance, 2),
                "relative_velocity_ms": round(rel_velocity, 3),
                "koz_status": koz_status,
                "docking_alignment_error_deg": round(alignment_error, 2),
                "ai_confidence": round(float(np.clip(99.0 - (alignment_error * 0.5) + np.random.normal(0, 0.2), 85.0, 99.8)), 1)
            }
        }
