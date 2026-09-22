# 🧠 Guidance, Navigation & Control (GNC) Algorithms & Sensor Fusion

> **Document:** `hardware_gnc/control_algorithms.md`  
> **Target Role:** GNC Specialist & Flight Software Engineer  
> **Project:** ASTRA-CLEAN Autonomous GNC Subsystem (SIH26226)

---

## 🧭 Unscented Kalman Filter (UKF) for 6-DoF Pose & Velocity Estimation

To fuse asynchronous measurements from the **Stereo Vision Keypoint Detector**, **ToF LiDAR**, and **Inertial Measurement Unit (IMU)**, an Unscented Kalman Filter is implemented.

### 1. State Vector Definition
The 16-dimensional filter state is:
$$\mathbf{x} = \begin{bmatrix} \mathbf{r}^T & \mathbf{v}^T & \mathbf{q}^T & \boldsymbol{\omega}^T & \mathbf{b}_a^T & \mathbf{b}_g^T \end{bmatrix}^T$$
Where:
* $\mathbf{r} = [x, y, z]^T$: Relative position in LVLH frame ($m$)
* $\mathbf{v} = [v_x, v_y, v_z]^T$: Relative velocity ($m/s$)
* $\mathbf{q} = [q_0, q_1, q_2, q_3]^T$: Relative attitude unit quaternion
* $\boldsymbol{\omega} = [\omega_x, \omega_y, \omega_z]^T$: Relative angular velocity ($rad/s$)
* $\mathbf{b}_a, \mathbf{b}_g$: Accelerometer and Gyroscope sensor bias vectors

### 2. Measurement Models
* **LiDAR Range Measurement:**
  $$z_{\text{lidar}} = \|\mathbf{r}\| + v_{\text{lidar}}, \quad v_{\text{lidar}} \sim \mathcal{N}(0, \sigma_{\text{lidar}}^2)$$
* **Optical Vision 6-DoF Pose:**
  $$\mathbf{z}_{\text{vision}} = \begin{bmatrix} \mathbf{r}_{\text{vision}} \\ \mathbf{q}_{\text{vision}} \end{bmatrix} + \mathbf{v}_{\text{vision}}$$
* **NavIC Carrier-Phase & Doppler (Phasing Phase):**
  $$z_{\rho} = \rho + c(\delta t_r - \delta t^s) + I + T + \epsilon_{\rho}$$

---

## 🎯 Proximity Operations Guidance: ZEM/ZEV Algorithm

During close-range approach ($< 100\text{ m}$), the autonomous flight software enforces **Zero-Effort-Miss (ZEM)** and **Zero-Effort-Velocity (ZEV)** feedback guidance to ensure collision-free trajectory tracking along the target's V-Bar (velocity vector):

$$\mathbf{a}_{\text{cmd}}(t) = \frac{6}{t_{\text{go}}^2} \mathbf{ZEM}(t) - \frac{2}{t_{\text{go}}} \mathbf{ZEV}(t)$$

Where:
$$\mathbf{ZEM}(t) = \mathbf{r}_f - [\mathbf{\Phi}_{rr}(t_{\text{go}})\mathbf{r}(t) + \mathbf{\Phi}_{rv}(t_{\text{go}})\mathbf{v}(t)]$$
$$\mathbf{ZEV}(t) = \mathbf{v}_f - [\mathbf{\Phi}_{vr}(t_{\text{go}})\mathbf{r}(t) + \mathbf{\Phi}_{vv}(t_{\text{go}})\mathbf{v}(t)]$$

* $\mathbf{r}_f, \mathbf{v}_f$ are the target rendezvous position and docking velocity ($< 0.05\text{ m/s}$).
* $t_{\text{go}} = t_f - t$ is the continuously adapted time-to-go.

---

## 🛡️ Artificial Potential Field for Keep-Out Zone (KOZ) Enforcement

To prevent accidental collision with solar panels or antennas of the target satellite, a repulsive potential field $U_{\text{rep}}(\mathbf{r})$ is superimposed on the guidance commands:

$$U_{\text{rep}}(\mathbf{r}) = \begin{cases} \frac{1}{2} k_{\text{rep}} \left(\frac{1}{d(\mathbf{r})} - \frac{1}{d_0}\right)^2 & \text{if } d(\mathbf{r}) \le d_0 \\ 0 & \text{if } d(\mathbf{r}) > d_0 \end{cases}$$

Where $d(\mathbf{r})$ is the distance to the safety ellipsoid boundary and $d_0 = 2.5\text{ m}$ is the security buffer.

---

## ⚡ Thruster Allocation & Pulse-Width Modulation (PWM)

The 6-DoF cold-gas propulsion system features 8 canted nozzles. A linear programming control allocation matrix maps commanded force $\mathbf{F}_{\text{cmd}}$ and torque $\boldsymbol{\tau}_{\text{cmd}}$ to individual nozzle firing times:

$$\begin{bmatrix} \mathbf{F}_{\text{cmd}} \\ \boldsymbol{\tau}_{\text{cmd}} \end{bmatrix} = \mathbf{B}_{6 \times 8} \mathbf{u}, \quad 0 \le u_i \le T_{\text{max}}$$

The minimum impulse bit is **$10\text{ ms}$**, preventing chattering and preserving $N_2$ propellant.
