"use client";

import React, { useEffect } from "react";
import Viewport3D from "../components/Viewport3D";
import HUDOverlay from "../components/HUDOverlay";
import TelemetryGrid from "../components/TelemetryGrid";
import CommandConsole from "../components/CommandConsole";
import { useTelemetryStore } from "../store/telemetryStore";
import { Radio, Satellite, Activity, Wifi, ShieldCheck } from "lucide-react";

export default function MissionControlDashboard() {
  const { setTelemetry, setConnected, isConnected, currentTelemetry } = useTelemetryStore();

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
        console.warn("WebSocket closed. Attempting reconnect in 2s...");
        setConnected(false);
        reconnectTimeout = setTimeout(connect, 2000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
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
    <main className="flex-1 flex flex-col p-3 md:p-5 max-w-[1700px] w-full mx-auto gap-3">
      {/* Top Mission Status Bar */}
      <header className="flex flex-wrap items-center justify-between bg-space-900 border border-space-700 p-3 rounded-xl font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-neon/10 border border-cyan-neon/30 rounded-lg">
            <Satellite className="w-5 h-5 text-cyan-neon" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-white">PROJECT ASTRA-CLEAN</h1>
            <span className="text-[10px] text-gray-400">ISRO SPADEX & BAS-01 COMPLIANT GCS</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-neon" />
            <span className="text-gray-400">MET:</span>
            <span className="text-white font-bold text-sm">
              T+{Math.floor(met / 3600).toString().padStart(2, "0")}:
              {Math.floor((met % 3600) / 60).toString().padStart(2, "0")}:
              {Math.floor(met % 60).toString().padStart(2, "0")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-laser-green" />
            <span className="text-gray-400">PHASE:</span>
            <span className="text-cyan-neon font-bold">{phase}</span>
          </div>

          <div className="flex items-center gap-2">
            <Wifi className={`w-4 h-4 ${isConnected ? "text-laser-green animate-pulse" : "text-red-500"}`} />
            <span className={isConnected ? "text-laser-green font-bold" : "text-red-400 font-bold"}>
              {isConnected ? "TELEMETRY 20Hz" : "OFFLINE"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Viewport & HUD Section */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-[420px]">
        {/* Left 2 Cols: 3D Digital Twin Viewport */}
        <div className="lg:col-span-2 h-full min-h-[420px]">
          <Viewport3D />
        </div>

        {/* Right 1 Col: Optical Camera HUD */}
        <div className="h-full min-h-[300px]">
          <HUDOverlay />
        </div>
      </section>

      {/* Real-Time Telemetry Grid */}
      <section>
        <TelemetryGrid />
      </section>

      {/* Telecommand & GNC Control Console */}
      <section>
        <CommandConsole />
      </section>
    </main>
  );
}
