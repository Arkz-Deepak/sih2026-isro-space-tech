"""
Zero-Effort-Miss / Zero-Effort-Velocity (ZEM/ZEV) Optimal Rendezvous Guidance.
Includes Artificial Potential Fields for Keep-Out Zone (KOZ) collision avoidance.
"""

import numpy as np
from typing import Tuple, Optional
from .orbit_solver import ClohessyWiltshireSolver

class ZEMZEVGuidance:
    def __init__(self, orbital_altitude_km: float = 500.0):
        self.cw_solver = ClohessyWiltshireSolver(orbital_altitude_km=orbital_altitude_km)
        # Keep-Out Zone parameters (safety ellipsoid semi-axes in meters)
        self.koz_radii = np.array([5.0, 8.0, 5.0]) # [Radial(x), In-Track(y), Cross-Track(z)]
        self.k_repulsive = 0.5 # Repulsive potential field gain

    def compute_acceleration_command(
        self,
        current_state: np.ndarray,
        target_state: np.ndarray,
        time_to_go: float,
        max_accel: float = 0.05
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Compute optimal guidance acceleration vector a_cmd = (6/tgo^2)*ZEM - (2/tgo)*ZEV
        plus KOZ repulsive potential field.

        :param current_state: [x, y, z, vx, vy, vz] in LVLH (m, m/s)
        :param target_state: [xf, yf, zf, vxf, vyf, vzf] in LVLH (m, m/s)
        :param time_to_go: Remaining rendezvous duration in seconds
        :param max_accel: Maximum thruster acceleration capability (m/s^2)
        :return: (a_cmd_total, zem_vector, zev_vector)
        """
        t_go = max(time_to_go, 0.5) # Prevent division by zero
        phi = self.cw_solver.state_transition_matrix(t_go)

        # Unforced terminal state prediction: X_pred = Phi * X_current
        x_pred = np.dot(phi, current_state)
        r_pred = x_pred[0:3]
        v_pred = x_pred[3:6]

        r_final = target_state[0:3]
        v_final = target_state[3:6]

        # Zero-Effort-Miss: Difference between desired final position and predicted position
        zem = r_final - r_pred
        # Zero-Effort-Velocity: Difference between desired final velocity and predicted velocity
        zev = v_final - v_pred

        # Nominal ZEM/ZEV optimal feedback acceleration command
        a_guidance = (6.0 / (t_go ** 2)) * zem - (2.0 / t_go) * zev

        # Calculate Keep-Out Zone (KOZ) repulsive acceleration
        a_repulsive = self._compute_koz_repulsion(current_state[0:3])

        # Total acceleration command
        a_total = a_guidance + a_repulsive

        # Saturate to thruster physical authority limit
        norm_a = np.linalg.norm(a_total)
        if norm_a > max_accel:
            a_total = (a_total / norm_a) * max_accel

        return a_total, zem, zev

    def _compute_koz_repulsion(self, position: np.ndarray) -> np.ndarray:
        """
        Computes artificial potential field repulsive vector if satellite nears the KOZ ellipsoid.
        """
        # Ellipsoidal distance metric: (x/rx)^2 + (y/ry)^2 + (z/rz)^2
        scaled_pos = position / self.koz_radii
        d_ellipsoid = np.linalg.norm(scaled_pos)

        # Repulsive buffer boundary at 1.5x ellipsoid semi-axes
        buffer_limit = 1.5
        if d_ellipsoid < buffer_limit and d_ellipsoid > 0.01:
            # Gradient pointing outwards from target center
            grad = scaled_pos / (d_ellipsoid * self.koz_radii)
            # Repulsive magnitude: k * (1/d - 1/d0)
            rep_mag = self.k_repulsive * (1.0 / d_ellipsoid - 1.0 / buffer_limit)
            return rep_mag * grad
        return np.zeros(3)
