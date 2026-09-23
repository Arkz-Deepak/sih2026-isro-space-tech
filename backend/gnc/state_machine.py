"""
Mission Phase State Machine & Safety Interlock Engine.
Manages deterministic transitions, Keep-Out Zone (KOZ) guards, and instantaneous emergency abort routines.
"""

from typing import Tuple, Dict, Any

class MissionStateMachine:
    PHASES = ["STANDBY", "PHASING", "APPROACH", "INSPECTION", "CAPTURE", "DEORBIT", "ABORT"]

    def __init__(self):
        self.current_phase = "STANDBY"
        self.gnc_mode = "AUTONOMOUS"
        self.abort_reason = None

    def request_transition(self, target_phase: str, telemetry: Dict[str, Any], force: bool = False) -> Tuple[bool, str]:
        """
        Evaluate safety guards before transitioning to target phase.
        If force=True, bypasses strict range guards for operator/demo override.
        """
        if self.current_phase == "ABORT" and target_phase != "STANDBY":
            return False, "Vehicle is in ABORT state. Transition to STANDBY required to reset flight computer."

        if target_phase == "ABORT":
            self.trigger_emergency_abort("Operator or safety commanded abort")
            return True, "Emergency abort initiated immediately."

        if target_phase not in self.PHASES:
            return False, f"Unknown phase: {target_phase}"

        if force:
            self.current_phase = target_phase
            self.gnc_mode = "AUTONOMOUS"
            return True, f"[OVERRIDE ACTIVE] Forced transition to {target_phase}"

        chaser = telemetry.get("chaser", {})
        target = telemetry.get("target", {})
        battery = chaser.get("battery_pct", 0)
        fuel = chaser.get("fuel_remaining_kg", 0)
        distance = target.get("distance_meters", 9999.0)
        closing_speed = abs(target.get("relative_velocity_ms", 999.0))
        alignment_error = target.get("docking_alignment_error_deg", 999.0)

        # Transition Guards
        if target_phase == "PHASING":
            if battery < 70.0:
                return False, f"Guard violation: Battery ({battery}%) must be >= 70%"
            if fuel < 1.0:
                return False, f"Guard violation: Fuel ({fuel} kg) must be >= 1.0 kg"

        elif target_phase == "APPROACH":
            if distance > 150.0:
                return False, f"Guard violation: Distance ({distance:.1f} m) must be <= 150 m to enter approach"
            if closing_speed > 0.8:
                return False, f"Guard violation: Relative closing speed ({closing_speed:.2f} m/s) too high (max 0.8 m/s)"

        elif target_phase == "INSPECTION":
            if distance > 25.0:
                return False, f"Guard violation: Distance ({distance:.1f} m) must be <= 25 m for fly-around inspection"

        elif target_phase == "CAPTURE":
            if distance > 2.0:
                return False, f"Guard violation: Distance ({distance:.2f} m) must be <= 2.0 m for capture contact"
            if alignment_error > 3.0:
                return False, f"Guard violation: Alignment error ({alignment_error:.1f} deg) must be <= 3.0 deg"
            if closing_speed > 0.15:
                return False, f"Guard violation: Contact closing speed ({closing_speed:.2f} m/s) must be <= 0.15 m/s"

        self.current_phase = target_phase
        return True, f"Successfully transitioned to {target_phase}"

    def trigger_emergency_abort(self, reason: str):
        """
        Instantaneous transition to ABORT with maximum retrograde thrust.
        """
        self.current_phase = "ABORT"
        self.gnc_mode = "ABORTING"
        self.abort_reason = reason
