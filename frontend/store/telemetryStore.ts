import { create } from "zustand";
import { TelemetryPacket } from "../types/telemetry";

export type CameraMode = "ORBIT" | "CHASER" | "BORESIGHT" | "TARGET_DOCK";
export type HudViewMode = "OPTICAL" | "WIREFRAME";

interface TelemetryState {
  currentTelemetry: TelemetryPacket | null;
  history: TelemetryPacket[];
  isConnected: boolean;
  selectedCameraMode: CameraMode;
  simSpeed: number;
  isAutoPilot: boolean;
  hudViewMode: HudViewMode;
  setTelemetry: (packet: TelemetryPacket) => void;
  setConnected: (connected: boolean) => void;
  setCameraMode: (mode: CameraMode) => void;
  setSimSpeed: (speed: number) => void;
  setAutoPilot: (enabled: boolean) => void;
  setHudViewMode: (mode: HudViewMode) => void;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  currentTelemetry: null,
  history: [],
  isConnected: false,
  selectedCameraMode: "ORBIT",
  simSpeed: 1,
  isAutoPilot: false,
  hudViewMode: "OPTICAL",
  setTelemetry: (packet) =>
    set((state) => ({
      currentTelemetry: packet,
      // Retain last 60 packets for sparklines/trends
      history: [...state.history.slice(-59), packet],
    })),
  setConnected: (connected) => set({ isConnected: connected }),
  setCameraMode: (mode) => set({ selectedCameraMode: mode }),
  setSimSpeed: (speed) => set({ simSpeed: speed }),
  setAutoPilot: (enabled) => set({ isAutoPilot: enabled }),
  setHudViewMode: (mode) => set({ hudViewMode: mode }),
}));
