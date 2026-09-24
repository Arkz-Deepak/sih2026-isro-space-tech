"use client";

import React, { useEffect, useState } from "react";
import Viewport3D from "../components/Viewport3D";
import HUDOverlay from "../components/HUDOverlay";
import TelemetryGrid from "../components/TelemetryGrid";
import CommandConsole from "../components/CommandConsole";
import MissionEventLog from "../components/MissionEventLog";
import { useTelemetryStore } from "../store/telemetryStore";
import { TelemetryPacket } from "../types/telemetry";
import { Satellite, Activity, Wifi, ShieldCheck, Clock, Radio } from "lucide-react";

export default function MissionControlDashboard() {
  const { setTelemetry, setConnected, isConnected, currentTelemetry } = useTelemetryStore();
  const [utcTime, setUtcTime] = useState("");

  // Clock Update
  useEffect(() => {
    const updateUtc = () => {
      setUtcTime(new Date().toUTCString().slice(17, 25) + " UTC");
    };
    updateUtc();
    const interval = setInterval(updateUtc, 1000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket Connection Lifecycle & Autonomous Cloud Staging Fallback
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let mockInterval: NodeJS.Timeout | null = null;
    const fallbackStartTime = Date.now();
    let simDist = 78.4;
    const simVel = 0.12;

    const startClientFallback = () => {
      if (mockInterval) return;
      mockInterval = setInterval(() => {
        const elapsed = (Date.now() - fallbackStartTime) / 1000.0;
        simDist = Math.max(0.4, simDist - (simVel * 0.05));
        const packet: TelemetryPacket = {
          timestamp: new Date().toISOString(),
          met_seconds: parseFloat(elapsed.toFixed(1)),
          phase: simDist < 1.2 ? "CAPTURE" : simDist < 16.0 ? "INSPECTION" : simDist < 75.0 ? "APPROACH" : "PHASING",
          gnc_mode: "AUTONOMOUS",
          chaser: {
            position: [0.12, -simDist, 0.06],
            velocity: [0.001, simVel, -0.001],
            quaternion: [1.0, 0.0, 0.0, 0.0],
            angular_rate: [0.02, -0.01, 0.01],
            fuel_remaining_kg: Math.max(0.5, parseFloat((2.0 - elapsed * 0.0004).toFixed(3))),
            delta_v_remaining_ms: 45.2,
            battery_pct: Math.max(80.0, parseFloat((95.4 - elapsed * 0.002).toFixed(1))),
            bus_voltage_v: 28.1,
            reaction_wheels_rpm: [1240, -850, 420],
            npu_temp_c: 43.2,
            gripper_state: simDist < 1.2 ? "CAPTURED" : "DEPLOYED",
            active_thrusters: [0.02, 0.0, 0.02, 0.0, 0.0, 0.0, 0.0, 0.0],
          },
          target: {
            distance_meters: parseFloat(simDist.toFixed(2)),
            relative_velocity_ms: parseFloat(simVel.toFixed(3)),
            koz_status: simDist < 5.0 ? "APPROACH_CORRIDOR" : "NOMINAL",
            docking_alignment_error_deg: 0.65,
            ai_confidence: 98.8,
          },
        };
        setTelemetry(packet);
      }, 50); // 20 Hz
    };

    const stopClientFallback = () => {
      if (mockInterval) {
        clearInterval(mockInterval);
        mockInterval = null;
      }
    };

    const getWsUrl = () => {
      if (process.env.NEXT_PUBLIC_WS_URL) {
        return process.env.NEXT_PUBLIC_WS_URL;
      }
      if (typeof window !== "undefined") {
        const isHttps = window.location.protocol === "https:";
        const proto = isHttps ? "wss://" : "ws://";
        if (window.location.hostname === "localhost") {
          return "ws://localhost:8000/ws/telemetry";
        }
        return `${proto}${window.location.hostname}:8000/ws/telemetry`;
      }
      return "ws://localhost:8000/ws/telemetry";
    };

    const connect = () => {
      const wsUrl = getWsUrl();
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("Connected to ASTRA-CLEAN Telemetry Bridge at", wsUrl);
          stopClientFallback();
          setConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const packet = JSON.parse(event.data);
            setTelemetry(packet);
          } catch (e) {
            console.error("Failed to parse telemetry:", e);
          }
        };

        ws.onclose = () => {
          setConnected(false);
          startClientFallback();
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch (err) {
        setConnected(false);
        startClientFallback();
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      stopClientFallback();
      ws?.close();
    };
  }, [setTelemetry, setConnected]);

  const met = currentTelemetry?.met_seconds ?? 0.0;
  const phase = currentTelemetry?.phase ?? "STANDBY";

  return (
    <main className="flex-1 flex flex-col p-3 md:p-5 max-w-[1780px] w-full mx-auto gap-3.5 select-none">
      {/* Top Aerospace Operations Header */}
      <header className="aerospace-panel flex flex-wrap items-center justify-between p-3.5 rounded-xl border border-space-700/80 font-tactical">
        {/* Left: Project Branding */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-400/40 rounded-xl shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <Satellite className="w-5 h-5 text-cyan-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-wider text-white">PROJECT ASTRA-CLEAN</h1>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-bold">
                SIH26226
              </span>
            </div>
            <span className="text-[11px] text-gray-400">ISRO SPADEX &amp; BAS-01 IN-ORBIT SERVICING &amp; DEBRIS MITIGATION GCS</span>
          </div>
        </div>

        {/* Right: Operational Telemetry Badges */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Mission Elapsed Time */}
          <div className="flex items-center gap-2 bg-space-900 border border-space-700 px-3 py-1.5 rounded-lg">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-gray-400 text-[11px]">MET:</span>
            <span className="text-white font-bold text-sm tracking-wide">
              T+{Math.floor(met / 3600).toString().padStart(2, "0")}:
              {Math.floor((met % 3600) / 60).toString().padStart(2, "0")}:
              {Math.floor(met % 60).toString().padStart(2, "0")}
            </span>
          </div>

          {/* Active Flight Phase */}
          <div className="flex items-center gap-2 bg-space-900 border border-space-700 px-3 py-1.5 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-gray-400 text-[11px]">PHASE:</span>
            <span className="text-cyan-300 font-bold">{phase}</span>
          </div>

          {/* UTC Clock */}
          <div className="hidden sm:flex items-center gap-2 bg-space-900 border border-space-700 px-3 py-1.5 rounded-lg text-gray-300">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>{utcTime}</span>
          </div>

          {/* 20 Hz WebSocket Link Status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-bold ${
            isConnected
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
              : "bg-red-950/60 border-red-500/40 text-red-400 animate-pulse"
          }`}>
            <Wifi className={`w-4 h-4 ${isConnected ? "animate-pulse" : ""}`} />
            <span>{isConnected ? "TELEMETRY 20 Hz" : "OFFLINE"}</span>
          </div>
        </div>
      </header>

      {/* Main 3D Digital Twin & Optical HUD Section */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 flex-1 min-h-[460px]">
        {/* Left 2 Cols: Three.js 3D Orbital Canvas */}
        <div className="lg:col-span-2 h-full min-h-[460px]">
          <Viewport3D />
        </div>

        {/* Right 1 Col: Optical Camera Docking HUD */}
        <div className="h-full min-h-[380px]">
          <HUDOverlay />
        </div>
      </section>

      {/* Real-Time Aerospace Subsystem Gauges */}
      <section>
        <TelemetryGrid />
      </section>

      {/* Telecommand Console & Mission Event Audit Log */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <div className="lg:col-span-2">
          <CommandConsole />
        </div>
        <div className="h-full">
          <MissionEventLog />
        </div>
      </section>
    </main>
  );
}
