"""
Unit & Integration Test Suite for Project ASTRA-CLEAN GNC Subsystems.
Verifies Clohessy-Wiltshire state transition, ZEM/ZEV guidance, thruster allocation, and state machine.
Run: python -m unittest simulation/test_gnc.py
"""

import unittest
import sys
import os
import numpy as np

# Add backend directory to sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from gnc.orbit_solver import ClohessyWiltshireSolver
from gnc.guidance_zem_zev import ZEMZEVGuidance
from gnc.thruster_controller import ThrusterController
from gnc.state_machine import MissionStateMachine
from gnc.ukf_estimator import ProximityUKF

class TestASTRAAlgorithms(unittest.TestCase):

    def setUp(self):
        self.cw = ClohessyWiltshireSolver(orbital_altitude_km=500.0)
        self.guidance = ZEMZEVGuidance(orbital_altitude_km=500.0)
        self.thrusters = ThrusterController(dry_mass_kg=9.4, wet_mass_kg=11.4)
        self.sm = MissionStateMachine()
        self.ukf = ProximityUKF(dt=0.05)

    def test_cw_identity_at_t_zero(self):
        """Verify that Clohessy-Wiltshire transition matrix is Identity at dt = 0."""
        phi_0 = self.cw.state_transition_matrix(0.0)
        np.testing.assert_array_almost_equal(phi_0, np.eye(6), decimal=5)

    def test_cw_periodicity_and_drift(self):
        """Verify that stationary state on V-bar remains constant over time (unforced)."""
        # A satellite on V-bar with 0 radial displacement and 0 velocity has no radial drift
        initial_state = np.array([0.0, -50.0, 0.0, 0.0, 0.0, 0.0])
        propagated = self.cw.propagate_state(initial_state, dt=100.0)
        # Radial (x) and cross-track (z) must remain 0
        self.assertAlmostEqual(propagated[0], 0.0, places=4)
        self.assertAlmostEqual(propagated[2], 0.0, places=4)
        self.assertAlmostEqual(propagated[1], -50.0, places=4)

    def test_zem_zev_steers_towards_target(self):
        """Verify that ZEM/ZEV guidance outputs acceleration vector pointing to target origin."""
        current_state = np.array([2.0, -20.0, 1.0, 0.0, 0.05, 0.0])
        target_state = np.zeros(6)
        a_cmd, zem, zev = self.guidance.compute_acceleration_command(
            current_state, target_state, time_to_go=60.0
        )
        # Should command positive acceleration along y to close the -20m gap
        self.assertGreater(a_cmd[1], 0.0)

    def test_thruster_allocation_forces(self):
        """Verify that thruster allocation produces non-negative nozzle thrusts."""
        force_cmd = np.array([0.010, 0.020, -0.005])
        nozzles, fuel = self.thrusters.allocate_thrust(force_cmd, dt=0.05)
        self.assertEqual(len(nozzles), 8)
        self.assertTrue(np.all(nozzles >= 0.0))
        self.assertGreater(fuel, 0.0)

    def test_state_machine_guards(self):
        """Verify that state machine blocks illegal phase skips and low-battery transitions."""
        # Cannot jump directly to CAPTURE from STANDBY
        telemetry = {"chaser": {"battery_pct": 50.0}, "target": {"distance_meters": 100.0}}
        success, msg = self.sm.request_transition("CAPTURE", telemetry)
        self.assertFalse(success)

        # Cannot transition to PHASING if battery is low (< 70%)
        success, msg = self.sm.request_transition("PHASING", telemetry)
        self.assertFalse(success)
        self.assertIn("Guard violation", msg)

    def test_emergency_abort(self):
        """Verify that emergency abort triggers immediately regardless of state."""
        self.sm.trigger_emergency_abort("Collision risk detected")
        self.assertEqual(self.sm.current_phase, "ABORT")
        self.assertEqual(self.sm.gnc_mode, "ABORTING")

if __name__ == '__main__':
    unittest.main()
