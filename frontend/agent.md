# 🤖 Frontend Agent Guide: Mission Control Ground Control Station (GCS)

> **Document:** `frontend/agent.md`  
> **Target Role:** Frontend Software Engineer / Autonomous UI Agent  
> **Project:** ASTRA-CLEAN Ground Control Station (SIH26226)  
> **Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Three.js / React Three Fiber, Lucide-React, Recharts, Zustand

---

## 🎯 Mission Statement & Purpose
You are responsible for building the **ASTRA-CLEAN Ground Control Station (GCS)** web platform. This interface serves as the primary ground-station dashboard used by ISRO flight controllers and hackathon evaluators to monitor, visualize, and command our 6U nano-satellite during in-orbit rendezvous, visual docking, and space debris capture.

The UI must balance **aesthetic brilliance** (aerospace dark-mode sci-fi HUD) with **rigorous engineering utility** (deterministic real-time telemetry, sub-millisecond 3D rendering, mission safety interlocks).

---

## 🎨 UI/UX Design System & Aesthetics

* **Theme:** Deep Space Aerospace / Tactical Telemetry Console
* **Color Palette:**
  * Background Base: `#0B0F19` (Obsidian Space)
  * Card / Panel Surface: `#111827` with subtle border `#1F2937`
  * Primary Accent: `#00F0FF` (Neon Cyan / Optical Sensor Glow)
  * Secondary Accent: `#7C3AED` (Deep Space Violet)
  * Telemetry Nominal: `#10B981` (Laser Emerald Green)
  * Warning / Approach Alert: `#F59E0B` (Telemetry Amber)
  * Critical / Abort / Breach: `#EF4444` (Emergency Red)
* **Typography:**
  * UI Text: `Inter` or system sans-serif
  * Telemetry / Numbers: `JetBrains Mono` or `Share Tech Mono` (monospace alignment is mandatory for jitter-free numbers)

---

## 🏗️ Architectural Component Breakdown

```
frontend/
├── app/
│   ├── layout.tsx             # Root dark layout, telemetry header, status bar
│   ├── page.tsx               # Main Dashboard Grid (Viewport + Panels)
│   └── globals.css            # Custom scanline, glow, and HUD animations
├── components/
│   ├── Viewport3D.tsx         # Three.js 3D Orbital & Rendezvous Digital Twin
│   ├── HUDOverlay.tsx         # Optical Docking Camera HUD with AI wireframe
│   ├── TelemetryGrid.tsx      # Real-time subsystem gauges & time-series charts
│   ├── CommandConsole.tsx     # Mission state transitions & Emergency Abort
│   ├── OrbitMap.tsx           # 2D Earth ground-track & NavIC station coverage
│   └── TopNavBar.tsx          # Connection state, mission elapsed time (MET), UTC
├── hooks/
│   └── useTelemetrySocket.ts  # WebSocket client with auto-reconnect & parsing
├── store/
│   └── telemetryStore.ts      # Zustand global state for high-frequency telemetry
└── types/
    └── telemetry.ts           # TypeScript interfaces matching backend models
```

---

## 🧩 Detailed Component Specifications

