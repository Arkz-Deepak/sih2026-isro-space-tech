"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useTelemetryStore } from "../store/telemetryStore";
import { Eye, Orbit, Compass, Target, Upload, Flame, Sparkles, Box, CheckCircle2 } from "lucide-react";

export default function Viewport3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentTelemetry, selectedCameraMode, setCameraMode } = useTelemetryStore();

  const [orbitFocus, setOrbitFocus] = useState<"CHASER" | "TARGET">("CHASER");
  const [customModelLoaded, setCustomModelLoaded] = useState<string | null>(null);

  const cameraModeRef = useRef(selectedCameraMode);
  const orbitFocusRef = useRef(orbitFocus);

  useEffect(() => {
    cameraModeRef.current = selectedCameraMode;
  }, [selectedCameraMode]);

  useEffect(() => {
    orbitFocusRef.current = orbitFocus;
  }, [orbitFocus]);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const chaserGroupRef = useRef<THREE.Group | null>(null);
  const proceduralChassisRef = useRef<THREE.Group | null>(null);
  const targetGroupRef = useRef<THREE.Group | null>(null);
  const kozMeshRef = useRef<THREE.Mesh | null>(null);
  const corridorMeshRef = useRef<THREE.Mesh | null>(null);
  const trajectoryLineRef = useRef<THREE.Line | null>(null);
  const laserBeamRef = useRef<THREE.Line | null>(null);

  // Dynamic Actuator Refs
  const gripperFingersRef = useRef<THREE.Group[]>([]);
  const gripperPadsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const thrusterPlumesRef = useRef<THREE.Mesh[]>([]);

  // Manual Orbit Mouse Controls State
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const sphericalRef = useRef({ radius: 14, theta: Math.PI / 4, phi: Math.PI / 3 });

  // Trajectory points buffer
  const trajectoryPointsRef = useRef<THREE.Vector3[]>([]);

  // Handle Drag-and-Drop or File Upload of 3D CAD (.glb / .gltf)
  const loadCustomGLB = (file: File) => {
    const url = URL.createObjectURL(file);
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        if (!chaserGroupRef.current) return;
        // Hide procedural chassis
        if (proceduralChassisRef.current) {
          proceduralChassisRef.current.visible = false;
        }
        // Remove previous custom model if any
        const existing = chaserGroupRef.current.getObjectByName("CUSTOM_CAD_MODEL");
        if (existing) chaserGroupRef.current.remove(existing);

        const customScene = gltf.scene;
        customScene.name = "CUSTOM_CAD_MODEL";

        // Auto-scale model to approximately 3.2 units length
        const box = new THREE.Box3().setFromObject(customScene);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const s = 3.2 / maxDim;
          customScene.scale.set(s, s, s);
        }

        // Center custom model
        const center = box.getCenter(new THREE.Vector3());
        customScene.position.sub(center.multiplyScalar(3.2 / Math.max(maxDim, 1e-4)));

        chaserGroupRef.current.add(customScene);
        setCustomModelLoaded(file.name);
      },
      undefined,
      (error) => {
        console.error("Error loading custom GLB/GLTF model:", error);
      }
    );
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030611);
    scene.fog = new THREE.FogExp2(0x030611, 0.002);
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

    // 4. Lighting (Sunlight + Earthshine + Tactical Blue Rim)
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.0);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.8);
    sunLight.position.set(120, 80, 100);
    scene.add(sunLight);

    const earthshineLight = new THREE.DirectionalLight(0x00aaff, 0.8);
    earthshineLight.position.set(-80, -100, -50);
    scene.add(earthshineLight);

    const rimLight = new THREE.PointLight(0x38bdf8, 1.2, 50);
    rimLight.position.set(0, 10, -20);
    scene.add(rimLight);

    // 5. Starfield Skybox
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1500;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 800;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 800;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 800;

      starColors[i * 3] = 0.8 + Math.random() * 0.2;
      starColors[i * 3 + 1] = 0.85 + Math.random() * 0.15;
      starColors[i * 3 + 2] = 1.0;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({ size: 1.3, vertexColors: true, transparent: true, opacity: 0.85 });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 6. Realistic Earth Globe in Distance
    const earthGroup = new THREE.Group();
    earthGroup.position.set(0, -240, -180);
    const earthGeo = new THREE.SphereGeometry(180, 48, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0f2c59,
      roughness: 0.8,
      metalness: 0.1,
      emissive: 0x021122,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earthMesh);

    const atmosGeo = new THREE.SphereGeometry(183, 48, 48);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide,
    });
    earthGroup.add(new THREE.Mesh(atmosGeo, atmosMat));
    scene.add(earthGroup);

    // 7. TARGET DEBRIS / SPACE STATION SATELLITE (Origin 0,0,0)
    const targetGroup = new THREE.Group();
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

    // Target Solar Wings
    const tWingGeo = new THREE.BoxGeometry(7.0, 1.8, 0.08);
    const tWingMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      roughness: 0.3,
      metalness: 0.7,
    });
    const tWing = new THREE.Mesh(tWingGeo, tWingMat);
    targetGroup.add(tWing);

    scene.add(targetGroup);
    targetGroupRef.current = targetGroup;

    // 8. Approach Corridor Funnel
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

    // 10. ASTRA CHASER CUBESAT (6U Assembly with Interactive Actuators)
    const chaserGroup = new THREE.Group();
    const proceduralChassis = new THREE.Group();
    proceduralChassis.name = "proceduralChassis";

    // 6U Main Chassis (30cm x 20cm x 10cm proportions)
    const chassisGeo = new THREE.BoxGeometry(1.6, 3.2, 1.2);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.2,
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    proceduralChassis.add(chassis);

    // Gold MLI Thermal Blanket Face
    const mliGeo = new THREE.PlaneGeometry(1.58, 3.18);
    const mliMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.95,
      roughness: 0.3,
    });
    const mliFace = new THREE.Mesh(mliGeo, mliMat);
    mliFace.position.z = 0.61;
    proceduralChassis.add(mliFace);

    // Deployable Solar Arrays (Left & Right Wings)
    const wingGeo = new THREE.BoxGeometry(3.8, 2.8, 0.06);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.7,
      roughness: 0.15,
    });
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-2.8, 0, 0);
    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(2.8, 0, 0);
    proceduralChassis.add(leftWing);
    proceduralChassis.add(rightWing);

    // Optical Sensor Head & LiDAR Aperture
    const lensGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.3, 16);
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.9, roughness: 0.1 });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0.8, 0.7);
    proceduralChassis.add(lens);

    // Interactive 3-Finger Articulated Gecko-Gripper
    const fingerGroups: THREE.Group[] = [];
    const padMats: THREE.MeshStandardMaterial[] = [];

    for (let f = 0; f < 3; f++) {
      const angle = (f * 2 * Math.PI) / 3;
      const fingerPivot = new THREE.Group();
      fingerPivot.position.set(0.42 * Math.cos(angle), -0.6 + 0.42 * Math.sin(angle), 0.65);
      fingerPivot.rotation.z = angle;

      // Base Articulated Finger Rod
      const rodGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.75, 8);
      const rodMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85 });
      const rod = new THREE.Mesh(rodGeo, rodMat);
      rod.position.y = 0.38;
      fingerPivot.add(rod);

      // Tip Gecko Adhesive Pad with Electro-Adhesion Glow
      const padGeo = new THREE.BoxGeometry(0.22, 0.22, 0.06);
      const padMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x000000,
        emissiveIntensity: 0.0,
        roughness: 0.2,
      });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(0, 0.75, 0.05);
      fingerPivot.add(pad);

      fingerPivot.rotation.x = 0.4; // Default initial angle
      proceduralChassis.add(fingerPivot);
      fingerGroups.push(fingerPivot);
      padMats.push(padMat);
    }
    gripperFingersRef.current = fingerGroups;
    gripperPadsRef.current = padMats;

    // 8 Cold-Gas Thruster Plumes
    const plumes: THREE.Mesh[] = [];
    const plumePositions = [
      // 4 Aft Thrusters (Pushing Forward along +Z, plume exhausts along -Z)
      { pos: [-0.5, 1.0, -0.65], rot: [Math.PI / 2, 0, 0] },
      { pos: [0.5, 1.0, -0.65], rot: [Math.PI / 2, 0, 0] },
      { pos: [-0.5, -1.0, -0.65], rot: [Math.PI / 2, 0, 0] },
      { pos: [0.5, -1.0, -0.65], rot: [Math.PI / 2, 0, 0] },
      // Lateral Thrusters (+X, -X)
      { pos: [0.85, 0.0, 0.0], rot: [0, 0, -Math.PI / 2] },
      { pos: [-0.85, 0.0, 0.0], rot: [0, 0, Math.PI / 2] },
      // Vertical Thrusters (+Y, -Y)
      { pos: [0.0, 1.65, 0.0], rot: [0, 0, 0] },
      { pos: [0.0, -1.65, 0.0], rot: [Math.PI, 0, 0] },
    ];

    plumePositions.forEach((tp) => {
      const plumeGeo = new THREE.ConeGeometry(0.18, 0.7, 12);
      const plumeMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.0, // Hidden until thruster fires
      });
      const plumeMesh = new THREE.Mesh(plumeGeo, plumeMat);
      plumeMesh.position.set(tp.pos[0], tp.pos[1], tp.pos[2]);
      plumeMesh.rotation.set(tp.rot[0], tp.rot[1], tp.rot[2]);
      proceduralChassis.add(plumeMesh);
      plumes.push(plumeMesh);
    });
    thrusterPlumesRef.current = plumes;

    chaserGroup.add(proceduralChassis);
    proceduralChassisRef.current = proceduralChassis;
    scene.add(chaserGroup);
    chaserGroupRef.current = chaserGroup;

    // 11. LiDAR Range Laser Beam Line (Connecting Chaser Lens to Target)
    const laserGeo = new THREE.BufferGeometry();
    const laserPositions = new Float32Array(6);
    laserGeo.setAttribute("position", new THREE.BufferAttribute(laserPositions, 3));
    const laserMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 });
    const laserLine = new THREE.Line(laserGeo, laserMat);
    scene.add(laserLine);
    laserBeamRef.current = laserLine;

    // 12. Coordinate Grid Floor
    const gridHelper = new THREE.GridHelper(120, 24, 0x00f0ff, 0x1f2937);
    gridHelper.position.y = -8;
    scene.add(gridHelper);

    // 13. Dynamic Trajectory Line
    const trajMaxPoints = 150;
    const trajGeo = new THREE.BufferGeometry();
    const trajPositions = new Float32Array(trajMaxPoints * 3);
    trajGeo.setAttribute("position", new THREE.BufferAttribute(trajPositions, 3));
    const trajMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.7 });
    const trajLine = new THREE.Line(trajGeo, trajMat);
    scene.add(trajLine);
    trajectoryLineRef.current = trajLine;

    // Drag-and-Drop 3D CAD (.glb) Listeners on Mount Element
    const domElement = renderer.domElement;
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      domElement.style.border = "2px dashed #00f0ff";
    };
    const onDragLeave = () => {
      domElement.style.border = "none";
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      domElement.style.border = "none";
      const file = e.dataTransfer?.files?.[0];
      if (file && (file.name.endsWith(".glb") || file.name.endsWith(".gltf"))) {
        loadCustomGLB(file);
      }
    };

    domElement.addEventListener("dragover", onDragOver);
    domElement.addEventListener("dragleave", onDragLeave);
    domElement.addEventListener("drop", onDrop);

    // Mouse Controls
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
      sphericalRef.current.radius = Math.max(4, Math.min(180, sphericalRef.current.radius + e.deltaY * 0.05));
    };

    domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    domElement.addEventListener("wheel", onWheel, { passive: false });

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Starfield slow rotation
      starField.rotation.y += 0.00015;

      // Target slow space tumble
      if (targetGroupRef.current) {
        targetGroupRef.current.rotation.x += 0.003;
        targetGroupRef.current.rotation.y += 0.002;
      }

      // Camera Positioning
      if (cameraRef.current && chaserGroupRef.current) {
        const cam = cameraRef.current;
        const mode = cameraModeRef.current;
        const focus = orbitFocusRef.current;
        const cp = chaserGroupRef.current.position;

        if (mode === "ORBIT") {
          chaserGroupRef.current.visible = true;
          const { radius, theta, phi } = sphericalRef.current;
          const centerTarget = focus === "CHASER" ? cp : new THREE.Vector3(0, 0, 0);

          cam.position.x = centerTarget.x + radius * Math.sin(phi) * Math.sin(theta);
          cam.position.y = centerTarget.y + radius * Math.cos(phi);
          cam.position.z = centerTarget.z + radius * Math.sin(phi) * Math.cos(theta);
          cam.lookAt(centerTarget);
        } else if (mode === "CHASER") {
          chaserGroupRef.current.visible = true;
          const dist = cp.length();
          const dirFromTarget = dist > 0.1 ? cp.clone().normalize() : new THREE.Vector3(0, 0, -1);
          // Position camera behind CubeSat looking toward the target docking port
          const offsetDist = Math.min(16, Math.max(6, dist * 0.2 + 5));
          cam.position.copy(cp).addScaledVector(dirFromTarget, offsetDist).add(new THREE.Vector3(0, 3.2, 0));
          cam.lookAt(0, 0, 0);
        } else if (mode === "BORESIGHT") {
          chaserGroupRef.current.visible = false;
          cam.position.copy(cp);
          cam.lookAt(0, 0, 0);
        } else if (mode === "TARGET_DOCK") {
          chaserGroupRef.current.visible = true;
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
      domElement.removeEventListener("dragover", onDragOver);
      domElement.removeEventListener("dragleave", onDragLeave);
      domElement.removeEventListener("drop", onDrop);
      cancelAnimationFrame(animId);
      if (renderer.domElement && mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Dynamic Satellite Position, Gripper, Thruster Plumes, and LiDAR Laser from Telemetry
  useEffect(() => {
    if (!currentTelemetry || !chaserGroupRef.current) return;

    const [x, y, z] = currentTelemetry.chaser.position;
    // Map LVLH [Radial(x), In-Track(y), Cross-Track(z)] to Three.js coordinates
    const posX = z * 0.5;
    const posY = x * 0.5;
    const posZ = y * 0.5;

    chaserGroupRef.current.position.set(posX, posY, posZ);

    // Apply Attitude Quaternion
    const [q0, q1, q2, q3] = currentTelemetry.chaser.quaternion;
    chaserGroupRef.current.quaternion.set(q1, q2, q3, q0);

    // 1. Interactive Gecko Gripper Actuation
    const gripperState = currentTelemetry.chaser.gripper_state || "STOWED";
    gripperFingersRef.current.forEach((finger) => {
      if (gripperState === "DEPLOYED" || gripperState === "DEPLOY") {
        finger.rotation.x = 0.85; // Open wide
      } else if (gripperState === "ELECTRO_ADHESION_ACTIVE" || gripperState === "CAPTURED") {
        finger.rotation.x = 0.55; // Clamped onto target
      } else {
        finger.rotation.x = 0.12; // Stowed flat
      }
    });

    gripperPadsRef.current.forEach((padMat) => {
      if (gripperState === "ELECTRO_ADHESION_ACTIVE" || gripperState === "CAPTURED") {
        padMat.emissive.setHex(0x00ff88);
        padMat.emissiveIntensity = 2.5; // High-voltage electrostatic neon glow
      } else {
        padMat.emissive.setHex(0x000000);
        padMat.emissiveIntensity = 0.0;
      }
    });

    // 2. Active Thruster Plumes Animation
    const activeThrusters = currentTelemetry.chaser.active_thrusters || [];
    thrusterPlumesRef.current.forEach((plume, idx) => {
      const thrust = activeThrusters[idx] || 0;
      const isFiring = thrust > 0.001;
      const plumeMat = plume.material as THREE.MeshBasicMaterial;
      if (isFiring) {
        plumeMat.opacity = 0.85;
        const flicker = 1.0 + Math.random() * 0.4;
        plume.scale.set(flicker, flicker * 1.5, flicker);
      } else {
        plumeMat.opacity = 0.0;
      }
    });

    // 3. LiDAR Laser Range Beam (Connecting Chaser to Target Docking Collar)
    if (laserBeamRef.current) {
      const positions = laserBeamRef.current.geometry.attributes.position.array as Float32Array;
      // Start: ASTRA Lens Head
      positions[0] = posX;
      positions[1] = posY + 0.8;
      positions[2] = posZ + 0.7;
      // End: Target Docking Ring
      positions[3] = 0;
      positions[4] = 3.5;
      positions[5] = 0;
      laserBeamRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // 4. Trajectory Trail Buffer
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

    // 5. Update Keep-Out Zone (KOZ) Ellipsoid Status
    if (kozMeshRef.current) {
      const mat = kozMeshRef.current.material as THREE.MeshBasicMaterial;
      if (currentTelemetry.target.koz_status === "BREACH") {
        mat.color.setHex(0xef4444);
        mat.opacity = 0.45;
      } else if (currentTelemetry.target.koz_status === "APPROACH_CORRIDOR") {
        mat.color.setHex(0xf59e0b);
        mat.opacity = 0.28;
      } else {
        mat.color.setHex(0x10b981);
        mat.opacity = 0.18;
      }
    }
  }, [currentTelemetry]);

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-xl overflow-hidden aerospace-panel border border-space-700/80">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Hidden File Input for Custom CAD Model */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".glb,.gltf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) loadCustomGLB(file);
        }}
      />

      {/* Top Controls Overlay */}
      <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-10 font-tactical">
        <button
          onClick={() => {
            setCameraMode("ORBIT");
            setOrbitFocus("CHASER");
            sphericalRef.current.radius = 12; // Zoom close to satellite!
          }}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded border transition-all ${
            selectedCameraMode === "ORBIT" && orbitFocus === "CHASER"
              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_12px_rgba(0,240,255,0.3)]"
              : "bg-space-900/80 border-space-700 text-gray-400 hover:text-white"
          }`}
          title="Orbit directly around ASTRA CubeSat to inspect solar panels and gripper"
        >
          <Orbit className="w-3.5 h-3.5 text-cyan-400" />
          <span>INSPECT ASTRA CAM</span>
        </button>

        <button
          onClick={() => {
            setCameraMode("ORBIT");
            setOrbitFocus("TARGET");
            sphericalRef.current.radius = 65; // Wide overview
          }}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded border transition-all ${
            selectedCameraMode === "ORBIT" && orbitFocus === "TARGET"
              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_12px_rgba(0,240,255,0.3)]"
              : "bg-space-900/80 border-space-700 text-gray-400 hover:text-white"
          }`}
          title="Wide overview orbiting around Target Debris origin"
        >
          <Box className="w-3.5 h-3.5" />
          <span>ORBIT OVERVIEW</span>
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
          <span>CHASE-CAM (POV)</span>
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

        {/* Custom 3D CAD (.glb) Model Uploader */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1 text-xs rounded border bg-space-900/90 border-emerald-500/40 hover:border-emerald-400 text-emerald-300 font-bold transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)]"
          title="Upload or drag your custom satellite .glb / .gltf 3D model into space!"
        >
          <Upload className="w-3.5 h-3.5 text-emerald-400" />
          <span>{customModelLoaded ? `CAD: ${customModelLoaded.slice(0, 12)}...` : "LOAD .GLB MODEL"}</span>
        </button>
      </div>

      {/* Viewport Status & Help Badges */}
      <div className="absolute bottom-3 left-3 flex items-center gap-3 z-10 font-tactical text-[11px] text-gray-400 bg-space-950/85 border border-space-800 px-3 py-1.5 rounded-lg backdrop-blur-md">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <strong className="text-white">DRAG:</strong> Rotate
        </span>
        <span>•</span>
        <span><strong className="text-white">SCROLL:</strong> Zoom</span>
        <span>•</span>
        <span className="text-cyan-300">
          <strong className="text-emerald-400">GECKO:</strong> {currentTelemetry?.chaser.gripper_state || "STOWED"}
        </span>
        <span>•</span>
        <span><strong className="text-amber-400">LASER:</strong> LOCKED</span>
      </div>

      {/* Target & Chaser Floating Status Tag */}
      <div className="absolute top-3 right-3 z-10 font-tactical text-xs bg-space-950/85 border border-space-800 px-3 py-1.5 rounded-lg text-right backdrop-blur-md">
        <div className="text-gray-400 text-[10px]">COORDINATE ORIGIN (0,0,0)</div>
        <div className="text-cyan-300 font-bold">TARGET: NON-COOPERATIVE UPPER STAGE</div>
        <div className="text-emerald-400 text-[11px] font-mono mt-0.5">
          CHASER RANGE: {currentTelemetry?.target.distance_meters.toFixed(2) || "78.40"}m
        </div>
      </div>
    </div>
  );
}
