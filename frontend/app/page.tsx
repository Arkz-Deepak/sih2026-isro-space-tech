"use client";

import React, { useEffect, useState } from "react";
import Viewport3D from "../components/Viewport3D";
import HUDOverlay from "../components/HUDOverlay";
import TelemetryGrid from "../components/TelemetryGrid";
import CommandConsole from "../components/CommandConsole";
import MissionEventLog from "../components/MissionEventLog";
import { useTelemetryStore } from "../store/telemetryStore";
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

  // WebSocket Connection Lifecycle
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket("ws://localhost:8000/ws/telemetry");

      ws.onopen = () => {
        console.log("Connected to ASTRA-CLEAN Telemetry Bridge");
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
        reconnectTimeout = setTimeout(connect, 2000);
      };

      ws.onerror = (err) => {
        ws?.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
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