### 1. `components/Viewport3D.tsx` (3D Digital Twin Viewport)
* **Purpose:** Render real-time 3D simulation of the rendezvous operation between the ASTRA Chaser CubeSat and the Target (debris/space station).
* **Key Requirements:**
  * **Scene:** High-resolution Earth globe with diffuse day/night texture, specular water reflection, and atmospheric glow shader.
  * **Chaser Model (ASTRA):** 6U CubeSat with deployable solar panels, camera lens housing, 8 cold-gas thruster nozzles, and 3-finger compliant gripper.
  * **Target Model:** Tumbling non-cooperative satellite body (e.g., spent rocket upper stage or retired satellite).
  * **Dynamic Trajectory Spline:** Draw the Clohessy-Wiltshire relative orbit path in cyan as received from telemetry.
  * **Safety Ellipsoid (Keep-Out Zone - KOZ):**
    * Render a translucent 3D ellipsoid around the target.
    * Dynamically shift color: Emerald (`#10B981`) when nominal, Amber (`#F59E0B`) inside the approach corridor, Red (`#EF4444`) on breach.
  * **Camera Modes:**
    * Free Orbit Controls (User can pan/tilt/zoom around the scene).
    * Chaser Chase-Cam (Third-person view locked behind ASTRA).
    * Sensor Boresight (First-person view looking through ASTRA's optical camera).

### 2. `components/HUDOverlay.tsx` (Optical Docking HUD)
* **Purpose:** Emulate the edge AI computer vision view seen by the Jetson Orin onboard ASTRA.
* **Key Requirements:**
  * Render a high-tech crosshair centered on the target docking port.
  * 3D Bounding Box / Keypoint Wireframe tracking the target orientation.
  * Monospace Telemetry Badges:
    * `RANGE: 14.82 m` (Color shifts to green as distance reaches $< 1.0\text{ m}$)
    * `CLOSING_RATE: -0.12 m/s` (Warns red if velocity $> 0.25\text{ m/s}$)
    * `ATTITUDE_OFFSET: P: +1.2° | Y: -0.4° | R: +0.1°`
    * `AI_TRACK_CONFIDENCE: 99.1%` (TensorRT Keypoint Net status)

### 3. `components/TelemetryGrid.tsx` (Subsystem Gauges)
* **Purpose:** Display real-time flight data at 20 Hz without UI stutter.
* **Gauges & Metrics:**
  * **Power Subsystem (EPS):** Battery State of Charge (%), Solar Array Generation ($W$), 28V Bus Voltage.
  * **Propulsion Subsystem:** $N_2$ Cold-Gas Pressure (Bar), Remaining Fuel Mass ($kg$), Total Available $\Delta V$ ($m/s$).
  * **Attitude Determination & Control (ADCS):** Reaction wheel speeds ($X, Y, Z$ in RPM), Sun sensor status, Star tracker lock flag.
  * **Thermal Subsystem:** Jetson Orin NPU Temp ($^\circ\text{C}$), Battery Temp ($^\circ\text{C}$), Gripper Actuator Temp ($^\circ\text{C}$).
  * **Communications & NavIC:** NavIC L5/S Carrier-to-Noise ($C/N_0$), Downlink Data Rate ($Mbps$), Packet Loss (%).

### 4. `components/CommandConsole.tsx` (Telecommand Panel)
* **Purpose:** Provide authorized ground operators the ability to progress mission phases or abort.
* **Controls:**
  * **Mission Phase Selector:** Step buttons for:
    1. `PHASE_0: STANDBY & SYSTEM CHECK`
    2. `PHASE_1: ORBIT PHASING (FAR RENDEZVOUS)`
    3. `PHASE_2: V-BAR IN-PLANE APPROACH`
    4. `PHASE_3: AUTONOMOUS FLY-AROUND INSPECTION`
    5. `PHASE_4: FINAL CONTACT & COMPLIANT CAPTURE`
    6. `PHASE_5: DEORBIT BURNING`
  * **Emergency Abort Switch:**
    * Big, prominent button styled with emergency hazard stripes.
    * Includes a 2-step confirmation modal ("CONFIRM IMMEDIATE RETRO-BURN ABORT?").
    * Sends `POST /api/v1/commands/abort` to immediately command thrusters to fire max reverse thrust.
  * **Gripper Test Toggle:** Manual deploy/retract test for the gecko-adhesive mechanism.

---

## 📡 Data Flow & WebSocket Integration

* **WebSocket URL:** `ws://localhost:8000/ws/telemetry`
* **Incoming Telemetry Schema:**
```typescript
export interface TelemetryPacket {
  timestamp: string;
  met_seconds: number; // Mission Elapsed Time
  phase: 'STANDBY' | 'PHASING' | 'APPROACH' | 'INSPECTION' | 'CAPTURE' | 'DEORBIT';
  chaser: {
    position: [number, number, number]; // [x, y, z] in meters (LVLH frame)
    velocity: [number, number, number]; // [vx, vy, vz] in m/s
    quaternion: [number, number, number, number]; // [q0, q1, q2, q3]
    angular_rate: [number, number, number]; // [wx, wy, wz] in deg/s
    fuel_remaining_kg: number;
    delta_v_remaining_ms: number;
    battery_pct: number;
    reaction_wheels_rpm: [number, number, number];
    npu_temp_c: number;
  };
  target: {
    distance_meters: number;
    relative_velocity_ms: number;
    koz_status: 'NOMINAL' | 'APPROACH_CORRIDOR' | 'BREACH';
    docking_alignment_error_deg: number;
    ai_confidence: number;
  };
  gnc_mode: 'AUTONOMOUS' | 'MANUAL_OVERRIDE' | 'ABORTING';
}
```

* **Handling High Frequencies (20 Hz):**
  * Store the latest packet in Zustand without triggering unnecessary full-page re-renders.
  * Use `requestAnimationFrame` inside `Viewport3D.tsx` to interpolate satellite motion smoothly between telemetry ticks.
  * Cap historical graph data in `TelemetryGrid.tsx` to the latest 60 seconds (1200 data points) using sliding window buffers.

---

## 🛠️ Step-by-Step Implementation Checklist for Frontend Agent

1. **Setup & Dependencies:**
   - Initialize Next.js project with App Router, TypeScript, and Tailwind CSS.
   - Install dependencies: `lucide-react`, `three`, `@types/three`, `zustand`, `recharts`, `clsx`, `tailwind-merge`.
2. **State & Networking:**
   - Create `store/telemetryStore.ts` with Zustand.
   - Create `hooks/useTelemetrySocket.ts` to manage WebSocket lifecycle with heartbeat and reconnects.
3. **3D Viewport:**
   - Implement `components/Viewport3D.tsx` with Three.js canvas. Add Earth mesh, directional solar light, and CubeSat geometries.
   - Bind satellite position and rotation to `chaser.position` and `chaser.quaternion`.
4. **HUD & Telemetry Panels:**
   - Build `HUDOverlay.tsx` with tactical SVG crosshairs, AI bounding boxes, and range metrics.
   - Build `TelemetryGrid.tsx` with responsive cards, monospace values, and mini sparkline charts.
5. **Command & Safety:**
   - Build `CommandConsole.tsx` with interactive phase switches and protected Abort trigger.
6. **Integration & Polish:**
   - Add sound effects (optional toggle for telemetry click / alert beeps).
   - Ensure zero layout shift and flawless 60 FPS rendering.
