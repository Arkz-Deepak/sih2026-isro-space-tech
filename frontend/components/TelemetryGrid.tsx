"use client";

import React from "react";
import { useTelemetryStore } from "../store/telemetryStore";
import { BatteryCharging, Compass, Flame, Cpu } from "lucide-react";

/**
 * TelemetryGrid Component Skeleton
 * SKELETON FOR FRONTEND TEAMMATE:
 * - Display real-time gauges for Battery, Bus Voltage, Fuel/Delta-V, Reaction Wheels, NPU Temp
 * - Connect to useTelemetryStore history for sparkline charts
 */
export default function TelemetryGrid() {
  const { currentTelemetry } = useTelemetryStore();

  const chaser = currentTelemetry?.chaser;
  const batteryPct = chaser?.battery_pct ?? 94.2;
  const fuelKg = chaser?.fuel_remaining_kg ?? 1.95;
  const deltaV = chaser?.delta_v_remaining_ms ?? 124.8;
  const npuTemp = chaser?.npu_temp_c ?? 43.5;
  const [rx, ry, rz] = chaser?.reaction_wheels_rpm ?? [1200, -850, 410];
  const [q0, q1, q2, q3] = chaser?.quaternion ?? [1.0, 0.0, 0.0, 0.0];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
      {/* Battery / EPS */}
      <div className="bg-space-900 border border-space-700 p-3 rounded-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 text-xs">
          <span className="flex items-center gap-1"><BatteryCharging className="w-3.5 h-3.5 text-laser-green" /> EPS / POWER</span>
          <span className="text-[10px] text-gray-500">28.1 V</span>
        </div>
        <div className="mt-2">
          <span className="text-xl font-bold text-laser-green">{batteryPct.toFixed(1)}%</span>
          <div className="w-full bg-space-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-laser-green h-full" style={{ width: `${batteryPct}%` }} />
          </div>
        </div>
      </div>

      {/* Propulsion / Delta-V */}
      <div className="bg-space-900 border border-space-700 p-3 rounded-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 text-xs">
          <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-amber-400" /> PROPULSION</span>
          <span className="text-[10px] text-gray-500">N2 COLD-GAS</span>
        </div>
        <div className="mt-2 flex justify-between items-baseline">
          <div>
            <span className="text-xl font-bold text-amber-400">{fuelKg.toFixed(2)}</span>
            <span className="text-xs text-gray-400 ml-1">kg</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-400 block">ΔV</span>
            <span className="text-sm font-bold text-white">{deltaV.toFixed(1)} m/s</span>
          </div>
        </div>
      </div>

      {/* ADCS / Attitude */}
      <div className="bg-space-900 border border-space-700 p-3 rounded-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 text-xs">
          <span className="flex items-center gap-1"><Compass className="w-3.5 h-3.5 text-cyan-neon" /> ADCS / WHEELS</span>
          <span className="text-[10px] text-cyan-neon">3-AXIS</span>
        </div>
        <div className="mt-2 text-[11px] text-gray-300 space-y-0.5">
          <div>RW-X: <strong className="text-white">{rx.toFixed(0)}</strong> RPM</div>
          <div>RW-Y: <strong className="text-white">{ry.toFixed(0)}</strong> RPM</div>
          <div>RW-Z: <strong className="text-white">{rz.toFixed(0)}</strong> RPM</div>
        </div>
      </div>

      {/* Avionics / Edge NPU */}
      <div className="bg-space-900 border border-space-700 p-3 rounded-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 text-xs">
          <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5 text-purple-400" /> JETSON ORIN NX</span>
          <span className="text-[10px] text-purple-400">100 TOPS</span>
        </div>
        <div className="mt-2">
          <span className="text-xl font-bold text-purple-300">{npuTemp.toFixed(1)}°C</span>
          <div className="text-[10px] text-gray-400 mt-1">
            Q: [{q0.toFixed(2)}, {q1.toFixed(2)}, {q2.toFixed(2)}, {q3.toFixed(2)}]
          </div>
        </div>
      </div>
    </div>
  );
}
