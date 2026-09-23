"""
Unscented Kalman Filter (UKF) for 6-DoF Satellite Proximity Sensor Fusion.
Fuses Stereo Vision Keypoint pose, Micro-ToF LiDAR distance, and IMU gyro rates.
"""

import numpy as np
from typing import Tuple, Dict

class ProximityUKF:
    def __init__(self, dt: float = 0.05):
        self.dt = dt
        # State vector: [x, y, z, vx, vy, vz] in LVLH (meters, m/s)
        self.n_states = 6
        self.x = np.array([0.5, -80.0, 0.2, -0.01, 0.15, 0.005], dtype=float)

        # State covariance P (6x6)
        self.P = np.diag([2.0, 5.0, 2.0, 0.1, 0.2, 0.1])

        # Process noise covariance Q
        self.Q = np.diag([0.001, 0.001, 0.001, 0.0001, 0.0001, 0.0001])

        # Measurement noise covariance R
        # Vision pos [x, y, z] noise: ~0.15m; LiDAR range noise: ~0.02m
        self.R_vision = np.diag([0.15**2, 0.15**2, 0.15**2])
        self.R_lidar = np.array([[0.02**2]])

        # UKF Scaling parameters (Merwe Scaled Unscented Transform)
        self.alpha = 0.1
        self.beta = 2.0
        self.kappa = 0.0
        self.lambda_ = (self.alpha**2) * (self.n_states + self.kappa) - self.n_states

        # Weights for mean and covariance
        self.n_sigma = 2 * self.n_states + 1
        self.Wm = np.zeros(self.n_sigma)
        self.Wc = np.zeros(self.n_sigma)

        self.Wm[0] = self.lambda_ / (self.n_states + self.lambda_)
        self.Wc[0] = self.Wm[0] + (1 - self.alpha**2 + self.beta)
        for i in range(1, self.n_sigma):
            w = 1.0 / (2.0 * (self.n_states + self.lambda_))
            self.Wm[i] = w
            self.Wc[i] = w

    def _generate_sigma_points(self) -> np.ndarray:
        """
        Generate 2n + 1 sigma points around current mean state x with covariance P.
        """
        sigma_points = np.zeros((self.n_sigma, self.n_states))
        sigma_points[0] = self.x

        # Matrix square root using Cholesky decomposition
        scale = np.sqrt(self.n_states + self.lambda_)
        try:
            L = np.linalg.cholesky((self.P + self.P.T) / 2.0)
        except np.linalg.LinAlgError:
            # Fallback if P is slightly non-positive definite due to numerical precision
            L = np.diag(np.sqrt(np.maximum(np.diag(self.P), 1e-6)))

        for i in range(self.n_states):
            sigma_points[i + 1] = self.x + scale * L[:, i]
            sigma_points[self.n_states + i + 1] = self.x - scale * L[:, i]

        return sigma_points

    def predict(self, cw_state_transition_matrix: np.ndarray, acceleration: np.ndarray = None):
        """
        Time update: Propagate sigma points through Clohessy-Wiltshire physics model.
        """
        if acceleration is None:
            acceleration = np.zeros(3)

        sigmas = self._generate_sigma_points()
        propagated_sigmas = np.zeros_like(sigmas)

        for i in range(self.n_sigma):
            # Propagate through CW relative motion
            prop = np.dot(cw_state_transition_matrix, sigmas[i])
            # Apply control acceleration integration
            prop[3:6] += acceleration * self.dt
            propagated_sigmas[i] = prop

        # Compute predicted mean
        x_pred = np.sum(self.Wm[:, np.newaxis] * propagated_sigmas, axis=0)

        # Compute predicted covariance
        P_pred = np.zeros((self.n_states, self.n_states))
        for i in range(self.n_sigma):
            diff = propagated_sigmas[i] - x_pred
            P_pred += self.Wc[i] * np.outer(diff, diff)
        P_pred += self.Q

        self.x = x_pred
        self.P = P_pred
        return self.x, self.P

    def update_optical_and_lidar(self, vision_pos_meas: np.ndarray, lidar_range_meas: float) -> np.ndarray:
        """
        Measurement update: Fuses noisy optical 3D position and scalar LiDAR range.
        """
        sigmas = self._generate_sigma_points()

        # Measurement model h(x) produces 4D output: [x_vis, y_vis, z_vis, range_lidar]
        meas_dim = 4
        z_sigmas = np.zeros((self.n_sigma, meas_dim))

        for i in range(self.n_sigma):
            pos = sigmas[i, 0:3]
            rng = np.linalg.norm(pos)
            z_sigmas[i] = np.array([pos[0], pos[1], pos[2], rng])

        # Predicted measurement mean
        z_pred = np.sum(self.Wm[:, np.newaxis] * z_sigmas, axis=0)

        # Innovation covariance S and Cross-covariance Pxz
        R_combined = np.diag([0.15**2, 0.15**2, 0.15**2, 0.02**2])
        S = np.zeros((meas_dim, meas_dim))
        Pxz = np.zeros((self.n_states, meas_dim))

        for i in range(self.n_sigma):
            z_diff = z_sigmas[i] - z_pred
            x_diff = sigmas[i] - self.x
            S += self.Wc[i] * np.outer(z_diff, z_diff)
            Pxz += self.Wc[i] * np.outer(x_diff, z_diff)
        S += R_combined

        # Kalman Gain K = Pxz * S^-1
        K = np.dot(Pxz, np.linalg.inv(S))

        # Actual measurement vector
        z_actual = np.array([vision_pos_meas[0], vision_pos_meas[1], vision_pos_meas[2], lidar_range_meas])
        innovation = z_actual - z_pred

        # Updated state and covariance
        self.x = self.x + np.dot(K, innovation)
        self.P = self.P - np.dot(K, np.dot(S, K.T))

        return self.x
