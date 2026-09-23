"use client";

import React from "react";
import { useTelemetryStore } from "../store/telemetryStore";
import { Crosshair, Video, Cpu, ShieldAlert, CheckCircle, Zap } from "lucide-react";

export default function HUDOverlay() {
  const { currentTelemetry } = useTelemetryStore();

  const distance = currentTelemetry?.target.distance_meters ?? 78.4;
  const relVelocity = currentTelemetry?.target.relative_velocity_ms ?? 0.15;
  const confidence = currentTelemetry?.target.ai_confidence ?? 98.6;
  const kozStatus = currentTelemetry?.target.koz_status ?? "NOMINAL";
  const alignError = currentTelemetry?.target.docking_alignment_error_deg ?? 0.82;

  // Closing speed alert levels
  const isHighVelocity = Math.abs(relVelocity) > 0.25;
  const isCriticalVelocity = Math.abs(relVelocity) > 0.5;

  return (
    <div className="relative w-full h-full min-h-[380px] aerospace-panel rounded-xl overflow-hidden p-4 flex flex-col justify-between font-tactical hud-scanline border border-space-700/80">
      {/* Top Tactical HUD Bar */}
      <div className="flex justify-between items-center text-xs border-b border-space-800 pb-2.5 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <span className="text-cyan-300 font-bold tracking-wider">LIVE CAM-01 [OPTICAL SENSOR]</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-gray-400">FPS: <strong className="text-white">60.0</strong></span>
          <span className="text-gray-400">EXP: <strong className="text-white">1/120s</strong></span>
          <span className={`px-2 py-0.5 rounded font-bold ${
            kozStatus === "BREACH" ? "bg-red-500/20 text-red-400 border border-red-500/40" :
            kozStatus === "APPROACH_CORRIDOR" ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" :
            "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
          }`}>
            KOZ: {kozStatus}
          </span>
        </div>
      </div>

      {/* Center Tactical Viewfinder with AI Tracking Box */}
      <div className="relative flex-1 flex items-center justify-center my-3 select-none">
        {/* Outer Circular Reticle */}
        <div className="absolute w-48 h-48 border border-cyan-500/30 rounded-full flex items-center justify-center pointer-events-none">
          {/* Compass Ticks */}
          <div className="absolute top-1 text-[9px] text-cyan-400/60">000°</div>
          <div className="absolute bottom-1 text-[9px] text-cyan-400/60">180°</div>
          <div className="absolute left-1 text-[9px] text-cyan-400/60">270°</div>
          <div className="absolute right-1 text-[9px] text-cyan-400/60">090°</div>
          <Crosshair className="w-16 h-16 text-cyan-400/60" />
        </div>

        {/* Dynamic AI Computer Vision Bounding Box */}
        <div className="relative w-56 h-40 border-2 border-cyan-400/80 rounded-lg bg-cyan-950/20 flex flex-col justify-between p-2 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
          {/* Corner Framing Brackets */}
          <div className="flex justify-between text-[10px] text-cyan-300 font-bold">
            <span>[AI_TRACK: LOCKED]</span>
            <span>OBJ_ID: #LEO_941</span>
          </div>

          {/* Keypoints Overlay Markers */}
          <div className="grid grid-cols-2 gap-8 pointer-events-none opacity-80">
            <span className="w-2 h-2 border border-green-400 bg-green-500/40 rounded-full self-start" />
            <span className="w-2 h-2 border border-green-400 bg-green-500/40 rounded-full justify-self-end" />
            <span className="w-2 h-2 border border-green-400 bg-green-500/40 rounded-full self-end" />
            <span className="w-2 h-2 border border-green-400 bg-green-500/40 rounded-full justify-self-end self-end" />
          </div>

          <div className="flex justify-between items-end text-[10px]">
            <span className="text-gray-400">TENSORRT NET</span>
            <span className="text-emerald-400 font-bold">{confidence}% MATCH</span>
          </div>
        </div>
      </div>

      {/* Bottom Live Metrics Strip */}
      <div className="grid grid-cols-3 gap-2 bg-space-950/80 border border-space-800 p-3 rounded-lg text-xs z-10 backdrop-blur-md">
        <div>
          <span className="text-gray-400 text-[10px] block">RANGE TO TARGET</span>
          <span className="text-cyan-300 text-lg font-bold">
            {distance < 10.0 ? distance.toFixed(2) : distance.toFixed(1)} <span className="text-xs text-gray-400 font-normal">m</span>
          </span>
        </div>

        <div>
          <span className="text-gray-400 text-[10px] block">CLOSING VELOCITY (V-BAR)</span>
          <span className={`text-lg font-bold ${
            isCriticalVelocity ? "text-red-400 animate-pulse" :
            isHighVelocity ? "text-amber-400" :
            "text-emerald-400"
          }`}>
            {relVelocity > 0 ? `+${relVelocity.toFixed(3)}` : relVelocity.toFixed(3)} <span className="text-xs text-gray-400 font-normal">m/s</span>
          </span>
        </div>

        <div>
          <span className="text-gray-400 text-[10px] block">DOCKING AXIS OFFSET</span>
          <span className={`text-lg font-bold ${alignError > 2.0 ? "text-amber-400" : "text-white"}`}>
            {alignError.toFixed(2)}°
          </span>
        </div>
      </div>
    </div>
  );
}
