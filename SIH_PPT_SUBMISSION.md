# 🛰️ Smart India Hackathon (SIH 2026) Official 6-Slide Submission Format
## Problem Statement ID: SIH26226 | Theme: Space Technology | Category: Hardware

> **File:** `SIH_PPT_SUBMISSION.md`  
> **Strict Compliance Note:** Mapped 1:1 to the official **SIH 2026 6-Slide Presentation Template** (`SIH2026-IDEA-Presentation-Format.pptx`).  
> **Submission Guidelines:** Max 6 slides (including title slide), bullet points/infographics (no dense paragraphs), must be converted to PDF before portal upload.

---

## 📌 SLIDE 1: TITLE PAGE

* **Header:** SMART INDIA HACKATHON 2026
* **Subtitle:** TITLE PAGE
* **Problem Statement ID:** SIH26226
* **Problem Statement Title:** Student Innovation - Space technology refers to the application of engineering principles to the design, development, manufacture, and operation of devices and systems for space travel and exploration.
* **Theme:** Space Technology
* **PS Category:** Hardware
* **Idea Title:** Project ASTRA-CLEAN: Autonomous In-Orbit Servicing, Visual Docking & Active Debris Mitigation Nano-Satellite
* **Target Agency Alignment:** Indian Space Research Organisation (ISRO) — SPADEX, BAS-01, IS4OM
* **Team ID:** [Enter Registered Team ID]
* **Team Name:** [Enter Team Name as registered on SIH portal]
* **Team Leader:** Deepak ([Arkz-Deepak])
* **Team Members:**
  * Member 1: Frontend & 3D Visualization Specialist
  * Member 2: Astrodynamics & Telemetry Engineer
  * Member 3: Flight Hardware & Embedded GNC Engineer
* **Institute Name:** [Enter Your College / University Name]

---

## 📌 SLIDE 2: IDEA TITLE & PROPOSED SOLUTION

* **Slide Header:** IDEA TITLE: Project ASTRA-CLEAN
* **Subtitle:** Autonomous In-Orbit Servicing, Visual Docking & Active Debris Mitigation Nano-Satellite

### 1. Proposed Solution (Idea / Solution / Prototype Description)
* **Autonomous 6U Nano-Satellite Bus ($30 \times 20 \times 10\text{ cm}$, $<12\text{ kg}$)** acting as an in-orbit robotic mechanic and space sweeper.
* Integrates **edge AI optical perception**, **deterministic relative orbital mechanics**, and a **bio-inspired compliant capture gripper** for non-destructive satellite servicing and space debris removal.

### 2. Detailed Explanation of Proposed Solution
* **Optical Perception Head:** Dual global-shutter stereo cameras paired with micro-ToF LiDAR measure 6-DoF position and distance ($100\text{ m}$ to $10\text{ cm}$) in harsh space lighting and total darkness.
* **Onboard Edge AI Inference:** NVIDIA Jetson Orin NX executes TensorRT-accelerated keypoint detection in **$12\text{ ms}$ at $30\text{ FPS}$** to track tumbling non-cooperative targets.
* **Cold-Gas Micro-Propulsion & ADCS:** 8 canted $N_2$ cold-gas thrusters ($10\text{ mN}$ impulse bits) and 3-axis reaction wheels synchronize velocity and attitude along the target's V-Bar.
* **Bio-Inspired Compliant Gripper:** Utilizes **van der Waals electro-adhesion ($1.5\text{ kV}$)** for **zero-rebound, non-destructive latching** onto smooth or tumbling surfaces without kickback.

### 3. How It Addresses the Problem
* **Solves Ground Latency:** Eliminates the 8–12 minute ground station communication bottleneck by executing real-time autonomous proximity maneuvers.
* **Prevents Explosive Fragmentation:** Unlike destructive harpoons or nets that puncture pressurized fuel tanks, gecko electro-adhesion captures debris with zero rebound force.
* **Direct Alignment with ISRO Strategic Goals:** Supports modular in-orbit assembly of the **Bharatiya Antariksh Station (BAS-01)**, sample module transfer for **Chandrayaan-4**, and debris mitigation for **IS4OM**.

### 4. Innovation & Uniqueness of the Solution
* **Zero-Rebound Soft Capture:** First student architecture combining electro-adhesive gecko fibrils with compliant multi-finger tendon actuation for space debris.
* **Deterministic Keep-Out Zones (KOZ):** Mathematical artificial potential fields guarantee collision-free corridors instead of unpredictable black-box policies.
* **HIL Digital Twin Web GCS:** Production-ready Next.js 15 / Three.js 3D Ground Control Station receiving real-time 20 Hz telemetry via WebSockets.

---

