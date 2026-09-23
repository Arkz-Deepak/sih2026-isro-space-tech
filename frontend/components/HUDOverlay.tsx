"use client";

import React from "react";
import { useTelemetryStore } from "../store/telemetryStore";
import { Crosshair, Video, Cpu, ShieldAlert, CheckCircle, Zap, Camera, Eye } from "lucide-react";

export default function HUDOverlay() {
  const { currentTelemetry, hudViewMode, setHudViewMode } = useTelemetryStore();

  const distance = currentTelemetry?.target.distance_meters ?? 78.4;
  const relVelocity = currentTelemetry?.target.relative_velocity_ms ?? 0.15;
  const confidence = currentTelemetry?.target.ai_confidence ?? 98.6;
  const kozStatus = currentTelemetry?.target.koz_status ?? "NOMINAL";
  const alignError = currentTelemetry?.target.docking_alignment_error_deg ?? 0.82;

  // Closing speed alert levels
  const isHighVelocity = Math.abs(relVelocity) > 0.25;
  const isCriticalVelocity = Math.abs(relVelocity) > 0.5;

  // Dynamic visual zoom based on closing distance (1.0x at 80m -> 1.45x at 0m)
  const zoomFactor = Math.min(1.45, Math.max(1.0, 1.45 - (distance / 80.0) * 0.45));

  // Dynamic AI Bounding Box dimensions based on distance
  const boxWidth = Math.min(300, Math.max(170, 300 - (distance / 80.0) * 110));
  const boxHeight = Math.min(220, Math.max(120, 220 - (distance / 80.0) * 80));

  return (
    <div className="relative w-full h-full min-h-[380px] aerospace-panel rounded-xl overflow-hidden p-4 flex flex-col justify-between font-tactical hud-scanline border border-space-700/80 select-none">
      {/* Dynamic Background: Live Optical Feed or Wireframe */}
      {hudViewMode === "OPTICAL" ? (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src="/optical_docking_feed.jpg"
            alt="Live Optical Docking Feed"
            className="w-full h-full object-cover transition-transform duration-700 ease-out filter contrast-125 brightness-95"
            style={{ transform: `scale(${zoomFactor})` }}
          />
          {/* Aerospace Sensor Vignette & Scanline Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-space-950/90 via-transparent to-space-950/70" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black/60 pointer-events-none" />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 bg-space-950/90 pointer-events-none flex items-center justify-center">
          <div className="w-[85%] h-[75%] border border-cyan-500/20 rounded-lg grid grid-cols-6 grid-rows-4 opacity-40">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="border border-cyan-500/10" />
            ))}
          </div>
        </div>
      )}

      {/* Top Tactical HUD Bar */}
      <div className="flex justify-between items-center text-xs border-b border-space-800 pb-2.5 z-10 backdrop-blur-sm bg-space-950/40 px-2 py-1 rounded">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <span className="text-cyan-300 font-bold tracking-wider">
            {hudViewMode === "OPTICAL" ? "LIVE CAM-01 [NPU OPTICAL SENSOR]" : "SYNTHETIC THERMAL / WIREFRAME"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          {/* View Mode Toggle Button */}
          <button
            onClick={() => setHudViewMode(hudViewMode === "OPTICAL" ? "WIREFRAME" : "OPTICAL")}
            className="flex items-center gap-1 px-2 py-0.5 bg-space-900/90 hover:bg-space-800 text-cyan-300 border border-cyan-500/40 rounded text-[10px] font-bold transition-all shadow-[0_0_8px_rgba(0,240,255,0.2)]"
          >
            {hudViewMode === "OPTICAL" ? <Camera className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span>{hudViewMode === "OPTICAL" ? "RAW FEED" : "WIREFRAME"}</span>
          </button>

          <span className="text-gray-400">ZOOM: <strong className="text-cyan-300 font-mono">{zoomFactor.toFixed(2)}x</strong></span>
          <span className={`px-2 py-0.5 rounded font-bold ${
            kozStatus === "BREACH" ? "bg-red-500/30 text-red-300 border border-red-500/60" :
            kozStatus === "APPROACH_CORRIDOR" ? "bg-amber-500/30 text-amber-300 border border-amber-500/60" :
            "bg-emerald-500/30 text-emerald-300 border border-emerald-500/60"
          }`}>
            KOZ: {kozStatus}
          </span>
        </div>
      </div>

      {/* Center Tactical Viewfinder with Dynamic AI Tracking Box */}
      <div className="relative flex-1 flex items-center justify-center my-2 z-10">
        {/* Outer Circular Reticle */}
        <div className="absolute w-52 h-52 border border-cyan-400/40 rounded-full flex items-center justify-center pointer-events-none">
          {/* Compass Ticks */}
          <div className="absolute top-1 text-[9px] text-cyan-400/80 font-mono">000° REL</div>
          <div className="absolute bottom-1 text-[9px] text-cyan-400/80 font-mono">180° REL</div>
          <div className="absolute left-1 text-[9px] text-cyan-400/80 font-mono">270°</div>
          <div className="absolute right-1 text-[9px] text-cyan-400/80 font-mono">090°</div>
          <Crosshair className="w-16 h-16 text-cyan-400/50" />
        </div>

        {/* Dynamic AI Computer Vision Bounding Box */}
        <div
          style={{ width: `${boxWidth}px`, height: `${boxHeight}px` }}
          className="relative border-2 border-cyan-400/90 rounded-lg bg-cyan-950/25 flex flex-col justify-between p-2 shadow-[0_0_25px_rgba(0,240,255,0.3)] transition-all duration-300 backdrop-blur-[1px]"
        >
          {/* Corner Framing Brackets */}
          <div className="flex justify-between text-[10px] text-cyan-300 font-bold bg-space-950/60 px-1.5 py-0.5 rounded">
            <span>[AI_TRACK: LOCKED]</span>
            <span className="text-amber-300 font-mono">#ISRO_BAS_01</span>
          </div>

          {/* Keypoints Overlay Markers */}
          <div className="grid grid-cols-2 gap-8 pointer-events-none opacity-90">
            <span className="w-2.5 h-2.5 border-2 border-emerald-400 bg-emerald-500/50 rounded-full self-start shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="w-2.5 h-2.5 border-2 border-emerald-400 bg-emerald-500/50 rounded-full justify-self-end shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="w-2.5 h-2.5 border-2 border-emerald-400 bg-emerald-500/50 rounded-full self-end shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="w-2.5 h-2.5 border-2 border-emerald-400 bg-emerald-500/50 rounded-full justify-self-end self-end shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </div>

          <div className="flex justify-between items-end text-[10px] bg-space-950/60 px-1.5 py-0.5 rounded">
            <span className="text-gray-300 font-mono">TENSORRT POSE</span>
            <span className="text-emerald-400 font-bold font-mono">{confidence}% MATCH</span>
          </div>
        </div>
      </div>

      {/* Bottom Live Metrics Strip */}
      <div className="grid grid-cols-3 gap-2 bg-space-950/85 border border-space-800/90 p-3 rounded-lg text-xs z-10 backdrop-blur-md shadow-lg">
        <div>
          <span className="text-gray-400 text-[10px] block">RANGE TO TARGET</span>
          <span className="text-cyan-300 text-lg font-bold font-mono">
            {distance < 10.0 ? distance.toFixed(2) : distance.toFixed(1)} <span className="text-xs text-gray-400 font-normal">m</span>
          </span>
        </div>

        <div>
          <span className="text-gray-400 text-[10px] block">CLOSING VELOCITY (V-BAR)</span>
          <span className={`text-lg font-bold font-mono ${
            isCriticalVelocity ? "text-red-400 animate-pulse" :
            isHighVelocity ? "text-amber-400" :
            "text-emerald-400"
          }`}>
            {relVelocity > 0 ? `+${relVelocity.toFixed(3)}` : relVelocity.toFixed(3)} <span className="text-xs text-gray-400 font-normal">m/s</span>
          </span>
        </div>

        <div>
          <span className="text-gray-400 text-[10px] block">DOCKING AXIS OFFSET</span>
          <span className={`text-lg font-bold font-mono ${alignError > 2.0 ? "text-amber-400" : "text-white"}`}>
            {alignError.toFixed(2)}°
          </span>
        </div>
      </div>
    </div>
  );
}
