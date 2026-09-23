"use client";

import React, { useEffect, useState } from "react";
import { useTelemetryStore } from "../store/telemetryStore";
import { Terminal, Shield, CheckCircle2, AlertTriangle } from "lucide-react";

interface LogEntry {
  id: string;
  time: string;
  type: "info" | "success" | "warning" | "alert";
  message: string;
}

export default function MissionEventLog() {
  const { currentTelemetry, isConnected } = useTelemetryStore();
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: "1", time: "00:00:01", type: "info", message: "ASTRA-CLEAN Flight Avionics Initialized. SAMV71 Watchdog Armed." },
    { id: "2", time: "00:00:03", type: "success", message: "NavIC L5/S-Band Carrier Lock Verified. 3D Position Fix Valid." },
    { id: "3", time: "00:00:05", type: "info", message: "Clohessy-Wiltshire Astrodynamics State Transition Engine Active." },
  ]);

  const lastPhaseRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!currentTelemetry) return;

    const metSec = currentTelemetry.met_seconds;
    const timeStr = `${Math.floor(metSec / 3600).toString().padStart(2, "0")}:${Math.floor((metSec % 3600) / 60).toString().padStart(2, "0")}:${Math.floor(metSec % 60).toString().padStart(2, "0")}`;

    // Log phase transitions
    if (lastPhaseRef.current !== currentTelemetry.phase) {
      lastPhaseRef.current = currentTelemetry.phase;
      setLogs((prev) => [
        ...prev.slice(-15),
        {
          id: Math.random().toString(),
          time: timeStr,
          type: currentTelemetry.phase === "ABORT" ? "alert" : "success",
          message: `GNC Transition: Active Flight Phase set to ${currentTelemetry.phase}.`,
        },
      ]);
    }

    // Log KOZ warnings
    if (currentTelemetry.target.koz_status === "BREACH") {
      setLogs((prev) => [
        ...prev.slice(-15),
        {
          id: Math.random().toString(),
          time: timeStr,
          type: "alert",
          message: `SAFETY ALERT: Keep-Out Zone (KOZ) boundary breached at distance ${currentTelemetry.target.distance_meters}m!`,
        },
      ]);
    }
  }, [currentTelemetry]);

  return (
    <div className="aerospace-panel p-3 rounded-xl font-tactical border border-space-700/80 text-xs flex flex-col h-full min-h-[160px]">
      <div className="flex items-center justify-between border-b border-space-800 pb-2 mb-2 text-gray-400">
        <span className="flex items-center gap-1.5 font-bold text-cyan-300">
          <Terminal className="w-3.5 h-3.5" /> MISSION AUDIT & FLIGHT LOG
        </span>
        <span className="text-[10px] text-gray-500">20 Hz EVENT STREAM</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[140px]">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 text-[11px] leading-tight">
            <span className="text-gray-500 shrink-0">[{log.time}]</span>
            <span className={
              log.type === "alert" ? "text-red-400 font-bold" :
              log.type === "warning" ? "text-amber-400" :
              log.type === "success" ? "text-emerald-400" :
              "text-gray-300"
            }>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
