export interface ChaserTelemetry {
  position: [number, number, number]; // [x, y, z] in LVLH meters
  velocity: [number, number, number]; // [vx, vy, vz] in m/s
  quaternion: [number, number, number, number]; // [q0, q1, q2, q3]
  angular_rate: [number, number, number]; // [wx, wy, wz] in deg/s
  fuel_remaining_kg: number;
  delta_v_remaining_ms: number;
  battery_pct: number;
  bus_voltage_v: number;
  reaction_wheels_rpm: [number, number, number];
  npu_temp_c: number;
}

export interface TargetTelemetry {
  distance_meters: number;
  relative_velocity_ms: number;
  koz_status: "NOMINAL" | "APPROACH_CORRIDOR" | "BREACH";
  docking_alignment_error_deg: number;
  ai_confidence: number;
}

export interface TelemetryPacket {
  timestamp: string;
  met_seconds: number;
  phase: "STANDBY" | "PHASING" | "APPROACH" | "INSPECTION" | "CAPTURE" | "DEORBIT" | "ABORT";
  chaser: ChaserTelemetry;
  target: TargetTelemetry;
  gnc_mode: "AUTONOMOUS" | "MANUAL_OVERRIDE" | "ABORTING";
}
