"use client";

import React, { useState } from "react";
import { useTelemetryStore } from "../store/telemetryStore";
import { AlertOctagon, CheckCircle2, RotateCcw, Play, Zap, Shield, ShieldAlert, Sparkles, Save, Download, Gauge } from "lucide-react";

export default function CommandConsole() {
  const { currentTelemetry } = useTelemetryStore();
  const [loadingPhase, setLoadingPhase] = useState<string | null>(null);
  const [demoOverride, setDemoOverride] = useState(true); // Default to true so user can test any state easily!
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "warning" | "error" | "info" }>({
    text: "Flight Computer Online. Select a phase or enable Auto-Pilot.",
    type: "info",
  });
  const [isAutoPilot, setIsAutoPilot] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);

  const handleSimSpeed = async (speed: number) => {
    setSimSpeed(speed);
    try {
      const res = await fetch("http://localhost:8000/api/v1/simulation/speed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speed }),
      });
      const data = await res.json();
      setStatusMessage({ text: data.message || `Simulation dynamic speed set to ${speed}x`, type: "success" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAutoPilotToggle = async () => {
    const nextState = !isAutoPilot;
    setIsAutoPilot(nextState);
    try {
      const res = await fetch("http://localhost:8000/api/v1/simulation/autopilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextState }),
      });
      const data = await res.json();
      setStatusMessage({
        text: data.message || (nextState ? "Autonomous GNC Auto-Pilot Engaged: Proceeding to docking target" : "Auto-Pilot Disengaged: Operator manual control active"),
        type: nextState ? "success" : "info",
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveCheckpoint = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/mission/save_checkpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ text: data.message, type: "success" });
      } else {
        setStatusMessage({ text: data.detail || "Failed to save state checkpoint", type: "warning" });
      }
    } catch (e) {
      setStatusMessage({ text: "Error connecting to backend checkpoint endpoint", type: "error" });
    }
  };

  const handleLoadCheckpoint = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/mission/load_checkpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ text: data.message, type: "success" });
      } else {
        setStatusMessage({ text: data.detail || "No saved checkpoint found to restore", type: "warning" });
      }
    } catch (e) {
      setStatusMessage({ text: "Error connecting to backend checkpoint endpoint", type: "error" });
    }
  };

  const activePhase = currentTelemetry?.phase ?? "STANDBY";
  const gncMode = currentTelemetry?.gnc_mode ?? "AUTONOMOUS";

  const handlePhaseTransition = async (phase: string) => {
    setLoadingPhase(phase);
    try {
      const res = await fetch("http://localhost:8000/api/v1/commands/phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command_type: "PHASE_TRANSITION",
          target_phase: phase,
          force: demoOverride,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({
          text: `Flight Guard Blocked: ${data.detail}. (Tip: Enable 'Demo Override' to bypass range checks)`,
          type: "warning",
        });
      } else {
        setStatusMessage({
          text: `Command Accepted: Transitioned to ${phase} phase.`,
          type: "success",
        });
      }
    } catch (e) {
      setStatusMessage({ text: "Failed to connect to backend server on port 8000.", type: "error" });
    } finally {
      setLoadingPhase(null);
    }
  };

  const handleManualPulse = async (axis: string) => {
    try {
      await fetch("http://localhost:8000/api/v1/commands/thruster_pulse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command_type: "THRUSTER_PULSE",
          thruster_axis: axis,
          pulse_duration_ms: 50,
        }),
      });
      setStatusMessage({ text: `Fired 50ms cold-gas pulse on axis ${axis}`, type: "info" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleGripperAction = async (state: string) => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/commands/gripper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command_type: "GRIPPER_ACTUATE",
          gripper_state: state,
        }),
      });
      const data = await res.json();
      setStatusMessage({ text: `Gripper mechanism: ${state}`, type: "success" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleReset = async () => {
    try {
      await fetch("http://localhost:8000/api/v1/simulation/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      setStatusMessage({ text: "Simulation reset back to 80m standoff phasing position.", type: "info" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAbort = async () => {
    try {
      await fetch("http://localhost:8000/api/v1/commands/abort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command_type: "EMERGENCY_ABORT",
          reason: "Manual operator trigger from Mission Control Console",
        }),
      });
      setStatusMessage({
        text: "CRITICAL: EMERGENCY RETRO-BURN ACTIVATED. Maximum reverse thrust firing!",
        type: "error",
      });
    } catch (e) {
      console.error(e);
    }
  };

  const phases = ["STANDBY", "PHASING", "APPROACH", "INSPECTION", "CAPTURE", "DEORBIT"];

  return (
    <div className="aerospace-panel p-4 rounded-xl font-tactical border border-space-700/80 flex flex-col gap-3">
      {/* Top Header & Toggles */}
      <div className="flex flex-wrap items-center justify-between border-b border-space-800 pb-2.5 gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-300 tracking-wider">FLIGHT PHASE GUIDANCE & TELECOMMANDS</span>
          <span className={`px-2 py-0.5 text-[10px] rounded font-bold ${
            gncMode === "ABORTING" ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse" :
            "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
          }`}>
            MODE: {gncMode}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* Demo Override Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer bg-space-900 border border-space-700 px-2.5 py-1 rounded text-[11px] select-none hover:border-cyan-400 transition-colors">
            <input
              type="checkbox"
              checked={demoOverride}
              onChange={(e) => setDemoOverride(e.target.checked)}
              className="accent-cyan-400 cursor-pointer"
            />
            <span className="text-gray-300">DEMO OVERRIDE</span>
            <span className={`text-[9px] px-1 rounded font-bold ${demoOverride ? "bg-cyan-500/20 text-cyan-300" : "text-gray-500"}`}>
              {demoOverride ? "ACTIVE" : "STRICT"}
            </span>
          </label>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1 bg-space-800 hover:bg-space-700 border border-space-600 rounded text-gray-300 text-[11px] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>RESET SIM</span>
          </button>
        </div>
      </div>

      {/* Dynamic Simulation Controls & Checkpoint Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-space-950/70 border border-space-800 text-xs">
        {/* Left: Sim Speeds & Auto-Pilot */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Auto-Pilot Toggle */}
          <button
            onClick={handleAutoPilotToggle}
            className={`flex items-center gap-1.5 px-3 py-1 rounded border transition-all text-[11px] font-bold ${
              isAutoPilot
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.3)] animate-pulse"
                : "bg-space-900 border-space-700 text-gray-400 hover:text-white"
            }`}
          >
            <Play className="w-3 h-3" />
            <span>AUTOPILOT: {isAutoPilot ? "ENGAGED" : "OFF"}</span>
          </button>

          {/* Dynamic Sim Speed Multipliers */}
          <div className="flex items-center gap-1 bg-space-900 px-2 py-0.5 rounded border border-space-800 text-[11px]">
            <Gauge className="w-3 h-3 text-cyan-400 mr-1" />
            <span className="text-gray-400 text-[10px] mr-1">SIM SPEED:</span>
            {[1, 2, 5, 10].map((spd) => (
              <button
                key={spd}
                onClick={() => handleSimSpeed(spd)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                  simSpeed === spd
                    ? "bg-cyan-500 text-black shadow-[0_0_8px_rgba(0,240,255,0.4)]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Right: Save Machine Checkpoint & Restore */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveCheckpoint}
            className="flex items-center gap-1 px-2.5 py-1 bg-space-900 hover:bg-space-800 border border-emerald-600/50 hover:border-emerald-500 text-emerald-300 rounded text-[11px] font-bold transition-all shadow-[0_0_8px_rgba(16,185,129,0.2)]"
            title="Save spacecraft position, attitude, and propellant state"
          >
            <Save className="w-3 h-3 text-emerald-400" />
            <span>SAVE CHECKPOINT</span>
          </button>

          <button
            onClick={handleLoadCheckpoint}
            className="flex items-center gap-1 px-2.5 py-1 bg-space-900 hover:bg-space-800 border border-cyan-600/50 hover:border-cyan-500 text-cyan-300 rounded text-[11px] font-bold transition-all"
            title="Restore spacecraft to saved checkpoint"
          >
            <Download className="w-3 h-3 text-cyan-400" />
            <span>RESTORE CHECKPOINT</span>
          </button>
        </div>
      </div>

      {/* Flight Phase Step Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {phases.map((phase) => {
          const isActive = activePhase === phase;
          return (
            <button
              key={phase}
              onClick={() => handlePhaseTransition(phase)}
              disabled={loadingPhase === phase}
              className={`p-2.5 text-xs rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${
                isActive
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_15px_rgba(0,240,255,0.25)] scale-[1.02]"
                  : "bg-space-900/90 border-space-800 text-gray-400 hover:text-white hover:border-space-600"
              }`}
            >
              <div className="flex items-center gap-1">
                {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{phase}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Subsystem Action Buttons & Emergency Abort */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-space-800">
        {/* Left: Gripper & Thruster Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 bg-space-950 px-2 py-1 rounded border border-space-800">
            <span className="text-gray-400 text-[10px] mr-1">GRIPPER:</span>
            <button
              onClick={() => handleGripperAction("DEPLOY")}
              className="px-2 py-0.5 bg-space-800 hover:bg-space-700 text-gray-200 rounded text-[11px] border border-space-700"
            >
              DEPLOY
            </button>
            <button
              onClick={() => handleGripperAction("ELECTRO_ADHESION_ACTIVE")}
              className="px-2 py-0.5 bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 rounded text-[11px] border border-emerald-700 font-bold"
            >
              1.5kV ADHERE
            </button>
            <button
              onClick={() => handleGripperAction("STOW")}
              className="px-2 py-0.5 bg-space-800 hover:bg-space-700 text-gray-200 rounded text-[11px] border border-space-700"
            >
              STOW
            </button>
          </div>

          <div className="flex items-center gap-1 bg-space-950 px-2 py-1 rounded border border-space-800">
            <span className="text-gray-400 text-[10px] mr-1">TEST THRUSTER:</span>
            {["X+", "Y+", "Z+"].map((axis) => (
              <button
                key={axis}
                onClick={() => handleManualPulse(axis)}
                className="px-1.5 py-0.5 bg-space-800 hover:bg-space-700 text-amber-300 rounded text-[10px] border border-space-700 font-bold"
              >
                {axis}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Emergency Abort Button */}
        <button
          onClick={handleAbort}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs rounded-lg border border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all active:scale-95"
        >
          <AlertOctagon className="w-4 h-4 animate-pulse" />
          <span>EMERGENCY ABORT RETRO-BURN</span>
        </button>
      </div>

      {/* In-UI Mission Status Log Strip */}
      <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 border ${
        statusMessage.type === "success" ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300" :
        statusMessage.type === "warning" ? "bg-amber-950/60 border-amber-500/40 text-amber-300" :
        statusMessage.type === "error" ? "bg-red-950/60 border-red-500/40 text-red-300" :
        "bg-space-950 border-space-800 text-gray-300"
      }`}>
        <Sparkles className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 font-mono text-[11px]">{statusMessage.text}</span>
      </div>
    </div>
  );
}
