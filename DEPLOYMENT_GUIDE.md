# 🚀 Project ASTRA-CLEAN - Deployment & CI/CD Guide

This guide covers deploying the **Project ASTRA-CLEAN** Ground Control Station to **Vercel**, deploying the **FastAPI GNC Astrodynamics Engine** to cloud hosting/VPS, and running the automated CI/CD pipeline.

---

## 🛰️ 1. Deploying Frontend to Vercel (Quickest - 60 Seconds)

### Option A: Via Vercel Web Dashboard (Recommended)
1. Go to [https://vercel.com/new](https://vercel.com/new).
2. Connect your GitHub account and select repository: `Arkz-Deepak/sih2026-isro-space-tech`.
3. In **Project Settings**:
   * **Framework Preset:** `Next.js`
   * **Root Directory:** Click "Edit" and choose `frontend` (or leave default root, as `vercel.json` is configured).
   * **Build Command:** `npm run build`
   * **Output Directory:** `.next`
4. *(Optional)* **Environment Variables**:
   * `NEXT_PUBLIC_BACKEND_URL`: URL of your deployed backend (e.g. `https://astra-backend.onrender.com` or leave empty for autonomous simulator mode).
   * `NEXT_PUBLIC_WS_URL`: WebSocket URL (e.g. `wss://astra-backend.onrender.com/ws/telemetry`).
5. Click **Deploy**.

> [!NOTE]
> **Autonomous Simulation Fallback:** If you deploy to Vercel without setting up a backend, the dashboard will **automatically engage the in-browser 20 Hz autonomous simulation engine**! The 3D CubeSat, attitude indicators, photorealistic HUD feed, and telemetry gauges will function immediately for hackathon evaluators.

---

### Option B: Via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy directly from frontend directory
cd frontend
vercel

# Deploy to production
vercel --prod
```

---

## ⚙️ 2. Deploying Backend FastAPI GNC Engine

### Option A: Free Cloud Host (Render / Railway / Fly.io)
The repository includes a production-ready `backend/Dockerfile`.

1. Go to [Render.com](https://render.com) -> **New Web Service**.
2. Select your repository `sih2026-isro-space-tech`.
3. Set:
   * **Root Directory:** `backend`
   * **Environment:** `Docker` (or `Python 3`)
   * **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Copy the assigned URL (e.g. `https://astra-backend.onrender.com`) and paste it as `NEXT_PUBLIC_BACKEND_URL` in your Vercel project settings.

---

### Option B: Linux VPS / AWS EC2 with Systemd Unit File
A production Linux systemd unit file is provided at [`backend/astra-backend.service`](file:///C:/Projects/sih2026/backend/astra-backend.service).

```bash
# 1. Clone repository onto server
sudo git clone https://github.com/Arkz-Deepak/sih2026-isro-space-tech.git /opt/astra-clean

# 2. Setup Python Virtual Environment
cd /opt/astra-clean/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Install Systemd Service Unit File
sudo cp /opt/astra-clean/backend/astra-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable astra-backend
sudo systemctl start astra-backend

# 4. Check Status & Journal Logs
sudo systemctl status astra-backend
journalctl -u astra-backend -f
```

---

## 🐳 3. Full-Stack Docker Compose Deployment

To deploy both frontend and backend on any server with a single command:

```bash
docker compose up -d --build
```
* **GCS Web Dashboard:** `http://localhost:3000`
* **GNC Backend API:** `http://localhost:8000`
* **API Documentation:** `http://localhost:8000/docs`

---

## 🧪 4. Unit Testing Suite

The project includes 18 unit tests across both orbital astrodynamics and REST telecommands:

```bash
# Run all unit tests
python -m unittest backend/tests/test_api.py simulation/test_gnc.py

# Run only GNC physics tests (Clohessy-Wiltshire, ZEM/ZEV, Thrusters, UKF)
python -m unittest simulation/test_gnc.py

# Run only REST API & safety guard tests
python -m unittest backend/tests/test_api.py
```

### Test Coverage Highlights:
1. **Clohessy-Wiltshire Dynamics:** Verifies $\Phi(0) = \mathbf{I}_{6\times 6}$ and V-bar drift stability.
2. **ZEM/ZEV Guidance:** Validates acceleration vector steering and terminal velocity nulling.
3. **Thruster Allocation:** Ensures positive PWM duty cycles and fuel mass tracking across all 8 cold-gas nozzles.
4. **Safety Guards:** Confirms illegal phase skips (e.g. attempting capture from 80m standoff or deorbit before docking) are strictly blocked with HTTP 400.
5. **Emergency Abort:** Verifies instantaneous 60 mN retro-burn triggering upon safety breach.

---

## 🔄 5. GitHub Actions CI/CD Pipeline

The `.github/workflows/ci.yml` pipeline automatically triggers on push and pull requests to `main`:

* **`backend-unit-tests`:** Runs Python 3.11 test suite against both algorithm logic and API endpoints.
* **`frontend-build`:** Validates TypeScript types (`npx tsc --noEmit`) and compiles Next.js production build (`npm run build`).
* **`docker-build`:** Validates that both backend and frontend Docker container images compile cleanly.
