# 🔩 Hardware Specifications & Bill of Materials (BOM)

> **Document:** `hardware_gnc/hardware_specs.md`  
> **Target Role:** Flight Hardware & Embedded Systems Engineer  
> **Project:** ASTRA-CLEAN 6U Nano-Satellite Bus (SIH26226)  
> **Reference Standards:** ECSS (European Cooperation for Space Standardization) & ISRO Nano-Satellite Standards

---

## 🛰️ 6U CubeSat Structural Configuration

* **Form Factor:** Standard 6U CubeSat ($366 \times 226 \times 100\text{ mm}$)
* **Total Wet Mass:** $11.4\text{ kg}$ (including $2.0\text{ kg}$ $N_2$ propellant)
* **Chassis Material:** Space-grade Aluminum 7075-T6 with Hard Anodization and Alodine 1200 coating for thermal emissivity and atomic oxygen resistance in LEO.
* **Internal Volume Allocation:**
  * **1U:** Optical Sensor Head & Time-of-Flight LiDAR Rangefinder
  * **1U:** Edge AI Avionics (NVIDIA Jetson Orin NX + Radiation-tolerant FPGA Watchdog)
  * **1U:** Electrical Power System (EPS) & LiFePO4 Battery Pack (80 Wh)
  * **1U:** Attitude Determination & Control System (ADCS Reaction Wheels + Magnetorquers)
  * **1.5U:** Cold-Gas Propulsion Module (Carbon-overwrapped pressure vessel + 8 micro-thrusters)
  * **0.5U:** Bio-Inspired Compliant Gecko-Adhesive Capture Gripper (stowed on forward face)

---

## 📋 Comprehensive Bill of Materials (BOM)

| Subsystem | Component | Make / Part # | Mass (g) | Power (W) | Critical Function |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Avionics & AI** | Edge AI Flight Computer | NVIDIA Jetson Orin NX (16GB) | 160 | 15.0 | 100 TOPS AI inference for real-time 6-DoF optical pose estimation |
| **Avionics & Watchdog**| Radiation-Tolerant MCU | Microchip SAMV71Q21 (ARM Cortex-M7) | 45 | 1.2 | Rad-hardened supervisor, latch-up detection, and low-level thruster pulse generator |
| **Perception** | Stereo Optical Cameras | 2x Sony IMX296 Global Shutter Sensors | 90 | 2.4 | Synchronized stereoscopic imaging at 60 FPS under varying solar illumination |
| **Perception** | Micro-ToF LiDAR | Livox Mid-360 Space-modified / Benewake | 265 | 6.5 | 100m to 10cm precise relative distance and surface mesh scanning |
| **ADCS** | 3-Axis Reaction Wheels | CubeSpace CubeWheel Small (3x) | 480 | 3.6 | Fine pointing accuracy ($< 0.02^\circ$) and slewing during rendezvous |
| **ADCS** | Micro-Star Tracker | Leonardo / NanoAvionics Mini-ST | 180 | 1.8 | Absolute inertial attitude determination ($< 5\text{ arcsec}$) |
| **ADCS** | 3-Axis Magnetorquers | ISIS Space Magnetic Torquer Rods | 150 | 1.5 | Desaturation of reaction wheels using Earth's geomagnetic field |
| **Propulsion** | Cold-Gas Thruster Block| GomSpace NanoSpace MPS / Custom $N_2$ | 2100 (wet)| 4.0 (peak)| 8x 10 mN nozzles providing full 6-DoF translational and rotational control |
| **Power (EPS)** | Deployable Solar Panels | EnduroSat 6U Triple-Junction InGaP/GaAs | 650 | - (Generates 48W) | 29.5% efficiency solar cells with active sun-tracking deployment |
| **Power (EPS)** | Battery Module | 4S4P LiFePO4 (28V Bus, 80 Wh) | 850 | - | Safe chemistry, high cycle life, integrated cell balancing and heaters |
| **RF / Comms** | S-Band Transceiver | Syrlinks EWC27 S-Band Transceiver | 320 | 8.5 | High-speed telemetry downlink (2 Mbps) and telecommand uplink (64 kbps) |
| **Mechanism** | Compliant Gecko Gripper | Custom Titanium-Carbon Fiber 3-finger | 420 | 3.0 (actuation)| Reversible electro-adhesive pads for capturing smooth/tumbling debris surfaces |

---

## ⚡ Power Budget (Orbital Worst-Case Analysis)

| Operating Mode | Duration / Orbit | Average Power Consumed | Solar Generation | Energy Balance |
| :--- | :--- | :--- | :--- | :--- |
| **Sunlight Nominal (Orbit Phasing)** | 55 min | 18.5 W | +48.0 W | +27.0 Wh (Charging) |
| **Eclipse Standby** | 35 min | 9.2 W | 0.0 W | -5.37 Wh (Discharging) |
| **Close Proximity & AI Docking** | 20 min | 34.5 W (Jetson @ Max) | +48.0 W (Sun) | +4.5 Wh (Nominal) |
| **Emergency Abort Burn** | 3 min | 28.0 W | 0.0 W | -1.4 Wh (Safe margin) |

* **Battery Depth of Discharge (DoD):** Maintained below **$22\%$** in worst-case eclipse scenarios, guaranteeing $>10,000$ orbit cycles.

---

## 🦎 Bio-Inspired Electro-Adhesive Gecko Gripper Design

### Why Gecko-Adhesion Wins for Space Debris
Capturing non-cooperative space debris is plagued by two fatal issues:
1. Traditional mechanical claws bounce off flat satellite surfaces or impart destabilizing kickback forces, accelerating debris tumbling.
2. Harpoons or nets create secondary fragmentations, violating ISRO/IADC space debris mitigation guidelines.

### Technical Implementation:
* **Micro-Structured Synthetic Gecko Fibrils:** Millions of microscopic wedge-shaped silicone/polyurethane stalks generate massive **van der Waals adhesion** ($> 4\text{ N/cm}^2$) upon slight shear displacement.
* **Electro-Adhesive Enhancement:** Embedded interdigitated copper electrodes generate a localized high-voltage electrostatic field ($1.5\text{ kV}$, $< 100\ \mu\text{A}$), inducing dipole polarization in both metallic and dielectric target surfaces.
* **Reversibility:** Instant zero-force release achieved by turning off the electrostatic voltage and releasing shear tension.
