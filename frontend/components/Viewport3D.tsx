"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useTelemetryStore } from "../store/telemetryStore";
import { Eye, Orbit, Compass, Layers, ShieldCheck, AlertTriangle, Target } from "lucide-react";

export default function Viewport3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const { currentTelemetry, selectedCameraMode, setCameraMode } = useTelemetryStore();

  const cameraModeRef = useRef(selectedCameraMode);
  useEffect(() => {
    cameraModeRef.current = selectedCameraMode;
  }, [selectedCameraMode]);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const chaserGroupRef = useRef<THREE.Group | null>(null);
  const targetGroupRef = useRef<THREE.Group | null>(null);
  const kozMeshRef = useRef<THREE.Mesh | null>(null);
  const corridorMeshRef = useRef<THREE.Mesh | null>(null);
  const trajectoryLineRef = useRef<THREE.Line | null>(null);

  // Manual Orbit Mouse Controls State
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const sphericalRef = useRef({ radius: 65, theta: Math.PI / 4, phi: Math.PI / 3 });

  // Trajectory points buffer
  const trajectoryPointsRef = useRef<THREE.Vector3[]>([]);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060d);
    scene.fog = new THREE.FogExp2(0x04060d, 0.003);
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    cameraRef.current = camera;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting (Sunlight + Ambient Earthshine)
    const ambientLight = new THREE.AmbientLight(0x223355, 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(120, 80, 100);
    scene.add(sunLight);

    const earthshineLight = new THREE.DirectionalLight(0x00aaff, 0.5);
    earthshineLight.position.set(-80, -100, -50);
    scene.add(earthshineLight);

    // 5. Starfield Skybox
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1200;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 800;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 800;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 800;

      // Varied star hues (cyan, white, faint violet)
      starColors[i * 3] = 0.8 + Math.random() * 0.2;
      starColors[i * 3 + 1] = 0.85 + Math.random() * 0.15;
      starColors[i * 3 + 2] = 1.0;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({ size: 1.2, vertexColors: true, transparent: true, opacity: 0.85 });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 6. Realistic Earth Globe in the Distance
    const earthGroup = new THREE.Group();
    earthGroup.position.set(0, -220, -180);
    const earthGeo = new THREE.SphereGeometry(180, 48, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x113366,
      roughness: 0.8,
      metalness: 0.1,
      emissive: 0x021122,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earthMesh);

    // Earth Atmospheric Haze Glow
    const atmosGeo = new THREE.SphereGeometry(183, 48, 48);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    });
    earthGroup.add(new THREE.Mesh(atmosGeo, atmosMat));
    scene.add(earthGroup);

    // 7. TARGET DEBRIS / SPACE STATION SATELLITE (Origin at 0, 0, 0)
    const targetGroup = new THREE.Group();
    // Central Rocket Body / Station Module (Cylinder)
    const tankGeo = new THREE.CylinderGeometry(2.2, 2.2, 7.0, 32);
    const tankMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.25,
    });
    const tankMesh = new THREE.Mesh(tankGeo, tankMat);
    targetGroup.add(tankMesh);

    // Docking Port Ring (Gold/Anodized Collar)
    const dockRingGeo = new THREE.TorusGeometry(1.6, 0.25, 16, 32);
    const dockRingMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.1,
    });
    const dockRing = new THREE.Mesh(dockRingGeo, dockRingMat);
    dockRing.rotation.x = Math.PI / 2;
    dockRing.position.y = 3.5;
    targetGroup.add(dockRing);

    // Target Solar Array Wings
    const tWingGeo = new THREE.BoxGeometry(7.0, 1.8, 0.08);
    const tWingMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      roughness: 0.3,
      metalness: 0.7,
    });
    const tWing = new THREE.Mesh(tWingGeo, tWingMat);
    tWing.position.set(0, 0, 0);
    targetGroup.add(tWing);

    scene.add(targetGroup);
    targetGroupRef.current = targetGroup;

    // 8. Holographic Approach Corridor (Funnel leading to Docking Port)
    const corridorGeo = new THREE.ConeGeometry(8.0, 45.0, 16, 1, true);
    const corridorMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    });
    const corridorMesh = new THREE.Mesh(corridorGeo, corridorMat);
    corridorMesh.rotation.x = -Math.PI / 2;
    corridorMesh.position.set(0, 0, -22.5);
    scene.add(corridorMesh);
    corridorMeshRef.current = corridorMesh;

    // 9. Keep-Out Zone (KOZ) Translucent Safety Ellipsoid
    const kozGeo = new THREE.SphereGeometry(6.5, 32, 32);
    const kozMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });
    const kozMesh = new THREE.Mesh(kozGeo, kozMat);
    scene.add(kozMesh);
    kozMeshRef.current = kozMesh;

    // 10. ASTRA CHASER CUBESAT (6U Bus with deployable solar panels & thruster block)
    const chaserGroup = new THREE.Group();
    // 6U Main Chassis (30cm x 20cm x 10cm proportions)
    const chassisGeo = new THREE.BoxGeometry(1.6, 3.2, 1.2);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.2,
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chaserGroup.add(chassis);

    // Gold Multi-Layer Insulation (MLI) Thermal Blanket Face
    const mliGeo = new THREE.PlaneGeometry(1.58, 3.18);
    const mliMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.95,
      roughness: 0.3,
    });
    const mliFace = new THREE.Mesh(mliGeo, mliMat);
    mliFace.position.z = 0.61;
    chaserGroup.add(mliFace);

    // Deployable Solar Arrays (Left & Right Wings with PV grid texture)
    const wingGeo = new THREE.BoxGeometry(3.8, 2.8, 0.06);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.6,
      roughness: 0.15,
    });
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-2.8, 0, 0);
    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(2.8, 0, 0);
    chaserGroup.add(leftWing);
    chaserGroup.add(rightWing);

    // Optical Sensor Head & LiDAR Aperture
    const lensGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.3, 16);
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.9, roughness: 0.1 });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0.8, 0.7);
    chaserGroup.add(lens);

    // 3-Finger Compliant Gecko Gripper Arms
    for (let f = 0; f < 3; f++) {
      const angle = (f * 2 * Math.PI) / 3;
      const fingerGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8);
      const fingerMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 });
      const finger = new THREE.Mesh(fingerGeo, fingerMat);
      finger.position.set(0.4 * Math.cos(angle), -0.6 + 0.4 * Math.sin(angle), 0.8);
      finger.rotation.x = Math.PI / 3;
      chaserGroup.add(finger);
    }

    scene.add(chaserGroup);
    chaserGroupRef.current = chaserGroup;

    // 11. Coordinate Grid Floor in Space
    const gridHelper = new THREE.GridHelper(120, 24, 0x00f0ff, 0x1f2937);
    gridHelper.position.y = -8;
    scene.add(gridHelper);

    // 12. Dynamic Trajectory Line
    const trajMaxPoints = 150;
    const trajGeo = new THREE.BufferGeometry();
    const trajPositions = new Float32Array(trajMaxPoints * 3);
    trajGeo.setAttribute("position", new THREE.BufferAttribute(trajPositions, 3));
    const trajMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.7 });
    const trajLine = new THREE.Line(trajGeo, trajMat);
    scene.add(trajLine);
    trajectoryLineRef.current = trajLine;

    // Mouse Drag Interaction Handlers
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      sphericalRef.current.theta -= deltaX * 0.008;
      sphericalRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, sphericalRef.current.phi - deltaY * 0.008));

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      sphericalRef.current.radius = Math.max(10, Math.min(200, sphericalRef.current.radius + e.deltaY * 0.08));
    };

    const domElement = renderer.domElement;
    domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    domElement.addEventListener("wheel", onWheel, { passive: false });

    // Animation Render Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Starfield rotation
      starField.rotation.y += 0.00015;

      // Target slow space tumble
      if (targetGroupRef.current) {
        targetGroupRef.current.rotation.x += 0.003;
        targetGroupRef.current.rotation.y += 0.002;
      }

      // Camera Positioning based on Selected Mode
      if (cameraRef.current) {
        const cam = cameraRef.current;
        const mode = cameraModeRef.current;

        if (mode === "ORBIT") {
          if (chaserGroupRef.current) chaserGroupRef.current.visible = true;
          const { radius, theta, phi } = sphericalRef.current;
          cam.position.x = radius * Math.sin(phi) * Math.sin(theta);
          cam.position.y = radius * Math.cos(phi);
          cam.position.z = radius * Math.sin(phi) * Math.cos(theta);
          cam.lookAt(0, 0, 0);
        } else if (mode === "CHASER" && chaserGroupRef.current) {
          chaserGroupRef.current.visible = true;
          const cp = chaserGroupRef.current.position;
          const dist = cp.length();
          const dirFromTarget = dist > 0.1 ? cp.clone().normalize() : new THREE.Vector3(0, 0, -1);
          // Position camera behind CubeSat with slight vertical offset
          const offsetDist = Math.min(18, Math.max(6, dist * 0.2 + 5));
          cam.position.copy(cp).addScaledVector(dirFromTarget, offsetDist).add(new THREE.Vector3(0, 3.2, 0));
          cam.lookAt(0, 0, 0);
        } else if (mode === "BORESIGHT" && chaserGroupRef.current) {
          // Boresight is first-person optical camera POV looking forward from CubeSat nose
          chaserGroupRef.current.visible = false;
          const cp = chaserGroupRef.current.position;
          cam.position.copy(cp);
          cam.lookAt(0, 0, 0);
        } else if (mode === "TARGET_DOCK" && chaserGroupRef.current) {
          // Target collar POV looking back at incoming ASTRA CubeSat
          chaserGroupRef.current.visible = true;
          const cp = chaserGroupRef.current.position;
          cam.position.set(0, 3.5, 1.2);
          cam.lookAt(cp.x, cp.y, cp.z);
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      domElement.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      domElement.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(animId);
      if (renderer.domElement && mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Satellite Position, KOZ, and Trajectory Spline from Telemetry
  useEffect(() => {
    if (!currentTelemetry || !chaserGroupRef.current) return;

    const [x, y, z] = currentTelemetry.chaser.position;
    // Map LVLH to Three.js coordinates (scaled 1:2 for view)
    const posX = z * 0.5;
    const posY = x * 0.5;
    const posZ = y * 0.5;

    chaserGroupRef.current.position.set(posX, posY, posZ);

    // Apply Quaternions
    const [q0, q1, q2, q3] = currentTelemetry.chaser.quaternion;
    chaserGroupRef.current.quaternion.set(q1, q2, q3, q0);

    // Append to Trajectory Buffer
    if (trajectoryLineRef.current) {
      const buffer = trajectoryPointsRef.current;
      buffer.push(new THREE.Vector3(posX, posY, posZ));
      if (buffer.length > 120) buffer.shift();

      const positions = trajectoryLineRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < buffer.length; i++) {
        positions[i * 3] = buffer[i].x;
        positions[i * 3 + 1] = buffer[i].y;
        positions[i * 3 + 2] = buffer[i].z;
      }
      trajectoryLineRef.current.geometry.setDrawRange(0, buffer.length);
      trajectoryLineRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Update Keep-Out Zone (KOZ) Ellipsoid Status
    if (kozMeshRef.current) {
      const mat = kozMeshRef.current.material as THREE.MeshBasicMaterial;
      if (currentTelemetry.target.koz_status === "BREACH") {
        mat.color.setHex(0xef4444); // Red
        mat.opacity = 0.45;
      } else if (currentTelemetry.target.koz_status === "APPROACH_CORRIDOR") {
        mat.color.setHex(0xf59e0b); // Amber
        mat.opacity = 0.28;
      } else {
        mat.color.setHex(0x10b981); // Emerald Green
        mat.opacity = 0.18;
      }
    }
  }, [currentTelemetry]);

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-xl overflow-hidden aerospace-panel border border-space-700/80">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Controls Overlay */}
      <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-10 font-tactical">
        <button
          onClick={() => setCameraMode("ORBIT")}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded border transition-all ${
            selectedCameraMode === "ORBIT"
              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_12px_rgba(0,240,255,0.3)]"
              : "bg-space-900/80 border-space-700 text-gray-400 hover:text-white"
          }`}
        >
          <Orbit className="w-3.5 h-3.5" />
          <span>FREE ORBIT CAM</span>
        </button>

        <button
          onClick={() => setCameraMode("CHASER")}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded border transition-all ${
            selectedCameraMode === "CHASER"
              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_12px_rgba(0,240,255,0.3)]"
              : "bg-space-900/80 border-space-700 text-gray-400 hover:text-white"
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>CHASER CHASE-CAM</span>
        </button>

        <button
          onClick={() => setCameraMode("BORESIGHT")}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded border transition-all ${
            selectedCameraMode === "BORESIGHT"
              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_12px_rgba(0,240,255,0.3)]"
              : "bg-space-900/80 border-space-700 text-gray-400 hover:text-white"
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>AI SENSOR BORESIGHT</span>
        </button>

        <button
          onClick={() => setCameraMode("TARGET_DOCK")}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded border transition-all ${
            selectedCameraMode === "TARGET_DOCK"
              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_12px_rgba(0,240,255,0.3)]"
              : "bg-space-900/80 border-space-700 text-gray-400 hover:text-white"
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>TARGET DOCK-CAM</span>
        </button>
      </div>

      {/* Viewport Status & Help Badges */}
      <div className="absolute bottom-3 left-3 flex items-center gap-3 z-10 font-tactical text-[11px] text-gray-400 bg-space-950/80 border border-space-800 px-3 py-1.5 rounded-lg backdrop-blur-md">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <strong className="text-white">DRAG:</strong> Rotate
        </span>
        <span>•</span>
        <span><strong className="text-white">SCROLL:</strong> Zoom</span>
        <span>•</span>
        <span><strong className="text-red-400">X:</strong> Radial | <strong className="text-green-400">Y:</strong> V-Bar | <strong className="text-blue-400">Z:</strong> H-Bar</span>
      </div>

      {/* Target Info Tag */}
      <div className="absolute top-3 right-3 z-10 font-tactical text-xs bg-space-950/80 border border-space-800 px-3 py-1.5 rounded-lg text-right">
        <div className="text-gray-400 text-[10px]">COORDINATE ORIGIN (0,0,0)</div>
        <div className="text-cyan-300 font-bold">TARGET: NON-COOPERATIVE UPPER STAGE</div>
      </div>
    </div>
  );
}
