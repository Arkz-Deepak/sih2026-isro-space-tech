"""
FastAPI Server & Real-Time Telemetry Engine for Project ASTRA-CLEAN.
Streams high-frequency telemetry at 20 Hz via WebSockets and exposes REST telecommand endpoints.
"""

import asyncio
import time
from datetime import datetime
from typing import Set, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from schemas.telemetry import TelemetryPacket, CommandRequest, CommandResponse
from gnc.state_machine import MissionStateMachine
from gnc.mock_hil import HILSimulator
from gnc.orbit_solver import ClohessyWiltshireSolver

app = FastAPI(
    title="Project ASTRA-CLEAN Astrodynamics & Telemetry Bridge",
    description="Mission Control Backend for In-Orbit Servicing & Autonomous Space Debris Capture (SIH26226)",
    version="1.0.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core subsystems
state_machine = MissionStateMachine()
hil_sim = HILSimulator()
cw_solver = ClohessyWiltshireSolver(orbital_altitude_km=500.0)

# Connected WebSocket clients
active_connections: Set[WebSocket] = set()
mission_start_time = time.time()

@app.get("/")
async def root():
    return {
        "project": "ASTRA-CLEAN",
        "system": "Astrodynamics & Telemetry Bridge",
        "status": "ONLINE",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@app.get("/api/v1/mission/status")
async def get_mission_status():
    return {
        "active_phase": state_machine.current_phase,
        "gnc_mode": state_machine.gnc_mode,
        "met_seconds": round(time.time() - mission_start_time, 1),
        "clients_connected": len(active_connections)
    }

@app.post("/api/v1/commands/phase", response_model=CommandResponse)
async def transition_phase(cmd: CommandRequest):
    if not cmd.target_phase:
        raise HTTPException(status_code=400, detail="target_phase required")

    # Fetch latest telemetry snapshot for guard evaluation
    current_data = hil_sim.update(0.0, state_machine.current_phase, state_machine.gnc_mode)
    success, msg = state_machine.request_transition(cmd.target_phase, current_data, force=bool(cmd.force))

    if not success:
        raise HTTPException(status_code=400, detail=msg)

    return CommandResponse(
        success=True,
        status_code=200,
        message=msg,
        active_phase=state_machine.current_phase
    )

@app.post("/api/v1/commands/abort", response_model=CommandResponse)
async def emergency_abort(cmd: CommandRequest):
    state_machine.trigger_emergency_abort(cmd.reason or "Emergency Abort via GCS")
    return CommandResponse(
        success=True,
        status_code=200,
        message="CRITICAL: Emergency abort activated. Maximum retrograde burn initiated.",
        active_phase=state_machine.current_phase
    )

@app.post("/api/v1/commands/thruster_pulse", response_model=CommandResponse)
async def fire_thruster_pulse(cmd: CommandRequest):
    if not cmd.thruster_axis:
        raise HTTPException(status_code=400, detail="thruster_axis required (e.g. X+, X-, Y+, Y-, Z+, Z-)")
    hil_sim.fire_manual_pulse(cmd.thruster_axis, duration_sec=(cmd.pulse_duration_ms or 50)/1000.0)
    return CommandResponse(
        success=True,
        status_code=200,
        message=f"Fired {cmd.pulse_duration_ms or 50}ms pulse on {cmd.thruster_axis}",
        active_phase=state_machine.current_phase
    )

@app.post("/api/v1/commands/gripper", response_model=CommandResponse)
async def actuate_gripper(cmd: CommandRequest):
    if not cmd.gripper_state:
        raise HTTPException(status_code=400, detail="gripper_state required (e.g. DEPLOY, STOW, ENGAGE_ELECTRO_ADHESION, RELEASE)")
    success = hil_sim.set_gripper_state(cmd.gripper_state)
    if not success:
        raise HTTPException(status_code=400, detail=f"Invalid gripper state: {cmd.gripper_state}")
    return CommandResponse(
        success=True,
        status_code=200,
        message=f"Gripper mechanism transitioned to {hil_sim.gripper_state}",
        active_phase=state_machine.current_phase
    )

@app.post("/api/v1/simulation/reset", response_model=CommandResponse)
async def reset_simulation():
    global hil_sim, state_machine, mission_start_time
    state_machine = MissionStateMachine()
    hil_sim = HILSimulator()
    mission_start_time = time.time()
    return CommandResponse(
        success=True,
        status_code=200,
        message="Simulation reset to initial orbit phasing standoff position",
        active_phase=state_machine.current_phase
    )

@app.get("/api/v1/orbit/predicted_path")
async def get_predicted_path():
    """
    Returns 600-second predicted trajectory waypoints for 3D visualization.
    """
    trajectory = cw_solver.calculate_predicted_trajectory(hil_sim.state, horizon_sec=600.0, step_sec=15.0)
    return {"trajectory": trajectory}

@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    try:
        while True:
            # Keep-alive receive (optional client pings)
            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        active_connections.remove(websocket)
    except Exception:
        if websocket in active_connections:
            active_connections.remove(websocket)

# Background 20 Hz Telemetry Broadcast Loop
async def telemetry_broadcast_loop():
    dt = 0.05  # 20 Hz (50 ms)
    while True:
        try:
            # Step simulation physics
            sim_data = hil_sim.update(dt, state_machine.current_phase, state_machine.gnc_mode)
            met = time.time() - mission_start_time

            packet = TelemetryPacket(
                timestamp=datetime.utcnow().isoformat() + "Z",
                met_seconds=round(met, 2),
                phase=state_machine.current_phase,
                chaser=sim_data["chaser"],
                target=sim_data["target"],
                gnc_mode=state_machine.gnc_mode
            )

            # Broadcast to all connected Ground Control Stations
            if active_connections:
                payload = packet.model_dump_json()
                disconnected = set()
                for ws in active_connections:
                    try:
                        await ws.send_text(payload)
                    except Exception:
                        disconnected.add(ws)
                for ws in disconnected:
                    active_connections.remove(ws)

        except Exception as e:
            print(f"Error in telemetry broadcast: {e}")

        await asyncio.sleep(dt)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(telemetry_broadcast_loop())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
