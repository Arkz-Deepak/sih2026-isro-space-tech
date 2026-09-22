"use client";

import React, { useState } from "react";
import { useTelemetryStore } from "../store/telemetryStore";
import { AlertOctagon, Play, FastForward, CheckCircle2, ShieldAlert } from "lucide-react";

/**
 * CommandConsole Component Skeleton
 * SKELETON FOR FRONTEND TEAMMATE:
 * - Implement Phase Transition buttons calling backend POST /api/v1/commands/phase
 * - Implement Emergency Abort button with 2-step confirmation calling POST /api/v1/commands/abort
 * - Implement Manual thruster firing and gecko-gripper toggles
 */
export default function CommandConsole() {
  const { currentTelemetry } = useTelemetryStore();
  const [isAborting, setIsAborting] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<string | null>(null);

  const activePhase = currentTelemetry?.phase ?? "STANDBY";

  const handlePhaseTransition = async (phase: string) => {
    setLoadingPhase(phase);
    try {
      const res = await fetch("http://localhost:8000/api/v1/commands/phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command_type: "PHASE_TRANSITION",
          target_phase: phase,
        }),
      });
      const data = await res.json();
      if (!res.ok) alert(`Transition failed: ${data.detail}`);
    } catch (e) {
      console.error("Backend offline:", e);
    } finally {
      setLoadingPhase(null);
    }
  };

  const handleAbort = async () => {
    if (!confirm("WARNING: Initiate IMMEDIATE emergency abort retro-burn?")) return;
    setIsAborting(true);
    try {
      await fetch("http://localhost:8000/api/v1/commands/abort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command_type: "EMERGENCY_ABORT",
          reason: "Manual operator trigger",
        }),
      });
    } catch (e) {
      console.error("Failed to send abort command:", e);
    } finally {
      setIsAborting(false);
    }
  };

  const phases = ["STANDBY", "PHASING", "APPROACH", "INSPECTION", "CAPTURE", "DEORBIT"];

  return (
    <div className="bg-space-900 border border-space-700 p-4 rounded-xl flex flex-col justify-between font-mono">
      <div className="flex items-center justify-between border-b border-space-800 pb-2 mb-3">
        <span className="text-xs text-gray-400 font-bold">GNC FLIGHT PHASE CONTROL</span>
        <span className="text-xs bg-cyan-neon/10 text-cyan-neon px-2.5 py-0.5 rounded border border-cyan-neon/30">
          MODE: {currentTelemetry?.gnc_mode ?? "AUTONOMOUS"}
        </span>
      </div>

      {/* Phase Steps */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
        {phases.map((phase) => {
          const isActive = activePhase === phase;
          return (
            <button
              key={phase}
              onClick={() => handlePhaseTransition(phase)}
              disabled={loadingPhase === phase}
              className={`px-2.5 py-2 text-xs font-mono rounded border transition-all flex flex-col items-center justify-center gap-1 ${
                isActive
                  ? "bg-cyan-neon/20 border-cyan-neon text-cyan-neon font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                  : "bg-space-800 border-space-700 text-gray-400 hover:text-white hover:border-space-600"
              }`}
            >
              {isActive && <CheckCircle2 className="w-3 h-3 text-cyan-neon" />}
              <span>{phase}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Actions: Abort and Gripper */}
      <div className="flex items-center justify-between pt-2 border-t border-space-800">
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-xs bg-space-800 border border-space-600 text-gray-300 rounded hover:bg-space-700">
            DEPLOY GECKO-GRIPPER
          </button>
          <button className="px-3 py-1.5 text-xs bg-space-800 border border-space-600 text-gray-300 rounded hover:bg-space-700">
            TEST THRUSTER PULSE
          </button>
        </div>

        {/* Big Emergency Abort Button */}
        <button
          onClick={handleAbort}
          disabled={isAborting}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded border border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all animate-pulse"
        >
          <AlertOctagon className="w-4 h-4" />
          <span>EMERGENCY ABORT</span>
        </button>
      </div>
    </div>
  );
}
