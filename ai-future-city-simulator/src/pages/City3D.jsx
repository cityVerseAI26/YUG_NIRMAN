import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  Boxes,
  Download,
  FileText,
  Sun,
  Moon,
  RotateCw,
  ZoomIn,
  ZoomOut,
  TreePine,
  TrainFront,
  Car,
  Sparkles,
  Radio
} from "lucide-react";
import { useCity } from "../context/CityContext";
import PageHeader from "../components/common/PageHeader";
import YugNirmanMark from "../assets/yug-nirman-mark.svg";

/* ---------- layout constants ---------- */
const N = 7;          // blocks per side
const P = 19;         // block pitch
const BW = 14;        // block width
const RW = 5;         // road width
const RV = 7;         // river half-width
const HALF = 69;      // half city extent
const bridgeY = (z) => (Math.abs(z) < RV ? 0.15 + 1.6 * (1 - (z / RV) ** 2) : 0.15);

const seeded = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const canvasTex = (w, h, draw, repeat) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  return t;
};

// Box whose side-face UVs are scaled so window size stays constant at any height
const wallGeo = (w, h, d) => {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const k = f * 4 + v;
      if (f === 2 || f === 3) uv.setXY(k, 0.01, 0.01);
      else uv.setXY(k, (uv.getX(k) * (f >= 4 ? w : d)) / 8, (uv.getY(k) * h) / 16);
    }
  }
  return g;
};

// Heatmap colors calibrated to real city dataset metrics
const heatColor = (mode, b, night, trafficPct = 72, energyPct = 82) => {
  if (mode === "traffic") {
    const distFactor = THREE.MathUtils.clamp(1 - Math.hypot(b.x, b.z) / 95, 0, 1);
    const cityFactor = THREE.MathUtils.clamp(trafficPct / 100, 0, 1);
    const t = THREE.MathUtils.clamp(distFactor * 0.6 + cityFactor * 0.4, 0, 1);
    return new THREE.Color(0x22d3ee).lerp(new THREE.Color(0xf43f5e), t);
  }
  if (mode === "energy") {
    const heightFactor = THREE.MathUtils.clamp(b.h / 32, 0, 1);
    const cityFactor = THREE.MathUtils.clamp(energyPct / 100, 0, 1);
    const t = THREE.MathUtils.clamp(heightFactor * 0.55 + cityFactor * 0.45, 0, 1);
    return new THREE.Color(0x3b82f6).lerp(new THREE.Color(t > 0.55 ? 0xf59e0b : 0xa855f7), t);
  }
  return new THREE.Color(night ? 0x7a869e : 0xeef2f7);
};

