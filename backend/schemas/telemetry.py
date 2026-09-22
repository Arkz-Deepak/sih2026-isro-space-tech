"""
Telemetry and Command Schemas for Project ASTRA-CLEAN.
Defines Pydantic models for real-time WebSocket telemetry and REST command validation.
"""

from typing import List, Literal, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class ChaserTelemetry(BaseModel):
    position: List[float] = Field(..., description="[x, y, z] in LVLH meters (Radial, In-Track, Cross-Track)")
    velocity: List[float] = Field(..., description="[vx, vy, vz] in m/s")
    quaternion: List[float] = Field(..., description="[q0, q1, q2, q3] Attitude unit quaternion")
    angular_rate: List[float] = Field(..., description="[wx, wy, wz] in deg/s")
    fuel_remaining_kg: float = Field(..., description="Cold-gas N2 propellant mass in kg")
    delta_v_remaining_ms: float = Field(..., description="Remaining delta-V budget in m/s")
    battery_pct: float = Field(..., description="Battery State of Charge (0-100%)")
    bus_voltage_v: float = Field(28.0, description="Main avionics bus voltage in Volts")
    reaction_wheels_rpm: List[float] = Field(..., description="[Rx, Ry, Rz] Reaction wheel RPM")
    npu_temp_c: float = Field(..., description="Jetson Orin NPU temperature in Celsius")

class TargetTelemetry(BaseModel):
    distance_meters: float = Field(..., description="Relative distance to target center of mass")
    relative_velocity_ms: float = Field(..., description="Closing / opening relative velocity in m/s")
    koz_status: Literal["NOMINAL", "APPROACH_CORRIDOR", "BREACH"] = Field(
        ..., description="Keep-Out Zone safety corridor status"
    )
    docking_alignment_error_deg: float = Field(
        ..., description="Angular deviation from target docking axis in degrees"
    )
    ai_confidence: float = Field(..., description="TensorRT optical keypoint pose estimation confidence (0-100%)")

class TelemetryPacket(BaseModel):
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    met_seconds: float = Field(..., description="Mission Elapsed Time in seconds")
    phase: Literal[
        "STANDBY",
        "PHASING",
        "APPROACH",
        "INSPECTION",
        "CAPTURE",
        "DEORBIT",
        "ABORT"
    ] = Field(..., description="Current autonomous GNC mission phase")
    chaser: ChaserTelemetry
    target: TargetTelemetry
    gnc_mode: Literal["AUTONOMOUS", "MANUAL_OVERRIDE", "ABORTING"] = Field(
        "AUTONOMOUS", description="Flight guidance authority mode"
    )

class CommandRequest(BaseModel):
    command_type: Literal["PHASE_TRANSITION", "EMERGENCY_ABORT", "THRUSTER_PULSE", "GRIPPER_ACTUATE"]
    target_phase: Optional[str] = None
    thruster_axis: Optional[Literal["X+", "X-", "Y+", "Y-", "Z+", "Z-"]] = None
    pulse_duration_ms: Optional[int] = 50
    gripper_state: Optional[Literal["DEPLOY", "STOW", "ENGAGE_ELECTRO_ADHESION", "RELEASE"]] = None
    reason: Optional[str] = "Operator commanded via GCS"

class CommandResponse(BaseModel):
    success: bool
    status_code: int
    message: str
    active_phase: str