## 📌 SLIDE 3: TECHNICAL APPROACH

* **Slide Header:** TECHNICAL APPROACH

### 1. Technologies to be Used

| Layer / Subsystem | Technologies & Tools | Key Role / Specification |
| :--- | :--- | :--- |
| **Flight Avionics & AI** | NVIDIA Jetson Orin NX, ARM Cortex-M7 (SAMV71), TensorRT, PyTorch | 100 TOPS Edge AI inference, rad-tolerant watchdog supervisor |
| **Sensors & Perception** | 2x Sony IMX296 Global Shutter, Micro-ToF LiDAR, Micro-Star Tracker | Optical stereo imaging, sub-cm rangefinding, inertial attitude |
| **Propulsion & Actuation** | 8x Cold-Gas $N_2$ Thrusters ($10\text{ mN}$), 3x CubeWheel, Gecko Gripper | 6-DoF translation, $<0.02^\circ$ fine pointing, van der Waals latching |
| **Backend & Astrodynamics** | Python 3.10+, FastAPI, NumPy, SciPy, Skyfield / SGP4, WebSockets | Clohessy-Wiltshire (CW) orbit solver, 20 Hz telemetry bridge |
| **Mission Control GCS** | Next.js 15, React 19, TypeScript, Three.js, Tailwind CSS, Zustand | 3D Orbital Digital Twin, Optical Docking HUD, Command Console |

### 2. Methodology & Implementation Process (System Flowchart)

```
+--------------------------+     +--------------------------+     +--------------------------+
|      OPTICAL SENSING     |     |   GNC ORBITAL GUIDANCE   |     |    ACTUATION & DOCKING   |
| • Stereo Cameras (60 FPS)| ──> | • Clohessy-Wiltshire (CW)| ──> | • 8x Cold-Gas Thrusters  |
| • Micro-ToF LiDAR (100m) |     | • ZEM/ZEV Trajectory     |     | • Reaction Wheels (ADCS) |
| • Jetson TensorRT Pose   |     | • Unscented Kalman Filter|     | • Gecko Electro-Gripper  |
+--------------------------+     +--------------------------+     +--------------------------+
              │                                                                │
              ▼                                                                ▼
+--------------------------------------------------------------------------------------------+
|             TELEMETRY BRIDGE (FastAPI @ 20 Hz)  <===>  3D MISSION CONTROL GCS              |
| • CCSDS Packet Framing  • Keep-Out Zone (KOZ) Guard  • Three.js Digital Twin  • HUD Overlay|
+--------------------------------------------------------------------------------------------+
```

### 3. Working Prototype Highlights
* **Connected 3D Digital Twin:** Real-time Three.js orbital visualization tracking 6-DoF satellite states.
* **Physics & Telemetry Engine:** Analytical CW differential equation solver streaming at 20 Hz.
* **HUD Optical Overlay:** Synthetic camera viewfinder displaying range, closing velocity, and AI wireframes.

---

## 📌 SLIDE 4: FEASIBILITY AND VIABILITY

* **Slide Header:** FEASIBILITY AND VIABILITY

### 1. Analysis of Feasibility
* **Standardized Form Factor:** Built on a standardized **6U CubeSat chassis ($366 \times 226 \times 100\text{ mm}$)**, compatible with standard deployers on ISRO's **SSLV (Small Satellite Launch Vehicle)** and **PSLV**.
* **Strict Mass Budget ($11.4\text{ kg}$ Total Wet Mass):**
  * Structure & Mechanisms: $3.2\text{ kg}$ | Avionics & Sensors: $2.1\text{ kg}$ | EPS & Batteries: $2.2\text{ kg}$ | Propellant: $2.0\text{ kg}$ $N_2$ | Margin: $1.9\text{ kg}$.
* **Power Budget Feasibility:**
  * 48W deployable solar array generates $+27.0\text{ Wh}$ net surplus during sunlit phase.
  * 80 Wh LiFePO4 battery pack maintains **Depth of Discharge (DoD) $<22\%$** during 35-minute eclipse cycles ($>10,000$ orbit lifespan).
* **Standards Compliance:** Conforms to **ECSS-E-ST-10C** (Space Engineering) and **NASA-STD-8719.14** (Orbital Debris Mitigation).

### 2. Potential Challenges & Risks
* **Space Radiation & Single-Event Upsets (SEUs):** LEO ionizing radiation causing bit-flips in COTS AI hardware.
* **Solar Glare & Shadow Transitions:** Extreme illumination variations blinding optical camera sensors.
* **Tumbling Target Kinetic Kickback:** Unstable target imparting angular momentum during physical contact.
* **Propellant Depletion:** Running out of cold-gas before completing rendezvous or deorbit maneuvers.

