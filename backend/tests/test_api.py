"""
Unit Tests for Project ASTRA-CLEAN REST API Endpoints.
Verifies phase transitions, GNC telecommands, gripper actuation,
sim speed scaling, autopilot mode, state persistence, and orbit predictions.
Run: python -m unittest backend/tests/test_api.py
"""

import sys
import os
import unittest

# Ensure backend directory is in python path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from main import app

class TestASTRAApiEndpoints(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_root_health(self):
        """Verify root health check endpoint returns 200 and project metadata."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("project"), "ASTRA-CLEAN")
        self.assertEqual(data.get("status"), "ONLINE")

    def test_02_mission_status(self):
        """Verify mission status returns active phase and GNC mode."""
        response = self.client.get("/api/v1/mission/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("active_phase", data)
        self.assertIn("gnc_mode", data)
        self.assertIn("met_seconds", data)

    def test_03_predicted_orbit_path(self):
        """Verify 600-second predicted trajectory waypoints."""
        response = self.client.get("/api/v1/orbit/predicted_path")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("trajectory", data)
        self.assertIsInstance(data["trajectory"], list)
        self.assertGreater(len(data["trajectory"]), 0)

    def test_04_phase_transition_with_override(self):
        """Verify forced phase transition commands succeed."""
        payload = {
            "command_type": "PHASE_TRANSITION",
            "target_phase": "PHASING",
            "force": True
        }
        response = self.client.post("/api/v1/commands/phase", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["active_phase"], "PHASING")

    def test_05_phase_transition_invalid_phase(self):
        """Verify invalid or forbidden phase without override returns 400."""
        payload = {
            "command_type": "PHASE_TRANSITION",
            "target_phase": "DEORBIT",
            "force": False
        }
        response = self.client.post("/api/v1/commands/phase", json=payload)
        self.assertEqual(response.status_code, 400)

    def test_06_thruster_pulse(self):
        """Verify cold-gas thruster pulse firing along body axes."""
        for axis in ["X+", "Y+", "Z-"]:
            payload = {
                "command_type": "THRUSTER_PULSE",
                "thruster_axis": axis,
                "pulse_duration_ms": 50
            }
            response = self.client.post("/api/v1/commands/thruster_pulse", json=payload)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json()["success"])

    def test_07_gripper_actions(self):
        """Verify gecko-gripper mechanism transitions (DEPLOY, ADHERE, STOW)."""
        valid_actions = ["DEPLOY", "ELECTRO_ADHESION_ACTIVE", "STOW"]
        for action in valid_actions:
            payload = {
                "command_type": "GRIPPER_ACTUATE",
                "gripper_state": action
            }
            response = self.client.post("/api/v1/commands/gripper", json=payload)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json()["success"])

    def test_08_simulation_speed(self):
        """Verify simulation time-scale speed multipliers."""
        for speed in [1.0, 2.0, 5.0, 10.0]:
            response = self.client.post("/api/v1/simulation/speed", json={"speed": speed})
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json()["success"])

    def test_09_autopilot_toggle(self):
        """Verify autonomous GNC sequencer engagement and disengagement."""
        for state in [True, False]:
            response = self.client.post("/api/v1/simulation/autopilot", json={"enabled": state})
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json()["success"])

    def test_10_save_and_load_checkpoint(self):
        """Verify save machine state persistence and checkpoint restore."""
        # 1. Save current checkpoint
        save_res = self.client.post("/api/v1/mission/save_checkpoint")
        self.assertEqual(save_res.status_code, 200)
        self.assertTrue(save_res.json()["success"])

        # 2. Restore checkpoint
        load_res = self.client.post("/api/v1/mission/load_checkpoint")
        self.assertEqual(load_res.status_code, 200)
        self.assertTrue(load_res.json()["success"])

    def test_11_emergency_abort(self):
        """Verify emergency abort retro-burn initiates critical retrograde burn."""
        payload = {
            "command_type": "EMERGENCY_ABORT",
            "reason": "CI Automated Safety Test"
        }
        response = self.client.post("/api/v1/commands/abort", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["active_phase"], "ABORT")

    def test_12_simulation_reset(self):
        """Verify simulation resets back to initial standoff condition."""
        response = self.client.post("/api/v1/simulation/reset")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["active_phase"], "STANDBY")

if __name__ == "__main__":
    unittest.main()
