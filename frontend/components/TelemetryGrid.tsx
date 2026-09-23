"use client";

import React from "react";
import { useTelemetryStore } from "../store/telemetryStore";
import { BatteryCharging, Compass, Flame, Cpu, Gauge, Radio, ShieldCheck } from "lucide-react";

export default function TelemetryGrid() {
  const { currentTelemetry } = useTelemetryStore();

  const chaser = currentTelemetry?.chaser;
  const batteryPct = chaser?.battery_pct ?? 94.2;
  const fuelKg = chaser?.fuel_remaining_kg ?? 1.95;
  const deltaV = chaser?.delta_v_remaining_ms ?? 124.8;
  const npuTemp = chaser?.npu_temp_c ?? 43.5;
  const [rx, ry, rz] = chaser?.reaction_wheels_rpm ?? [1240, -850, 420];
  const [q0, q1, q2, q3] = chaser?.quaternion ?? [1.0, 0.0, 0.0, 0.0];
  const gripperState = chaser?.gripper_state ?? "STOWED";
  const activeThrusters = chaser?.active_thrusters ?? [0, 0, 0, 0, 0, 0, 0, 0];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-tactical">
      {/* 1. EPS & Power Subsystem */}
      <div className="aerospace-panel p-3.5 rounded-xl border border-space-700/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-gray-400 border-b border-space-800 pb-2">
          <span className="flex items-center gap-1.5 font-bold text-emerald-400">
            <BatteryCharging className="w-4 h-4" /> EPS / POWER
          </span>
          <span className="text-[11px] bg-space-800 px-2 py-0.5 rounded text-gray-300">28.1 V BUS</span>
        </div>
        <div className="my-2.5 flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold text-emerald-400">{batteryPct.toFixed(1)}</span>
            <span className="text-xs text-gray-400 ml-1">%</span>
          </div>
          <div className="text-right text-[11px] text-gray-400">
            <div>SOLAR: <strong className="text-white">+48.0 W</strong></div>
            <div>DRAIN: <strong className="text-gray-300">-18.5 W</strong></div>
          </div>
        </div>
        <div className="w-full bg-space-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${batteryPct > 50 ? "bg-emerald-500" : batteryPct > 25 ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${batteryPct}%` }}
          />
        </div>
      </div>

      {/* 2. Propulsion Subsystem */}
      <div className="aerospace-panel p-3.5 rounded-xl border border-space-700/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-gray-400 border-b border-space-800 pb-2">
          <span className="flex items-center gap-1.5 font-bold text-amber-400">
            <Flame className="w-4 h-4" /> PROPULSION
          </span>
          <span className="text-[11px] bg-space-800 px-2 py-0.5 rounded text-gray-300">N2 COLD-GAS</span>
        </div>
        <div className="my-2.5 flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold text-amber-400">{fuelKg.toFixed(2)}</span>
            <span className="text-xs text-gray-400 ml-1">kg</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-gray-400 block">TOTAL DELTA-V</span>
            <span className="text-base font-bold text-white">{deltaV.toFixed(1)} <span className="text-xs font-normal text-gray-400">m/s</span></span>
          </div>
        </div>
        {/* 8-Nozzle Thruster Firing Bar */}
        <div className="flex items-center justify-between gap-1 pt-1 border-t border-space-800 text-[10px]">
          <span className="text-gray-400">NOZZLES:</span>
          <div className="flex gap-1">
            {activeThrusters.map((val, idx) => (
              <span
                key={idx}
                title={`Thruster ${idx + 1}: ${val.toFixed(3)} N`}
                className={`w-2.5 h-2.5 rounded-sm transition-colors ${
                  val > 0.001 ? "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)] animate-pulse" : "bg-space-800"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 3. ADCS & Reaction Wheels */}
      <div className="aerospace-panel p-3.5 rounded-xl border border-space-700/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-gray-400 border-b border-space-800 pb-2">
          <span className="flex items-center gap-1.5 font-bold text-cyan-400">
            <Compass className="w-4 h-4" /> ADCS / WHEELS
          </span>
          <span className="text-[11px] bg-space-800 px-2 py-0.5 rounded text-gray-300">3-AXIS</span>
        </div>
        <div className="my-2 text-xs space-y-1 text-gray-300">
          <div className="flex justify-between">
            <span className="text-gray-400">RW-X:</span>
            <span className="font-bold text-white">{rx.toFixed(0)} <span className="text-[10px] text-gray-400">RPM</span></span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">RW-Y:</span>
            <span className="font-bold text-white">{ry.toFixed(0)} <span className="text-[10px] text-gray-400">RPM</span></span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">RW-Z:</span>
            <span className="font-bold text-white">{rz.toFixed(0)} <span className="text-[10px] text-gray-400">RPM</span></span>
          </div>
        </div>
        <div className="text-[10px] text-emerald-400 flex items-center justify-between pt-1 border-t border-space-800">
          <span>STAR TRACKER:</span>
          <span className="font-bold">LOCKED (&lt;0.01°)</span>
        </div>
      </div>

      {/* 4. Avionics & Edge AI Compute */}
      <div className="aerospace-panel p-3.5 rounded-xl border border-space-700/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-gray-400 border-b border-space-800 pb-2">
          <span className="flex items-center gap-1.5 font-bold text-purple-400">
            <Cpu className="w-4 h-4" /> EDGE AI NPU
          </span>
          <span className="text-[11px] bg-space-800 px-2 py-0.5 rounded text-purple-300">JETSON ORIN</span>
        </div>
        <div className="my-2.5 flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold text-purple-300">{npuTemp.toFixed(1)}</span>
            <span className="text-xs text-gray-400 ml-1">°C</span>
          </div>
          <div className="text-right text-[11px]">
            <span className="text-gray-400 block">GRIPPER STATE</span>
            <span className="font-bold text-cyan-300">{gripperState}</span>
          </div>
        </div>
        <div className="text-[10px] text-gray-400 font-mono pt-1 border-t border-space-800 truncate">
          ATTITUDE: [{q0.toFixed(2)}, {q1.toFixed(2)}, {q2.toFixed(2)}, {q3.toFixed(2)}]
        </div>
      </div>
    </div>
  );
}
