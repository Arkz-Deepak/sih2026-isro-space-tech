import { create } from "zustand";
import { TelemetryPacket } from "../types/telemetry";

interface TelemetryState {
  currentTelemetry: TelemetryPacket | null;
  history: TelemetryPacket[];
  isConnected: boolean;
  selectedCameraMode: "ORBIT" | "CHASER" | "BORESIGHT";
  setTelemetry: (packet: TelemetryPacket) => void;
  setConnected: (connected: boolean) => void;
  setCameraMode: (mode: "ORBIT" | "CHASER" | "BORESIGHT") => void;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  currentTelemetry: null,
  history: [],
  isConnected: false,
  selectedCameraMode: "ORBIT",
  setTelemetry: (packet) =>
    set((state) => ({
      currentTelemetry: packet,
      // Retain last 60 packets for sparklines/trends
      history: [...state.history.slice(-59), packet],
    })),
  setConnected: (connected) => set({ isConnected: connected }),
  setCameraMode: (mode) => set({ selectedCameraMode: mode }),
}));
