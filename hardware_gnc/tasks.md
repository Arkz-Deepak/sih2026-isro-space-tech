# 🛠️ Flight Hardware & GNC Teammate Guide

> **Document:** `hardware_gnc/tasks.md`  
> **Target Role:** Flight Hardware & Embedded GNC Specialist (Teammate 3)  
> **Project:** ASTRA-CLEAN Hardware & Flight Subsystem (SIH26226)

---

## 🔀 Git Workflow & Contribution Rules (MANDATORY)

> [!WARNING]
> **DO NOT PUSH DIRECTLY TO `main`!**  
> All work must be done on a separate feature branch and submitted via a GitHub Pull Request (PR).

1. **Pull Latest `main`:**
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Create Your Feature Branch:**
   ```bash
   git checkout -b feat/hardware-<feature-name>
   # Example: git checkout -b feat/hardware-sensor-fusion
   ```
3. **Commit & Push Your Branch:**
   ```bash
   git add .
   git commit -m "feat(hardware): implement discrete UKF sensor fusion algorithms"
   git push -u origin feat/hardware-<feature-name>
   ```
4. **Open a Pull Request (PR):**
   * Go to [GitHub Repository](https://github.com/Arkz-Deepak/sih2026-isro-space-tech)
   * Click **Compare & pull request** targeting `main`.
   * Assign/Tag Team Leader (**Arkz-Deepak**) for code review and merge.

---

## 🎯 Primary Responsibilities
You are responsible for the physical and embedded flight architecture of the 6U CubeSat bus, sensor fusion, and actuator driver logic.

All architectural specifications, Bill of Materials (BOM), and mathematical algorithms are pre-defined for you in:
* 📄 [hardware_gnc/hardware_specs.md](file:///C:/Projects/sih2026/hardware_gnc/hardware_specs.md)
* 📄 [hardware_gnc/control_algorithms.md](file:///C:/Projects/sih2026/hardware_gnc/control_algorithms.md)

---

## 📋 Step-by-Step Task Deliverables

1. **Hardware In-the-Loop (HIL) Test Harness:**
   * Review the 6U CubeSat structural model and mass budget in `hardware_specs.md`.
   * Verify the power budget (80 Wh LiFePO4 battery vs 48W solar generation during eclipse cycles).
2. **Sensor Calibration & Fusion:**
   * Implement the discrete Unscented Kalman Filter (UKF) state estimator described in `control_algorithms.md`.
   * Fuse stereo optical camera keypoint outputs with micro-LiDAR range measurements.
3. **Actuator Driver Logic:**
   * Write the PWM thruster allocation matrix mapping 3-axis force ($F_x, F_y, F_z$) and torque ($\tau_x, \tau_y, \tau_z$) to the 8 canted cold-gas micro-nozzles.
   * Implement reaction wheel desaturation logic using the 3-axis magnetorquers.
4. **Bio-Inspired Gripper Verification:**
   * Finalize the electro-adhesive gecko pad activation sequence (1.5 kV high voltage trigger followed by tendon retraction).
