# 📖 The Definitive Guide to Project ASTRA-CLEAN
### Autonomous In-Orbit Servicing, Visual Docking & Active Debris Mitigation Nano-Satellite

> **Document:** `SYSTEM_EXPLANATION.md`  
> **Project:** ASTRA-CLEAN (Autonomous Satellite Tracking, Rendezvous & Active Debris Mitigation)  
> **SIH 2026 Problem Statement ID:** SIH26226 (Theme: Space Technology)  
> **Target Audience:** Evaluators, Team Members, Mentors, and Stakeholders

---

## 🌌 1. The Core Problem: Why Does ASTRA-CLEAN Exist?

### The Crisis in Low Earth Orbit (LEO)
Right now, Earth’s orbital highways are congested with over **30,000 trackable pieces of space debris** larger than 10 cm, alongside hundreds of thousands of smaller, lethal fragments traveling at orbital speeds of **$7.8\text{ km/s}$ ($28,000\text{ km/h}$)**. At this velocity, even a 1-centimeter paint fleck impacts with the kinetic energy of an exploding hand grenade.

This danger triggers the dreaded **Kessler Syndrome**: a catastrophic chain reaction where one orbital collision generates thousands of new debris pieces, eventually rendering entire orbital bands unusable for generations.

### India's Specific Strategic Need (ISRO 2026–2035)
India has launched landmark missions like Chandrayaan-3 and SPADEX, but faces three imminent strategic challenges:
1. **The SPADEX Follow-up & BAS-01 (Bharatiya Antariksh Station):** India plans to launch its first space station module by 2028 and complete the 5-module station by 2035. Space stations cannot be launched in a single rocket; they must be assembled module-by-module in orbit using **autonomous rendezvous and docking (RVD)**.
2. **Chandrayaan-4 Lunar Sample Return:** Requires an ascender module to autonomously dock with a transfer orbiter in lunar orbit without human teleoperation delays.
3. **IS4OM Mandate (ISRO System for Safe & Sustainable Space Operations Management):** ISRO is legally and strategically committed to mitigating orbital debris threatening India's high-value NavIC, GSAT, and RISAT communication and defence constellations.

### The Fatal Flaw of Existing Solutions
* **Human Teleoperation Fails:** In LEO, ground station contact windows last only 8–12 minutes per pass, and communication latency makes real-time manual docking impossible.
* **Robotic Harpoons & Nets Cause Explosions:** Firing harpoons into spent fuel tanks or dead satellites punctures pressurized vessels, causing catastrophic explosive fragmentation that generates thousands more debris particles.
* **Standard Claws Kick Debris Away:** In zero gravity, touching a tumbling dead satellite without friction bounces it off, imparting rotational momentum that sends it spinning uncontrollably.

---

## 💡 2. The Solution: What is Project ASTRA-CLEAN?

**ASTRA-CLEAN** is a **6U autonomous nano-satellite ($30 \times 20 \times 10\text{ cm}$, $<12\text{ kg}$)** equipped with edge artificial intelligence, deterministic orbital mechanics, cold-gas micro-propulsion, and a bio-inspired gecko-adhesive capture gripper.

