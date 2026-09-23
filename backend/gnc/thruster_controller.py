"""
Thruster Allocation Matrix & Reaction Wheel Controller for 6U Nano-Satellite.
Maps commanded forces and torques to 8 canted cold-gas nozzles with PWM duty cycling.
"""

import numpy as np
from typing import Dict, List, Tuple

class ThrusterController:
    def __init__(self, dry_mass_kg: float = 9.4, wet_mass_kg: float = 11.4):
        self.mass = wet_mass_kg
        self.dry_mass = dry_mass_kg
        self.fuel_mass = wet_mass_kg - dry_mass_kg
        self.isp_seconds = 65.0 # N2 cold gas specific impulse
        self.g0 = 9.80665

        # Maximum nominal thrust per nozzle in Newtons (10 mN)
        self.f_max = 0.010
        self.min_pulse_sec = 0.010 # 10 ms minimum impulse bit

        # Satellite body dimensions (6U: 0.366m x 0.226m x 0.100m)
        lx, ly, lz = 0.366, 0.226, 0.100

        # Thruster positions and unit thrust direction vectors (8 canted nozzles)
        # Position r_i from center of mass, direction d_i
        # Configured for coupled 6-DoF translation and rotation
        self.thruster_positions = np.array([
            [ lx/2,  ly/2,  lz/2], # T1
            [ lx/2, -ly/2,  lz/2], # T2
            [ lx/2,  ly/2, -lz/2], # T3
            [ lx/2, -ly/2, -lz/2], # T4
            [-lx/2,  ly/2,  lz/2], # T5
            [-lx/2, -ly/2,  lz/2], # T6
            [-lx/2,  ly/2, -lz/2], # T7
            [-lx/2, -ly/2, -lz/2], # T8
        ])

        # Canted thrust unit vectors (pointing at 30 deg cant angles)
        cant = np.radians(30.0)
        c, s = np.cos(cant), np.sin(cant)
        self.thrust_directions = np.array([
            [-c, -s,  0],  # T1
            [-c,  s,  0],  # T2
            [-c,  0, -s],  # T3
            [-c,  0,  s],  # T4
            [ c, -s,  0],  # T5
            [ c,  s,  0],  # T6
            [ c,  0, -s],  # T7
            [ c,  0,  s],  # T8
        ])

        # Construct 6x8 Control Allocation Matrix B
        # [Force (3); Torque (3)] = B * [u1, ..., u8]
        self.B = np.zeros((6, 8))
        for i in range(8):
            d_i = self.thrust_directions[i]
            r_i = self.thruster_positions[i]
            tau_i = np.cross(r_i, d_i) # Torque arm r x d
            self.B[0:3, i] = d_i
            self.B[3:6, i] = tau_i

        # Pseudoinverse allocation matrix B^+ = B^T * (B * B^T)^-1
        self.B_pinv = np.linalg.pinv(self.B)

    def allocate_thrust(self, commanded_force: np.ndarray, commanded_torque: np.ndarray = None, dt: float = 0.05) -> Tuple[np.ndarray, float]:
        """
        Allocate 3-axis force and torque to individual nozzle thrust values and compute fuel burn.

        :param commanded_force: [Fx, Fy, Fz] in Newtons
        :param commanded_torque: [Tx, Ty, Tz] in N*m (defaults to zero)
        :param dt: Control loop interval in seconds
        :return: (nozzle_thrusts_8, fuel_burned_kg)
        """
        if commanded_torque is None:
            commanded_torque = np.zeros(3)

        wrench = np.concatenate([commanded_force, commanded_torque])
        # Unconstrained pseudoinverse thrust command: u = B^+ * wrench
        u_raw = np.dot(self.B_pinv, wrench)

        # Enforce physical thruster bounds: 0 <= u_i <= f_max
        u_clamped = np.clip(u_raw, 0.0, self.f_max)

        # Pulse-width modulation (PWM) thresholding: pulses below min_pulse_sec are silenced
        # to prevent valve chattering
        effective_thrust = np.where(u_clamped > (self.f_max * 0.15), u_clamped, 0.0)

        # Total thrust force across all active nozzles
        total_thrust_newtons = np.sum(effective_thrust)

        # Fuel consumption via rocket mass flow rate: m_dot = F / (Isp * g0)
        fuel_burned_kg = (total_thrust_newtons / (self.isp_seconds * self.g0)) * dt
        self.fuel_mass = max(0.0, self.fuel_mass - fuel_burned_kg)
        self.mass = self.dry_mass + self.fuel_mass

        return effective_thrust, fuel_burned_kg