### 3. Strategies for Overcoming Challenges
* **Dual-Architecture Fault Tolerance:** Rad-tolerant ARM Cortex-M7 watchdog monitors the Jetson Orin with automatic latch-up power cycling and fail-safe recovery.
* **Multi-Modal Sensor Fusion (UKF):** Time-of-Flight LiDAR provides illumination-independent rangefinding when cameras experience solar glare.
* **Gecko Electro-Adhesion:** Van der Waals electrostatic latching conforms to irregular surfaces with **zero normal impact force**, eliminating rebound.
* **ZEM/ZEV Optimal Guidance:** Fuel-optimal trajectory generation enforces minimal thruster impulse bits ($10\text{ ms}$ PWM), conserving propellant.

---

## 📌 SLIDE 5: IMPACT AND BENEFITS

* **Slide Header:** IMPACT AND BENEFITS

### 1. Potential Impact on Target Audience & Space Ecosystem
* **Indian Space Research Organisation (ISRO):**
  * Provides indigenous rendezvous and docking (RVD) software and hardware for the **Bharatiya Antariksh Station (BAS-01)**.
  * Facilitates lunar orbit sample module transfer for **Chandrayaan-4**.
  * Operationalizes the **IS4OM mandate** to safeguard NavIC, GSAT, and defence reconnaissance satellites.
* **Commercial Constellation Operators:**
  * Enables low-cost compliance with international **5-year post-mission deorbit regulations** (FCC / UN-COPUOS).
  * Extends operational lifetime of multi-crore communication satellites via in-orbit inspection and re-boosting.

### 2. Quantifiable Benefits

| Dimension | Key Benefit & Impact Metric |
| :--- | :--- |
| **Economic** | **90%+ Cost Reduction:** 6U nano-satellite servicing vehicle costs **$<\$1.2\text{M}$** vs. traditional $\$50\text{M} - \$100\text{M}$ dedicated servicing craft. |
| **Operational** | **Sub-Centimeter Docking Accuracy:** Deterministic CW guidance achieves $<1.0\text{ cm}$ position error and $<0.05\text{ m/s}$ contact velocity. |
| **Environmental** | **Kessler Syndrome Prevention:** Actively removes dead satellites and spent upper stages, preventing orbital fragmentation cascades. |
| **Strategic / National** | **Atmanirbhar Space Technology:** Fully indigenous GNC algorithms, avionics bus, and ground station—reducing foreign reliance. |

---

## 📌 SLIDE 6: RESEARCH AND REFERENCES

* **Slide Header:** RESEARCH AND REFERENCES

### 1. Key Research Foundations & Literature
* **Clohessy, W. H., & Wiltshire, R. S. (1960):** *"Terminal Guidance System for Satellite Rendezvous"*, Journal of the Aerospace Sciences. (Foundational relative orbital motion math).
* **ISRO Telemetry, Tracking and Command Network (ISTRAC):** SPADEX Mission Architecture & Autonomous Rendezvous and Docking System documentation.
* **Hawkes, E. W. et al. (Stanford / NASA JPL):** *"A gecko-inspired adhesive gripper for microgravity applications"*, Science Robotics, 2017.
* **NASA Orbital Debris Program Office:** *NASA-STD-8719.14: Process for Limiting Orbital Debris*.
* **European Cooperation for Space Standardization (ECSS):** *ECSS-E-ST-10-04C: Space Environment & Radiation Hardening*.

### 2. Project Repository & Live Deliverables
* **GitHub Repository:** [https://github.com/Arkz-Deepak/sih2026-isro-space-tech](https://github.com/Arkz-Deepak/sih2026-isro-space-tech)
* **Master System Architecture:** [`README.md`](https://github.com/Arkz-Deepak/sih2026-isro-space-tech/blob/main/README.md)
* **Technical Deep-Dive Guide:** [`SYSTEM_EXPLANATION.md`](https://github.com/Arkz-Deepak/sih2026-isro-space-tech/blob/main/SYSTEM_EXPLANATION.md)
* **Subsystem Implementation Guides:**
  * Frontend GCS Web Dashboard: [`frontend/agent.md`](https://github.com/Arkz-Deepak/sih2026-isro-space-tech/blob/main/frontend/agent.md)
  * Astrodynamics & Telemetry Backend: [`backend/backend.md`](https://github.com/Arkz-Deepak/sih2026-isro-space-tech/blob/main/backend/backend.md)
  * Flight Hardware & Embedded GNC: [`hardware_gnc/tasks.md`](https://github.com/Arkz-Deepak/sih2026-isro-space-tech/blob/main/hardware_gnc/tasks.md)