It operates as an **autonomous space sweeper and robotic in-orbit mechanic**:
1. It maneuvers up to a target (a dead satellite, spent rocket stage, or space station module).
2. It uses stereo vision and LiDAR to detect the target in pitch-black space or harsh solar glare.
3. It estimates the target's 3D tumbling motion (6 degrees of freedom) in real time.
4. It matches the target's spin using cold-gas micro-thrusters and reaction wheels.
5. It attaches securely using **van der Waals electro-adhesion** (inspired by gecko lizards) without bouncing or shattering the target.
6. Once attached, it fires its thrusters to either push the target into a safe deorbit burn (burning up safely in Earth's upper atmosphere) or dock it into a space station port.

---

## 🧩 3. How the Subsystems Work Together

ASTRA-CLEAN is divided into three seamlessly linked tiers:

```
+-----------------------------------------------------------------------------------+
|                            PHYSICAL SATELLITE (HIL BUS)                           |
|  • Stereo Cameras + Micro-LiDAR Rangefinder                                       |
|  • NVIDIA Jetson Orin NX (Edge AI Pose Estimation @ 30 FPS)                      |
|  • 3-Axis Reaction Wheels + 8x Cold-Gas N2 Micro-Thrusters (10 mN impulse)       |
|  • Bio-Inspired Gecko-Adhesive Compliant Gripper                                  |
+-----------------------------------------------------------------------------------+
                                         ▲
                                         │  (CCSDS Telemetry / Fast Serial / CAN)
                                         ▼
+-----------------------------------------------------------------------------------+
|                        ASTRODYNAMICS & TELEMETRY BACKEND                          |
|  • Clohessy-Wiltshire (CW) Relative Orbital Mechanics Engine                      |
|  • Zero-Effort-Miss / Zero-Effort-Velocity (ZEM/ZEV) Guidance Algorithms          |
|  • GNC State Machine with Programmatic Safety Guards & Instant Abort Logic        |
|  • 20 Hz High-Frequency WebSocket Broadcasting Engine                             |
+-----------------------------------------------------------------------------------+
                                         ▲
                                         │  (WebSockets @ 20 Hz / JSON Telemetry)
                                         ▼
+-----------------------------------------------------------------------------------+
|                     MISSION CONTROL GROUND STATION (WEB GCS)                      |
|  • 3D Interactive Three.js Digital Twin (Earth, Orbit Trails, Keep-Out Zones)     |
|  • Optical Docking Heads-Up Display (HUD) with AI Keypoints & Crosshair           |
|  • Real-Time Subsystem Telemetry Gauges (Battery, Propellant, ADCS, NPU Temp)     |
|  • Telecommand Console with 2-Step Emergency Abort Interlock                      |
+-----------------------------------------------------------------------------------+
```

---

## 🔬 4. Deep-Dive: The Engineering Magic Under the Hood

### A. The Optical Vision & AI Perception Pipeline
* **The Challenge:** In space, there is no atmospheric scattering. An object is either in blinding direct sunlight ($1361\text{ W/m}^2$) or total black shadow. Traditional computer vision algorithms (like simple edge detection or RGB thresholding) completely fail.
* **ASTRA-CLEAN's Solution:**
  1. **Dual Global-Shutter Stereo Cameras (Sony IMX296):** Captures synchronized stereo frames at 60 FPS without rolling-shutter distortion.
  2. **Micro-Pulsed Time-of-Flight (ToF) LiDAR:** Fires laser pulses to measure distance with millimeter accuracy from 100 meters down to 10 centimeters, completely immune to light/shadow variations.
  3. **TensorRT-Quantized Keypoint Regression Net:** Running on an onboard **NVIDIA Jetson Orin NX (100 TOPS)**, the neural network detects 8 structural keypoints on the target satellite in $12\text{ ms}$.
  4. **Unscented Kalman Filter (UKF):** Fuses the visual keypoints, LiDAR distance, and onboard IMU gyroscopes to output a smooth, drift-free estimate of the target's relative position ($x, y, z$), velocity ($v_x, v_y, v_z$), and tumbling orientation (attitude quaternion $q_0, q_1, q_2, q_3$).

### B. Deterministic Orbital Mechanics: Why AI Alone Isn't Enough
* In space, standard physics intuition does not work. If you fire thrusters forward towards an object in front of you, you do **not** get closer—you increase your orbital energy, rise into a higher orbit, and actually fall *behind* the target!
* **The Clohessy-Wiltshire (CW) Equations:**  
  ASTRA-CLEAN uses the linearized Hill-Clohessy-Wiltshire equations in the **Local-Vertical Local-Horizontal (LVLH)** coordinate frame:
  $$\ddot{x} - 2\omega \dot{y} - 3\omega^2 x = f_x / m$$
  $$\ddot{y} + 2\omega \dot{x} = f_y / m$$
  $$\ddot{z} + \omega^2 z = f_z / m$$
  By solving these equations deterministically via the state transition matrix $\mathbf{\Phi}(t)$, our guidance algorithm calculates the exact fuel-optimal thrust pulses required along the **V-Bar (velocity vector)** to close the distance without orbital drift.
* **Keep-Out Zone (KOZ) & Artificial Potential Fields:**  
  A virtual safety ellipsoid is maintained around the target. If the satellite drifts off course or approaches too fast, repulsive potential fields automatically override manual inputs to prevent collisions.

### C. The Gecko-Inspired Electro-Adhesive Gripper
* **Why Gecko Adhesion?**  
  Gecko feet adhere to vertical glass using millions of microscopic setae that interact with surface molecules via intermolecular **van der Waals forces**.
* **Space-Grade Adaptation:**  
  ASTRA-CLEAN uses silicone micro-wedges embedded with flexible copper electrodes. When pressed against the debris surface:
  1. Slight shear tension engages van der Waals adhesion ($>4\text{ N/cm}^2$).
  2. A $1.5\text{ kV}$ electrostatic field induces dipole polarization on both metal and composite surfaces.
  3. This produces instantaneous, strong attachment **with zero bounce-back force**.
  4. Turning off the voltage releases the target instantly without residue.

---

## 🕹️ 5. Step-by-Step Mission Walkthrough

| Step | Mission Phase | Satellite Action | GCS Operator View | Safety Guard / Abort Condition |
| :--- | :--- | :--- | :--- | :--- |
| **1** | `STANDBY` | Full avionics diagnostics; solar panels deployed; NavIC satellite lock verified. | Green status check on all subsystem gauges. | Abort if battery $<70\%$ or cold-gas fuel $<1.0\text{ kg}$. |
| **2** | `PHASING` | Satellite performs Hohmann transfer to approach within $100\text{ m}$ along target's V-Bar. | 3D Viewport renders approaching trajectory spline. | Continuous collision prediction; auto-hold at $100\text{ m}$. |
| **3** | `APPROACH` | Closes distance from $100\text{ m}$ to $15\text{ m}$ at controlled speed ($<0.5\text{ m/s}$). | HUD displays AI bounding box and active crosshairs. | Abort if closing speed $>0.8\text{ m/s}$ or sensor dropout $>500\text{ ms}$. |
| **4** | `INSPECTION` | Performs autonomous $360^\circ$ fly-around to map target surface defects and spin rate. | Real-time point-cloud and defect wireframe rendered on GCS. | Maintain minimum $15\text{ m}$ clearance outside KOZ. |
| **5** | `CAPTURE` | Synchronizes rotational tumble, approaches docking axis, and engages gecko gripper. | HUD shows sub-centimeter alignment; gripper status changes to `ATTACHED`. | Contact speed strictly capped at $<0.15\text{ m/s}$ and angle error $<2.0^\circ$. |
| **6** | `DEORBIT` | Fires cold-gas thrusters in retrograde direction to lower perigee into Earth's atmosphere. | Trajectory plot shows descent curve into safe ocean disposal zone. | Verify complete burn termination before atmospheric entry. |

---

## 🏆 6. Why This Project Wins SIH 2026

1. **Not a Gimmick, Real Engineering:** Where other teams present conceptual slides or generic CAD files, ASTRA-CLEAN provides:
   * Real mathematical differential equations (Clohessy-Wiltshire & ZEM/ZEV).
   * A working, production-grade 3D Digital Twin Ground Control Station in Next.js & Three.js.
   * A 20 Hz WebSocket astrodynamics telemetry server in FastAPI.
   * Space-standard Bill of Materials (BOM) with ECSS power and mass budgets.
2. **Direct Strategic Alignment with India's Space Program:** Evaluators from ISRO/AICTE will immediately recognize the exact mission requirements of **SPADEX**, **Bharatiya Antariksh Station (BAS-01)**, and **IS4OM**.
3. **Provable Safety & Determinism:** Space missions demand 100% determinism. ASTRA-CLEAN’s combination of mathematical state transition matrices and artificial potential field Keep-Out Zones guarantees collision-free operations.
