"""
Clohessy-Wiltshire (CW) Astrodynamics Solver for Relative Satellite Motion.
Computes deterministic state transition matrices in the LVLH frame.
"""

import numpy as np
from typing import Tuple

# Earth gravitational parameter (m^3 / s^2)
MU_EARTH = 3.986004418e14
# Earth mean radius (m)
R_EARTH = 6378137.0

class ClohessyWiltshireSolver:
    def __init__(self, orbital_altitude_km: float = 500.0):
        """
        Initialize CW solver for a circular Low Earth Orbit.
        :param orbital_altitude_km: Orbit altitude above Earth surface in km.
        """
        self.orbit_radius = (orbital_altitude_km * 1000.0) + R_EARTH
        # Mean motion omega (rad/s) = sqrt(mu / r^3)
        self.omega = np.sqrt(MU_EARTH / (self.orbit_radius ** 3))
        self.period = 2.0 * np.pi / self.omega

    def state_transition_matrix(self, dt: float) -> np.ndarray:
        """
        Compute the 6x6 Clohessy-Wiltshire State Transition Matrix Phi(dt).
        State vector X = [x, y, z, vx, vy, vz]^T in LVLH frame:
        +x: Radial (outward)
        +y: In-Track (along velocity vector)
        +z: Cross-Track (normal to orbit plane)
        """
        w = self.omega
        sin_wt = np.sin(w * dt)
        cos_wt = np.cos(w * dt)

        # Top-left (position to position)
        phi_rr = np.array([
            [4.0 - 3.0 * cos_wt, 0.0, 0.0],
            [6.0 * (sin_wt - w * dt), 1.0, 0.0],
            [0.0, 0.0, cos_wt]
        ])

        # Top-right (velocity to position)
        phi_rv = np.array([
            [sin_wt / w, 2.0 * (1.0 - cos_wt) / w, 0.0],
            [2.0 * (cos_wt - 1.0) / w, (4.0 * sin_wt - 3.0 * w * dt) / w, 0.0],
            [0.0, 0.0, sin_wt / w]
        ])

        # Bottom-left (position to velocity)
        phi_vr = np.array([
            [3.0 * w * sin_wt, 0.0, 0.0],
            [6.0 * w * (cos_wt - 1.0), 0.0, 0.0],
            [0.0, 0.0, -w * sin_wt]
        ])

        # Bottom-right (velocity to velocity)
        phi_vv = np.array([
            [cos_wt, 2.0 * sin_wt, 0.0],
            [-2.0 * sin_wt, 4.0 * cos_wt - 3.0, 0.0],
            [0.0, 0.0, cos_wt]
        ])

        phi = np.zeros((6, 6))
        phi[0:3, 0:3] = phi_rr
        phi[0:3, 3:6] = phi_rv
        phi[3:6, 0:3] = phi_vr
        phi[3:6, 3:6] = phi_vv

        return phi

    def propagate_state(self, initial_state: np.ndarray, dt: float) -> np.ndarray:
        """
        Propagate 6-DoF relative state vector by time dt (seconds).
        :param initial_state: [x, y, z, vx, vy, vz]
        :param dt: Propagation delta time in seconds.
        :return: Propagated [x, y, z, vx, vy, vz]
        """
        phi = self.state_transition_matrix(dt)
        return np.dot(phi, initial_state)

    def calculate_predicted_trajectory(self, current_state: np.ndarray, horizon_sec: float = 600.0, step_sec: float = 10.0):
        """
        Generates an array of predicted 3D waypoints over the horizon for GCS visualization.
        """
        times = np.arange(0, horizon_sec + step_sec, step_sec)
        trajectory = []
        for t in times:
            propagated = self.propagate_state(current_state, t)
            trajectory.append({
                "time_offset_s": float(t),
                "position": [float(propagated[0]), float(propagated[1]), float(propagated[2])],
                "velocity": [float(propagated[3]), float(propagated[4]), float(propagated[5])]
            })
        return trajectory