export const City3D = () => {
  const { city } = useCity();
  const mountRef = useRef(null);
  const api = useRef(null);
  const [isNight, setIsNight] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState("default"); // "traffic" | "energy" | "default"
  const [layers, setLayers] = useState({ green: true, metro: true, traffic: true, sensors: true });
  const [autoRotate, setAutoRotate] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [stats, setStats] = useState({ buildings: 0, trees: 0, vehicles: 0, bridges: 0, sensors: 0 });
  const [reportBusy, setReportBusy] = useState(false);
  const [reportNotice, setReportNotice] = useState("");

  const ui = useRef({});
  ui.current = { isNight, heatmapMode, layers, autoRotate };

  // City telemetry derived from dataset
  const trafficPct = city?.metrics?.traffic?.value ?? 72;
  const energyPct = city?.metrics?.energyUsage?.value ?? 82;
  const aqiVal = city?.metrics?.aqi?.value ?? 156;
  const greenPct = city?.metrics?.greenCover?.value ?? 24;
  const cityName = city?.name ?? "Mumbai";

  /* ---------- Build the 3D digital twin ---------- */
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Seeded randomness unique to the current city
    const rand = seeded(2024 + (city?.name?.length || 7) * 31);
    const st = { night: ui.current.isNight, heat: ui.current.heatmapMode };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color();
    scene.fog = new THREE.Fog(0x000000, 150, 520);

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 1, 1500);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    /* Lights, Sun, Moon & Stars */
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(70, 110, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 10, far: 400 });
    scene.add(hemi, sun);

    const orb = new THREE.Mesh(new THREE.SphereGeometry(16, 24, 24), new THREE.MeshBasicMaterial({ fog: false }));
    orb.position.set(260, 300, 150);
    scene.add(orb);

    const starPos = [];
    for (let i = 0; i < 500; i++) {
      const a = rand() * 6.283, e = 0.15 + rand() * 1.2, r = 700;
      starPos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false }));
    scene.add(stars);

    /* Material theme system */
    const themed = [];
    const T = (m, d, n) => { themed.push([m, d, n]); return m; };
    const lam = (o) => new THREE.MeshLambertMaterial(o);
    const add = (parent, geo, mat, x, y, z, shadow) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      if (shadow) { m.castShadow = true; m.receiveShadow = true; }
      parent.add(m);
      return m;
    };

    const group = () => { const g = new THREE.Group(); scene.add(g); return g; };
    const gBuild = group();
    const gRoad = group();
    const gGreen = group();
    const gMetro = group();
    const gTraffic = group();
    const gBridge = group();
    const gSmart = group();

    /* Ground & Surrounding Hills */
    const ground = add(scene, new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), T(lam({}), 0x6aa05c, 0x0c1a15), 0, -0.05, 0);
    ground.receiveShadow = true;

    const hillMat = T(lam({ flatShading: true }), 0x4f7f55, 0x0d1d1c);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * 6.283 + rand() * 0.3, r = 300 + rand() * 40, s = 40 + rand() * 40;
      add(scene, new THREE.ConeGeometry(s, 25 + rand() * 30, 6), hillMat, Math.cos(a) * r, 10, Math.sin(a) * r);
    }

    /* River & Waterway */
    const ripple = canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#bfe3ff"; g.lineWidth = 2;
      for (let i = 0; i < 14; i++) {
        const x = rand() * w, y = rand() * h;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 + rand() * 30, y); g.stroke();
      }
    }, [60, 1]);

    const water = T(lam({ map: ripple, transparent: true, opacity: 0.92 }), 0x58b0e8, 0x14507f);
    add(scene, new THREE.PlaneGeometry(900, RV * 2).rotateX(-Math.PI / 2), water, 0, 0.06, 0);

    const walk = T(lam({}), 0xc9ced6, 0x1b2436);
    const grass = T(lam({}), 0x72b05f, 0x12372a);
    [-1, 1].forEach((s) => add(gRoad, new THREE.BoxGeometry(HALF * 2, 0.35, 0.5), walk, 0, 0.17, s * (RV + 0.1)));

    /* Roads */
    const roadTex = canvasTex(128, 32, (g, w, h) => {
      g.fillStyle = "#3b4049"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#e9d98a"; g.fillRect(8, 14, 56, 3);
      g.fillStyle = "#6b7280"; g.fillRect(0, 0, w, 2); g.fillRect(0, h - 2, w, 2);
    });
    const roadMat = T(lam({ map: roadTex }), 0xffffff, 0x5b6478);
    const roadPlane = (len) => {
      const g = new THREE.PlaneGeometry(len, RW);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) * len) / 8);
      return g.rotateX(-Math.PI / 2);
    };
    const hRoad = roadPlane(HALF * 2), vRoad = roadPlane(HALF - RV);
    for (let k = 0; k <= N; k++) {
      const p = (k - N / 2) * P;
      add(gRoad, hRoad, roadMat, 0, 0.03, p).receiveShadow = true;
      [-1, 1].forEach((s) => {
        const m = add(gRoad, vRoad, roadMat, p, 0.035, (s * (HALF + RV)) / 2);
        m.rotation.y = Math.PI / 2;
        m.receiveShadow = true;
      });
    }

    /* Architectural Facades */
    const facades = [0, 1, 2].map(() => ({
      map: canvasTex(128, 256, (g, w, h) => {
        g.fillStyle = "#e6ebf2"; g.fillRect(0, 0, w, h); g.fillStyle = "#5d7594";
        for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) g.fillRect(c * 32 + 6, r * 32 + 9, 20, 15);
      }),
      lit: canvasTex(128, 256, (g, w, h) => {
        g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff";
        for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) if (rand() < 0.42) g.fillRect(c * 32 + 6, r * 32 + 9, 20, 15);
      }),
    }));

    const edgeMat = T(new THREE.LineBasicMaterial({ transparent: true, opacity: 0.35 }), 0x94a3b8, 0x22d3ee);
    const buildings = [], pickables = [], treePts = [];
    const pondGeo = new THREE.CircleGeometry(3.2, 28).rotateX(-Math.PI / 2);

    // City zones distribution based on dataset
    const zoneNames = [
      `${cityName} Financial District`,
      `${cityName} Waterfront Marina`,
      `${cityName} Tech Corridor`,
      `${cityName} Metro Core`,
      `${cityName} Green Habitat Zone`,
      `${cityName} Heritage Quarter`
    ];

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (j === 3) continue; // river row
        const cx = (i + 0.5 - N / 2) * P, cz = (j + 0.5 - N / 2) * P;
        // Park frequency scaled by greenCover metric
        const park = rand() < Math.max(0.15, greenPct / 80);
        add(gBuild, new THREE.BoxGeometry(BW + 0.6, 0.3, BW + 0.6), park ? grass : walk, cx, 0.15, cz).receiveShadow = true;

        if (park) {
          add(gBuild, pondGeo, water, cx, 0.32, cz);
          const treeCount = Math.floor(20 + (greenPct / 100) * 20);
          for (let t = 0; t < treeCount; t++) {
            const x = cx + (rand() - 0.5) * 12.6, z = cz + (rand() - 0.5) * 12.6;
            if (Math.hypot(x - cx, z - cz) > 4) treePts.push([x, z, 0.8 + rand() * 0.8, rand() < 0.45, 0.3]);
          }
          continue;
        }

        for (let a = 0; a < 4; a++) {
          if (rand() < 0.08) continue;
          const x = cx + (a % 2 ? 3.5 : -3.5), z = cz + (a < 2 ? -3.5 : 3.5);
          const w = 4.4 + rand() * 1.9, d = 4.4 + rand() * 1.9;
          const dist = Math.hypot(x, z);
          // Building heights modulated by energyUsage and distance from core
          const heightMultiplier = 1 + (energyPct / 100) * 0.35;
          const h = (4 + Math.pow(rand(), 1.5) * (8 + 24 * Math.max(0, 1 - dist / 110))) * heightMultiplier;
          const f = facades[(rand() * 3) | 0];
          const mat = lam({ map: f.map, emissiveMap: f.lit, emissive: 0x000000 });
          const g = wallGeo(w, h, d);
          const m = add(gBuild, g, mat, x, 0.3 + h / 2, z, true);
          m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat));
          const meshes = [m];
          let total = h;
          if (h > 16) {
            const h2 = h * 0.32;
            meshes.push(add(gBuild, wallGeo(w * 0.62, h2, d * 0.62), mat, x, 0.3 + h + h2 / 2, z, true));
            total += h2;
          }

          const zoneIdx = Math.floor((Math.atan2(z, x) + Math.PI) / (Math.PI * 2) * zoneNames.length) % zoneNames.length;
          const b = {
            x, z, w, d, h: total, mat,
            info: {
              name: `Tower ${String.fromCharCode(65 + i)}${j + 1}-${a + 1}`,
              district: zoneNames[zoneIdx],
              height: `${Math.round(total * 3.4)} m`,
              floors: Math.round(total / 3.2),
              power: `${Math.round(total * (40 + energyPct * 0.4))} kW`,
              occupancy: `${Math.round(total * 30 + (city?.metrics?.population?.value ? 120 : 50))} residents`,
              aqiStatus: aqiVal > 200 ? "Severe Risk" : aqiVal > 100 ? "Moderate" : "Good",
              iotBeacon: rand() < 0.6 ? "Active Mesh Node" : "Passive Substation"
            }
          };
          meshes.forEach((mm) => { mm.userData.b = b; pickables.push(mm); });
          buildings.push(b);
        }
      }
    }

    // Outer forest ring
    const forestDensity = Math.floor(180 + (greenPct / 100) * 160);
    for (let t = 0; t < forestDensity; t++) {
      const a = rand() * 6.283, r = HALF + 8 + rand() * 90;
      const x = Math.cos(a) * r * 1.1, z = Math.sin(a) * r * 1.1;
      if (Math.abs(z) > RV + 1) treePts.push([x, z, 1 + rand() * 1.1, rand() < 0.6, 0]);
    }

    /* Instanced Trees */
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.26, 1.2, 6), lam({ color: 0x6b4a2f }), treePts.length);
    const pines = new THREE.InstancedMesh(new THREE.ConeGeometry(1.3, 3.2, 7), lam({ color: 0xffffff }), treePts.length);
    const rounds = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.5, 0), lam({ color: 0xffffff, flatShading: true }), treePts.length);
    const dm = new THREE.Object3D(), col = new THREE.Color();
    let np = 0, nr = 0;
    treePts.forEach(([x, z, s, round, y0], n) => {
      dm.rotation.set(0, rand() * 6, 0); dm.scale.setScalar(s);
      dm.position.set(x, y0 + 0.6 * s, z); dm.updateMatrix(); trunks.setMatrixAt(n, dm.matrix);
      dm.position.y = y0 + (round ? 2.4 : 2.8) * s; dm.updateMatrix();
      col.setHSL(round ? 0.22 + rand() * 0.08 : 0.34 + rand() * 0.06, 0.5 + rand() * 0.2, 0.28 + rand() * 0.14);
      if (round) { rounds.setMatrixAt(nr, dm.matrix); rounds.setColorAt(nr++, col); }
      else { pines.setMatrixAt(np, dm.matrix); pines.setColorAt(np++, col); }
    });
    pines.count = np; rounds.count = nr;
    [trunks, pines, rounds].forEach((m) => { m.castShadow = true; gGreen.add(m); });

    /* Bridges across the river */
    const bridgeMat = T(lam({}), 0xcbd5e1, 0x2a3750);
    const railMat = T(new THREE.MeshBasicMaterial(), 0x94a3b8, 0x22d3ee);
    const cableMat = T(new THREE.LineBasicMaterial(), 0xe2e8f0, 0x67e8f9);
    for (let i = 0; i <= N; i++) {
      const x = (i - N / 2) * P;
      for (let z0 = -RV; z0 < RV; z0 += 2) {
        const z1 = z0 + 2, y0 = bridgeY(z0), y1 = bridgeY(z1);
        const len = Math.hypot(2, y1 - y0) + 0.1, rot = -Math.atan2(y1 - y0, 2), zc = (z0 + z1) / 2, yc = (y0 + y1) / 2;
        add(gBridge, new THREE.BoxGeometry(RW + 0.6, 0.35, len), bridgeMat, x, yc, zc, true).rotation.x = rot;
        [-1, 1].forEach((s) => add(gBridge, new THREE.BoxGeometry(0.2, 0.2, len), railMat, x + s * (RW / 2 + 0.2), yc + 0.55, zc).rotation.x = rot);
      }
      if (i === 3 || i === 4) {
        const pts = [];
        [-1, 1].forEach((s) => {
          add(gBridge, new THREE.BoxGeometry(0.8, 15, 0.8), bridgeMat, x + s * 3.4, 7.5, 0, true);
          [-6, -4, -2, 2, 4, 6].forEach((zk) => pts.push(x + s * 3.4, 14, 0, x + s * 2.7, bridgeY(zk) + 0.3, zk));
        });
        const cg = new THREE.BufferGeometry();
        cg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        gBridge.add(new THREE.LineSegments(cg, cableMat));
      }
    }

    /* Metro System */
    const deckMat = T(lam({}), 0xb7c0cd, 0x232d44);
    const glow = T(new THREE.MeshBasicMaterial(), 0x60a5fa, 0x22d3ee);
    const trainMat = T(lam({}), 0xe5e7eb, 0x8b96ad);
    const winMat = T(new THREE.MeshBasicMaterial(), 0x93c5fd, 0xfde68a);
    const trains = [];
    const buildLine = (rotY, px, pz, y, stations, dir, skip) => {
      const L = new THREE.Group();
      L.rotation.y = rotY; L.position.set(px, 0, pz);
      add(L, new THREE.BoxGeometry(150, 0.7, 3.2), deckMat, 0, y, 0, true);
      [-1, 1].forEach((s) => add(L, new THREE.BoxGeometry(150, 0.15, 0.15), glow, 0, y + 0.45, s * 1.55));
      for (let u = -76; u <= 76; u += 19) if (!skip(u)) add(L, new THREE.BoxGeometry(0.9, y - 0.4, 0.9), deckMat, u, (y - 0.4) / 2, 0, true);
      stations.forEach((u) => {
        add(L, new THREE.BoxGeometry(14, 0.35, 5), deckMat, u, y + 0.5, 0, true);
        add(L, new THREE.BoxGeometry(12, 0.25, 5.6), deckMat, u, y + 4.3, 0, true);
        add(L, new THREE.BoxGeometry(11, 0.1, 4.8), glow, u, y + 4.1, 0);
        [-5, 5].forEach((px2) => [-2.4, 2.4].forEach((pz2) => add(L, new THREE.BoxGeometry(0.2, 3.8, 0.2), deckMat, u + px2, y + 2.4, pz2)));
      });
      const g = new THREE.Group();
      for (let c = 0; c < 5; c++) {
        const car = new THREE.Group();
        add(car, new THREE.BoxGeometry(4.6, 1.6, 2.2), trainMat, 0, 0, 0, true);
        add(car, new THREE.BoxGeometry(4.2, 0.5, 2.25), winMat, 0, 0.25, 0);
        car.position.x = -dir * c * 5.2;
        g.add(car);
      }
      g.position.y = y + 1.15;
      L.add(g);
      gMetro.add(L);
      trains.push({ g, u: -60 + rand() * 120, dir, stations });
    };
    buildLine(0, 0, (2 - N / 2) * P, 9, [-38, 38], 1, () => false);
    buildLine(-Math.PI / 2, (5 - N / 2) * P, 0, 13, [-38, 38], -1, (u) => Math.abs(u) < RV + 1);

    /* Traffic: Cars scaled to city traffic percentage */
    const carCount = Math.floor(100 + (trafficPct / 100) * 120);
    const carMat = T(lam({}), 0xdbeafe, 0x93c5fd);
    const carMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 1.1, 1.3), carMat, carCount);
    carMesh.castShadow = true;
    gTraffic.add(carMesh);

    const cars = Array.from({ length: carCount }, () => ({
      road: (rand() * (N + 1)) | 0,
      v: rand() < 0.5,
      t: (rand() - 0.5) * HALF * 2,
      dir: rand() < 0.5 ? 1 : -1,
      sp: 14 + rand() * 12
    }));

    /* Smart City Layer: IoT Beacons & 5G Hub */
    const beaconColor = aqiVal > 200 ? 0xf43f5e : aqiVal > 100 ? 0xfbbf24 : 0x34d399;
    const beaconPos = [];
    buildings.forEach((b, i) => {
      if (i % 3 === 0) {
        beaconPos.push([b.x + b.w * 0.2, 0.3 + b.h + 0.8, b.z + b.d * 0.2]);
      }
    });

    const beacons = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: beaconColor }),
      beaconPos.length
    );
    beaconPos.forEach(([x, y, z], n) => {
      dm.position.set(x, y, z);
      dm.scale.setScalar(1);
      dm.updateMatrix();
      beacons.setMatrixAt(n, dm.matrix);
    });
    gSmart.add(beacons);

    // 5G Pulse rings on the river central hub
    const pulseRings = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(0.9, 1.2, 48).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
      );
      m.position.set(0, 0.3, 0);
      gSmart.add(m);
      return m;
    });

    /* Theme & Heatmap Color Application */
    const recolor = () => {
      buildings.forEach((b) => {
        const c = heatColor(st.heat, b, st.night, trafficPct, energyPct);
        b.mat.color.copy(c);
        b.mat.emissive.copy(st.night ? c : new THREE.Color(0x000000));
        b.mat.emissiveIntensity = st.night ? 0.35 : 0;
      });
    };

    const applyTheme = () => {
      const n = st.night;
      scene.background.set(n ? 0x050811 : 0xd6e6f5);
      scene.fog.color.set(n ? 0x050811 : 0xd6e6f5);
      hemi.color.set(n ? 0x223355 : 0xffffff);
      hemi.groundColor.set(n ? 0x050811 : 0x8899aa);
      hemi.intensity = n ? 0.6 : 1.2;
      sun.color.set(n ? 0x6688cc : 0xfffaed);
      sun.intensity = n ? 0.4 : 1.8;
      orb.material.color.set(n ? 0xf0f4ff : 0xffea88);
      stars.visible = n;
      themed.forEach(([m, d, ni]) => m.color.set(n ? ni : d));
      recolor();
    };

    /* Orbit Camera Controls */
    const cam = { th: 0.85, ph: 0.72, r: 132 };
    const home = { ...cam };
    const placeCam = () => {
      camera.position.set(
        cam.r * Math.sin(cam.th) * Math.cos(cam.ph),
        cam.r * Math.sin(cam.ph),
        cam.r * Math.cos(cam.th) * Math.cos(cam.ph)
      );
      camera.lookAt(0, 4, 0);
    };

    let dragging = false, downX = 0, downY = 0, moved = false;
    const el = mount;
    const onDown = (e) => { dragging = true; downX = e.clientX; downY = e.clientY; moved = false; };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - downX, dy = e.clientY - downY;
      if (Math.hypot(dx, dy) > 4) moved = true;
      cam.th -= dx * 0.006;
      cam.ph = THREE.MathUtils.clamp(cam.ph + dy * 0.005, 0.1, 1.4);
      downX = e.clientX; downY = e.clientY;
    };
    const onUp = (e) => {
      if (!dragging) return;
      dragging = false;
      if (moved) return;
      // Raycast building selection
      const rect = el.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const rc = new THREE.Raycaster();
      rc.setFromCamera(mouse, camera);
      const hits = rc.intersectObjects(pickables, false);
      if (hits.length) {
        setSelectedBuilding(hits[0].object.userData.b.info);
      } else {
        setSelectedBuilding(null);
      }
    };
    const onWheel = (e) => {
      e.preventDefault();
      cam.r = THREE.MathUtils.clamp(cam.r + e.deltaY * 0.12, 40, 320);
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });

    const ro = new ResizeObserver(() => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    });
    ro.observe(mount);

    /* Animation loop */
    let raf, prev = performance.now();
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;

      if (ui.current.autoRotate && !dragging) cam.th += dt * 0.06;
      placeCam();
      ripple.offset.x += dt * 0.02;

      // Pulse rings animation
      pulseRings.forEach((r, idx) => {
        const s = ((now * 0.0006 + idx / 3) % 1);
        r.scale.setScalar(1 + s * 30);
        r.material.opacity = 0.5 * (1 - s);
      });

      // Trains animation
      trains.forEach((tr) => {
        const d = Math.min(...tr.stations.map((s) => Math.abs(tr.u - s)));
        tr.u += tr.dir * 20 * (0.2 + 0.8 * THREE.MathUtils.clamp((d - 1) / 12, 0, 1)) * dt;
        if (tr.u > 80) tr.u = -80;
        if (tr.u < -80) tr.u = 80;
        tr.g.position.x = tr.u;
      });

      // Traffic cars animation
      if (gTraffic.visible) {
        cars.forEach((c, n) => {
          c.t += c.dir * c.sp * dt;
          if (c.t > HALF) c.t = -HALF;
          if (c.t < -HALF) c.t = HALF;
          const p = (c.road - N / 2) * P, lane = c.dir * 1.1;
          if (c.v) {
            dm.position.set(p - lane, (Math.abs(c.t) < RV ? bridgeY(c.t) + 0.3 : 0.15) + 0.35, c.t);
            dm.rotation.set(0, Math.PI / 2, 0);
          } else {
            dm.position.set(c.t, 0.5, p + lane);
            dm.rotation.set(0, 0, 0);
          }
          dm.scale.setScalar(1);
          dm.updateMatrix();
          carMesh.setMatrixAt(n, dm.matrix);
        });
        carMesh.instanceMatrix.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    api.current = {
      setNight: (v) => { st.night = v; applyTheme(); },
      setHeat: (v) => { st.heat = v; recolor(); },
      setLayer: (k, v) => {
        const target = { green: gGreen, metro: gMetro, traffic: gTraffic, sensors: gSmart }[k];
        if (target) target.visible = v;
      },
      zoom: (f) => { cam.r = THREE.MathUtils.clamp(cam.r * f, 40, 320); },
      reset: () => Object.assign(cam, home),
    };

    applyTheme();
    Object.entries(ui.current.layers).forEach(([k, v]) => api.current.setLayer(k, v));
    setStats({
      buildings: buildings.length,
      trees: treePts.length,
      vehicles: cars.length + trains.length * 5,
      bridges: N + 1,
      sensors: beaconPos.length
    });

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("wheel", onWheel);
      scene.traverse((o) => { o.geometry?.dispose?.(); });
      renderer.dispose();
      if (el.parentNode === mount) mount.removeChild(el);
      api.current = null;
    };
  }, [city, trafficPct, energyPct, aqiVal, greenPct]);

  // Sync state controls to Three.js api
  useEffect(() => { api.current?.setNight(isNight); }, [isNight]);
  useEffect(() => { api.current?.setHeat(heatmapMode); }, [heatmapMode]);
  useEffect(() => { Object.entries(layers).forEach(([k, v]) => api.current?.setLayer(k, v)); }, [layers]);

  const toggleLayer = (k) => setLayers((l) => ({ ...l, [k]: !l[k] }));

  const generateSceneReport = async () => {
    setReportBusy(true);
    setReportNotice("");

    try {
      const { jsPDF } = await import("jspdf");
      const report = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = report.internal.pageSize.getWidth();
      const pageHeight = report.internal.pageSize.getHeight();
      const margin = 18;
      const contentWidth = pageWidth - margin * 2;
      let cursorY = 22;

      let logoImage = null;
      try {
        const response = await fetch(YugNirmanMark);
        if (response.ok) {
          const logoBlob = new Blob([await response.text()], { type: "image/svg+xml" });
          const logoUrl = URL.createObjectURL(logoBlob);
          try {
            const image = new Image();
            image.src = logoUrl;
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = 128;
            canvas.height = 128;
            const context = canvas.getContext("2d");
            if (context) {
              context.drawImage(image, 0, 0, 128, 128);
              logoImage = canvas.toDataURL("image/png");
            }
          } finally {
            URL.revokeObjectURL(logoUrl);
          }
        }
      } catch {
        logoImage = null;
      }

      const ensureSpace = (height) => {
        if (cursorY + height <= pageHeight - 18) return;
        report.addPage();
        cursorY = 20;
      };
      const addText = (value, { size = 10, color = [52, 65, 75], bold = false, indent = 0, gap = 2 } = {}) => {
        report.setFont("helvetica", bold ? "bold" : "normal");
        report.setFontSize(size);
        report.setTextColor(...color);
        const lines = report.splitTextToSize(String(value ?? ""), contentWidth - indent);
        const lineHeight = size * 0.48;
        lines.forEach((line) => {
          ensureSpace(lineHeight);
          report.text(line, margin + indent, cursorY);
          cursorY += lineHeight;
        });
        cursorY += gap;
      };
      const addSection = (title) => {
        ensureSpace(12);
        cursorY += 3;
        report.setDrawColor(45, 174, 157);
        report.setLineWidth(0.6);
        report.line(margin, cursorY, pageWidth - margin, cursorY);
        cursorY += 7;
        addText(title, { size: 13, color: [16, 48, 39], bold: true, gap: 3 });
      };

      if (logoImage) {
        report.setFillColor(112, 226, 208);
        report.roundedRect(margin, cursorY - 5, 18, 18, 2, 2, "F");
        report.addImage(logoImage, "PNG", margin + 1, cursorY - 4, 16, 16);
      }
      report.setFont("helvetica", "bold");
      report.setFontSize(15);
      report.setTextColor(16, 32, 27);
      report.text("YUG NIRMAN", margin + (logoImage ? 23 : 0), cursorY + 2);
      report.setFont("helvetica", "normal");
      report.setFontSize(8);
      report.setTextColor(76, 95, 86);
      report.text("AI FUTURE CITY SIMULATOR · 3D CITY REPORT", margin + (logoImage ? 23 : 0), cursorY + 8);
      cursorY += 22;

      addText(`${cityName} 3D City Report`, { size: 19, color: [16, 32, 27], bold: true, gap: 2 });
      addText(`Generated ${new Date().toLocaleString()} · ${isNight ? "Night simulation" : "Daylight view"} · ${heatmapMode === "default" ? "Default display" : `${heatmapMode} heatmap`}`, { size: 9, color: [84, 101, 109] });
      addText(city?.tagline || "City digital twin visualization", { size: 10, color: [45, 112, 96] });

      addSection("Illustrative city profile");
      [
        `Population: ${city?.metrics?.population?.display || "N/A"}`,
        `Traffic index: ${trafficPct}%`,
        `Energy load: ${energyPct}%`,
        `Air quality index: ${aqiVal} AQI`,
        `Green cover: ${greenPct}%`,
      ].forEach((line) => addText(line, { size: 10, gap: 1.5 }));

      addSection("Generated 3D scene");
      [
        `Buildings: ${stats.buildings}`,
        `Trees: ${stats.trees}`,
        `Vehicles and trains: ${stats.vehicles}`,
        `Bridges: ${stats.bridges}`,
        `Sensor markers: ${stats.sensors}`,
        `Visible layers: ${Object.entries(layers).filter(([, enabled]) => enabled).map(([name]) => name).join(", ") || "None"}`,
      ].forEach((line) => addText(line, { size: 10, gap: 1.5 }));

      if (selectedBuilding) {
        addSection("Selected generated building");
        addText(`${selectedBuilding.name} · ${selectedBuilding.district}`, { size: 10, bold: true });
        addText(`Height ${selectedBuilding.height} · ${selectedBuilding.floors} floors · Sample power ${selectedBuilding.power} · Sample occupancy ${selectedBuilding.occupancy}`, { size: 9 });
      }

      addSection("Data note");
      addText("This 3D city is procedurally generated from illustrative city-profile metrics. It is not connected to real building footprints, traffic sensors, utility grids, or IoT beacons. Counts describe generated scene objects, not verified city infrastructure.", { size: 8, color: [84, 101, 109] });

      for (let page = 1; page <= report.getNumberOfPages(); page += 1) {
        report.setPage(page);
        report.setFont("helvetica", "normal");
        report.setFontSize(8);
        report.setTextColor(100, 116, 110);
        report.text("YUG NIRMAN · Illustrative digital twin", margin, pageHeight - 8);
        report.text(`${page} / ${report.getNumberOfPages()}`, pageWidth - margin, pageHeight - 8, { align: "right" });
      }

      report.save(`${cityName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-3d-city-report.pdf`);
      setReportNotice("Your branded 3D city report has been downloaded.");
    } catch (error) {
      setReportNotice(error instanceof Error ? `Report export failed: ${error.message}` : "Report export failed. Please try again.");
    } finally {
      setReportBusy(false);
    }
  };

  const Chip = ({ on, onClick, icon: Icon, label }) => (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${
        on
          ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-200 shadow-cyan-500/10 backdrop-blur-md"
          : "bg-slate-900/90 border-slate-700/60 text-slate-400 backdrop-blur-md"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );

  const iconBtn = "p-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-cyan-300 hover:text-white hover:border-cyan-400/60 transition-all shadow-lg backdrop-blur-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400";

  const legend = {
    traffic: ["bg-gradient-to-r from-cyan-400 to-rose-500", "Light Flow", "Congested Grid"],
    energy: ["bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500", "Low Load", "Peak Draw"],
  }[heatmapMode];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${cityName.toUpperCase()} DIGITAL TWIN`}
        subtitle="Procedurally generated WebGL city visualization using sample profile metrics"
        icon={Boxes}
        badge="3D demo"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNight(!isNight)}
              className={iconBtn}
              title={isNight ? "Switch to Daylight View" : "Switch to Night Simulation"}
            >
              {isNight ? <Moon className="w-4 h-4 text-cyan-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            <div className="bg-slate-900/90 p-1 rounded-xl border border-cyan-500/30 flex items-center gap-1 backdrop-blur-md">
              {[
                ["traffic", "Traffic Heat", "bg-rose-500 text-white"],
                ["energy", "Grid Load", "bg-purple-500 text-white"],
                ["default", "Default", "bg-cyan-500 text-slate-950 font-bold"]
              ].map(([k, label, onClass]) => (
                <button
                  key={k}
                  onClick={() => setHeatmapMode(k)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    heatmapMode === k ? onClass : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-100">
        This scene uses procedurally generated buildings and sample city-profile values. It is not connected to real building footprints, traffic sensors, utility grids, or IoT beacons.
      </div>

      {/* Main 3D Simulator Viewport */}
      <div className="relative h-[640px] w-full rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.15)] bg-[#070a13]">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Layer Toggles Floating Island */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          <Chip on={layers.traffic} onClick={() => toggleLayer("traffic")} icon={Car} label="Demo Traffic Heat" />
          <Chip on={layers.metro} onClick={() => toggleLayer("metro")} icon={TrainFront} label="Demo Transit" />
          <Chip on={layers.green} onClick={() => toggleLayer("green")} icon={TreePine} label="Demo Greenery" />
          <Chip on={layers.sensors} onClick={() => toggleLayer("sensors")} icon={Radio} label="Demo Beacons" />
        </div>

        {/* Viewport Control Buttons */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button className={iconBtn} onClick={() => api.current?.zoom(0.8)} title="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button className={iconBtn} onClick={() => api.current?.zoom(1.25)} title="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            className={`${iconBtn} ${autoRotate ? "!border-emerald-400/60 !text-emerald-300" : ""}`}
            onClick={() => setAutoRotate(!autoRotate)}
            title="Toggle Continuous Orbit"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button className={iconBtn} onClick={() => api.current?.reset()} title="Reset Camera View">
            <Sparkles className="w-4 h-4" />
          </button>
        </div>

        {/* Generated model element inspector */}
        {selectedBuilding && (
          <div className="absolute top-16 right-4 w-64 p-4 rounded-2xl bg-slate-900/95 border border-cyan-400/40 backdrop-blur-xl text-xs text-slate-300 space-y-2.5 shadow-2xl z-20 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
              <div>
                <div className="text-cyan-300 font-bold text-sm tracking-wide">{selectedBuilding.name}</div>
                <div className="text-[10px] text-slate-400 font-medium">{selectedBuilding.district}</div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            </div>

            <div className="space-y-1.5 pt-1">
              {[
                ["Generated height", selectedBuilding.height],
                ["Generated floors", `${selectedBuilding.floors} floors`],
                ["Sample grid value", selectedBuilding.power],
                ["Sample occupancy", selectedBuilding.occupancy],
                ["Sample AQI profile", selectedBuilding.aqiStatus],
                ["Demo beacon marker", selectedBuilding.iotBeacon]
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">{k}</span>
                  <span className="font-semibold text-slate-200 font-mono">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sample profile overlay */}
        <div className="absolute bottom-4 left-4 p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-md text-xs text-slate-300 space-y-2 pointer-events-none max-w-sm z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold text-cyan-300 tracking-wide text-xs">
              {cityName.toUpperCase()} • ILLUSTRATIVE PROFILE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Sample traffic:</span>
              <span className="text-rose-400 font-bold">{trafficPct}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sample grid:</span>
              <span className="text-amber-400 font-bold">{energyPct}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sample AQI:</span>
              <span className="text-cyan-300 font-bold">{aqiVal} AQI</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sample green cover:</span>
              <span className="text-emerald-400 font-bold">{greenPct}%</span>
            </div>
          </div>

          {legend && (
            <div className="pt-1.5 border-t border-slate-800">
              <div className={`h-1.5 w-full rounded-full ${legend[0]}`} />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span>{legend[1]}</span>
                <span>{legend[2]}</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Right generated geometry counts */}
        <div className="absolute bottom-4 right-4 p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-md text-xs text-slate-300 pointer-events-none z-10 text-right">
          <div className="text-cyan-300 font-mono font-bold">Generated {cityName} scene</div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            {stats.buildings} demo buildings · {stats.trees} demo trees · {stats.vehicles} demo vehicles · {stats.bridges} demo bridges · {stats.sensors} demo markers
          </div>
        </div>
      </div>

      <section className="flex flex-col gap-4 rounded-xl border border-cyan-500/20 bg-slate-950/65 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5" aria-labelledby="city3d-report-title">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-cyan-400/25 bg-cyan-400/10 text-cyan-200">
            <FileText className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 id="city3d-report-title" className="text-sm font-bold text-white">3D city report</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
              Download a branded snapshot of {cityName}'s generated scene, profile indicators, and active layers.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={generateSceneReport}
          disabled={reportBusy || stats.buildings === 0}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-cyan-400/35 bg-cyan-400/10 px-4 text-xs font-bold text-cyan-100 transition-colors hover:border-cyan-300/60 hover:bg-cyan-400/20 disabled:cursor-wait disabled:opacity-50"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {reportBusy ? "Preparing report…" : "Generate PDF report"}
        </button>
        {reportNotice && <p className="basis-full text-xs text-emerald-200 sm:text-right" role="status">{reportNotice}</p>}
      </section>
    </div>
  );
};

export default City3D;
