"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { useTelemetryStore } from "../store/telemetryStore";

export default function Viewport3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const { currentTelemetry, selectedCameraMode, setCameraMode } = useTelemetryStore();

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const chaserMeshRef = useRef<THREE.Group | null>(null);
  const targetMeshRef = useRef<THREE.Mesh | null>(null);
  const kozMeshRef = useRef<THREE.Mesh | null>(null);
  const trajectoryLineRef = useRef<THREE.Line | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene setup
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050711);
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 30, 70);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
    sunLight.position.set(100, 50, 100);
    scene.add(sunLight);

    // 5. Starfield background
    const starGeo = new THREE.BufferGeometry();
    const starCount = 800;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      starPos[i] = (Math.random() - 0.5) * 500;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x88bbff, size: 0.8 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 6. Target (Debris / Station Docking Port at Origin)
    const targetGeo = new THREE.CylinderGeometry(2, 2, 5, 16);
    const targetMat = new THREE.MeshStandardMaterial({
      color: 0x8899aa,
      metalness: 0.8,
      roughness: 0.2,
      wireframe: false,
    });
    const targetMesh = new THREE.Mesh(targetGeo, targetMat);
    scene.add(targetMesh);
    targetMeshRef.current = targetMesh;

    // 7. Keep-Out Zone (KOZ) Ellipsoid
    const kozGeo = new THREE.SphereGeometry(6, 24, 24);
    const kozMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const kozMesh = new THREE.Mesh(kozGeo, kozMat);
    scene.add(kozMesh);
    kozMeshRef.current = kozMesh;

    // 8. Chaser CubeSat (ASTRA 6U Model)
    const chaserGroup = new THREE.Group();
    // Bus body (30x20x10 scale)
    const busGeo = new THREE.BoxGeometry(1.5, 3.0, 1.0);
    const busMat = new THREE.MeshStandardMaterial({
      color: 0x223344,
      metalness: 0.9,
      roughness: 0.3,
    });
    const busMesh = new THREE.Mesh(busGeo, busMat);
    chaserGroup.add(busMesh);

    // Solar Wings
    const wingGeo = new THREE.BoxGeometry(3.5, 2.5, 0.05);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x0044aa,
      roughness: 0.1,
      metalness: 0.5,
    });
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-2.8, 0, 0);
    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(2.8, 0, 0);
    chaserGroup.add(leftWing);
    chaserGroup.add(rightWing);

    scene.add(chaserGroup);
    chaserMeshRef.current = chaserGroup;

    // 9. Coordinate Grid Plane
    const gridHelper = new THREE.GridHelper(100, 20, 0x00f0ff, 0x1f2937);
    gridHelper.position.y = -5;
    scene.add(gridHelper);

    // Animation Loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Slow rotation of stars
      stars.rotation.y += 0.0002;

      // Slow tumble of non-cooperative target
      if (targetMeshRef.current) {
        targetMeshRef.current.rotation.x += 0.005;
        targetMeshRef.current.rotation.y += 0.003;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Handle Resize
    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const newW = mountRef.current.clientWidth;
      const newH = mountRef.current.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      if (renderer.domElement && mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Chaser Position and KOZ state from live telemetry
  useEffect(() => {
    if (!currentTelemetry || !chaserMeshRef.current) return;

    const [x, y, z] = currentTelemetry.chaser.position;
    // Map LVLH [Radial(x), In-Track(y), Cross-Track(z)] to Three.js coordinates
    // Scale for visual clarity (1/2 scale)
    chaserMeshRef.current.position.set(z * 0.5, x * 0.5, y * 0.5);

    // Update Quaternions if available
    const [q0, q1, q2, q3] = currentTelemetry.chaser.quaternion;
    chaserMeshRef.current.quaternion.set(q1, q2, q3, q0);

    // Update KOZ status color
    if (kozMeshRef.current) {
      const mat = kozMeshRef.current.material as THREE.MeshBasicMaterial;
      if (currentTelemetry.target.koz_status === "BREACH") {
        mat.color.setHex(0xef4444);
        mat.opacity = 0.45;
      } else if (currentTelemetry.target.koz_status === "APPROACH_CORRIDOR") {
        mat.color.setHex(0xf59e0b);
        mat.opacity = 0.3;
      } else {
        mat.color.setHex(0x10b981);
        mat.opacity = 0.2;
      }
    }

    // Camera follow modes
    if (cameraRef.current && chaserMeshRef.current) {
      if (selectedCameraMode === "CHASER") {
        const p = chaserMeshRef.current.position;
        cameraRef.current.position.set(p.x, p.y + 10, p.z + 20);
        cameraRef.current.lookAt(0, 0, 0);
      } else if (selectedCameraMode === "BORESIGHT") {
        const p = chaserMeshRef.current.position;
        cameraRef.current.position.set(p.x, p.y, p.z);
        cameraRef.current.lookAt(0, 0, 0);
      }
    }
  }, [currentTelemetry, selectedCameraMode]);

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden border border-space-700 bg-space-950">
      <div ref={mountRef} className="w-full h-full" />

      {/* Camera Mode Selectors */}
      <div className="absolute top-4 left-4 flex gap-2 z-10">
        <button
          onClick={() => setCameraMode("ORBIT")}
          className={`px-3 py-1 text-xs font-mono rounded border transition-colors ${
            selectedCameraMode === "ORBIT"
              ? "bg-cyan-neon/20 border-cyan-neon text-cyan-neon font-bold"
              : "bg-space-800/80 border-space-600 text-gray-400 hover:text-white"
          }`}
        >
          GLOBAL ORBIT
        </button>
        <button
          onClick={() => setCameraMode("CHASER")}
          className={`px-3 py-1 text-xs font-mono rounded border transition-colors ${
            selectedCameraMode === "CHASER"
              ? "bg-cyan-neon/20 border-cyan-neon text-cyan-neon font-bold"
              : "bg-space-800/80 border-space-600 text-gray-400 hover:text-white"
          }`}
        >
          CHASER CAM
        </button>
        <button
          onClick={() => setCameraMode("BORESIGHT")}
          className={`px-3 py-1 text-xs font-mono rounded border transition-colors ${
            selectedCameraMode === "BORESIGHT"
              ? "bg-cyan-neon/20 border-cyan-neon text-cyan-neon font-bold"
              : "bg-space-800/80 border-space-600 text-gray-400 hover:text-white"
          }`}
        >
          BORESIGHT (AI POV)
        </button>
      </div>

      {/* 3D Coordinate Axis Badge */}
      <div className="absolute bottom-4 left-4 bg-space-900/80 border border-space-700 px-3 py-1.5 rounded text-[11px] font-mono text-gray-400">
        <span className="text-red-400 font-bold">X: Radial</span> |{" "}
        <span className="text-green-400 font-bold">Y: V-Bar</span> |{" "}
        <span className="text-blue-400 font-bold">Z: H-Bar</span>
      </div>
    </div>
  );
}
