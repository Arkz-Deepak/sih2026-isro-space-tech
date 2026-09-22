"use client";

import React from "react";
import { useTelemetryStore } from "../store/telemetryStore";
import { Crosshair, ShieldAlert, Video } from "lucide-react";

/**
 * HUDOverlay Component Skeleton
 * SKELETON FOR FRONTEND TEAMMATE:
 * - Implement optical camera feed overlay (simulated or WebRTC stream)
 * - Render 6-DoF AI wireframe / bounding box over target
 * - Display closing rate, range, and docking target crosshairs
 */
export default function HUDOverlay() {
  const { currentTelemetry } = useTelemetryStore();

  const distance = currentTelemetry?.target.distance_meters ?? 80.0;
  const relVelocity = currentTelemetry?.target.relative_velocity_ms ?? 0.15;
  const confidence = currentTelemetry?.target.ai_confidence ?? 98.4;
  const kozStatus = currentTelemetry?.target.koz_status ?? "NOMINAL";

  return (
    <div className="relative w-full h-full min-h-[300px] bg-space-950 border border-space-700 rounded-xl overflow-hidden p-4 flex flex-col justify-between">
      {/* Top HUD Bar */}
      <div className="flex justify-between items-center text-xs font-mono text-cyan-neon border-b border-space-800 pb-2">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-cyan-neon animate-pulse" />
          <span>OPTICAL SENSOR [CAM-01 / 60 FPS]</span>
        </div>
        <div className="flex items-center gap-4">
          <span>TENSORRT_KEYPOINT_NET: <strong className="text-laser-green">{confidence}%</strong></span>
          <span className={`px-2 py-0.5 rounded font-bold ${
            kozStatus === "BREACH" ? "bg-red-500/20 text-red-400" :
            kozStatus === "APPROACH_CORRIDOR" ? "bg-amber-500/20 text-amber-400" :
            "bg-green-500/20 text-laser-green"
          }`}>
            KOZ: {kozStatus}
          </span>
        </div>
      </div>

      {/* Center Reticle & Docking Crosshair */}
      <div className="relative flex-1 flex items-center justify-center">
        <div className="absolute w-40 h-40 border border-cyan-neon/40 rounded-full flex items-center justify-center pointer-events-none">
          <Crosshair className="w-12 h-12 text-cyan-neon/80" />
          <div className="absolute w-2 h-2 bg-cyan-neon rounded-full" />
        </div>

        {/* AI Bounding Box Placeholder */}
        <div className="w-48 h-32 border-2 border-dashed border-cyan-neon/60 rounded flex items-start justify-end p-1 text-[10px] font-mono text-cyan-neon bg-cyan-900/10">
          <span>TARGET_ID: DEBRIS_LEO_941</span>
        </div>
      </div>

      {/* Bottom Telemetry HUD Bar */}
      <div className="grid grid-cols-3 gap-2 bg-space-900/90 border border-space-800 p-2.5 rounded text-xs font-mono">
        <div>
          <span className="text-gray-400 text-[10px] block">RANGE TO TARGET</span>
          <span className="text-cyan-neon text-base font-bold">{distance.toFixed(2)} m</span>
        </div>
        <div>
          <span className="text-gray-400 text-[10px] block">CLOSING VELOCITY (V-BAR)</span>
          <span className={`text-base font-bold ${relVelocity > 0.25 ? "text-red-400" : "text-laser-green"}`}>
            {relVelocity > 0 ? `+${relVelocity.toFixed(3)}` : relVelocity.toFixed(3)} m/s
          </span>
        </div>
        <div>
          <span className="text-gray-400 text-[10px] block">DOCKING AXIS OFFSET</span>
          <span className="text-white text-base font-bold">
            {currentTelemetry?.target.docking_alignment_error_deg.toFixed(2) ?? "0.85"}°
          </span>
        </div>
      </div>
    </div>
  );
}
