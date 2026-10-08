import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  Boxes,
  Maximize2,
  Sun,
  Moon,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  TreePine,
  TrainFront,
  Car,
  Radio,
  X,
  Activity,
  Droplet,
  AlertTriangle
} from "lucide-react";
import { useCity } from "../context/CityContext";
import PageHeader from "../components/common/PageHeader";

/* ---------- layout constants ---------- */
const N = 9;          // blocks per side
const P = 20;         // block pitch
const BW = 14;        // block width
const RW = 5;         // road width
const RV = 7;         // river half-width
const HALF = 96;      // half city extent
const PROBLEM_TYPES = [
  ["traffic", "Traffic"],
  ["pollution", "Air pollution"],
  ["flood", "Flooding"],
  ["heat", "Heat"],
  ["waste", "Waste"],
  ["energy", "Energy"],
  ["accident", "Accident"],
];
const SCENARIO_PRESETS = {
  "Monsoon Evening Rush": { traffic: 0.94, pollution: 0.68, flood: 0.92, heat: 0.12, waste: 0.58, energy: 0.73, accident: 0.64 },
  "Summer Heatwave": { traffic: 0.55, pollution: 0.72, flood: 0.08, heat: 0.98, waste: 0.46, energy: 0.94, accident: 0.2 },
  "Festival Crowd": { traffic: 0.88, pollution: 0.44, flood: 0.12, heat: 0.4, waste: 0.96, energy: 0.86, accident: 0.38 },
};
const PROBLEM_GUIDANCE = {
  traffic: ["Signal or lane bottleneck", "Back-of-queue growth", "Retune signal timing and clear blocked lanes"],
  pollution: ["Road or industrial emissions", "Wind-drifted particulate haze", "Inspect source and reduce emissions"],
  flood: ["Blocked drain or intense rainfall", "Water accumulating across the low point", "Clear drainage and dispatch pumping crews"],
  heat: ["Dense, sun-exposed surfaces", "Heat shimmer and expanding hot zone", "Add shade, trees, and cool surfaces"],
  waste: ["Collection point near capacity", "Overflow and litter around the bin", "Dispatch collection and increase pickup frequency"],
  energy: ["High-load grid connection", "Transformer stress and building glow", "Balance load and inspect the substation"],
  accident: ["Crash blocking a travel lane", "Emergency response and growing queue", "Dispatch responders and secure the scene"],
};
const Chip = ({ on, onClick, icon: Icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={`flex min-h-9 items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-bold tracking-wide transition-all shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 ${
      on
        ? "border-cyan-300/70 bg-[#062536]/95 text-white shadow-cyan-500/20 backdrop-blur-xl"
        : "border-slate-500/70 bg-[#0a1422]/95 text-slate-200 hover:border-cyan-300/70 hover:text-white backdrop-blur-xl"
    }`}
  >
    <Icon className="h-4 w-4 shrink-0 text-cyan-200" />
    {label}
  </button>
);
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

// Heatmap colors illustrate bundled demo-profile metrics, not observed city layers.
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
  if (night) return new THREE.Color(0x7a869e);
  const facadeVariation = (Math.sin(b.x * 0.37 + b.z * 0.23) + 1) / 2;
  return new THREE.Color(0x263b52).lerp(new THREE.Color(0x42627c), facadeVariation * 0.62);
};

export const City3D = ({ embedded = false }) => {
  const {
    city,
    liveAirQuality,
    liveWeather,
    liveSensorStations,
    liveSensorsAvailable,
    liveTrafficFlow,
  } = useCity();
  const mountRef = useRef(null);
  const viewportRef = useRef(null);
  const api = useRef(null);
  const [isNight, setIsNight] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState("default"); // "traffic" | "energy" | "default"
  const [layers, setLayers] = useState({ buildings: true, roads: true, green: true, metro: true, traffic: true, water: true, sensors: true, issues: true });
  const [autoRotate, setAutoRotate] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [scenario, setScenario] = useState("Live profile");
  const [scenarioTrend, setScenarioTrend] = useState("stable");
  const [simulationUpdatedAt, setSimulationUpdatedAt] = useState(() => new Date());
  const [showSceneUi, setShowSceneUi] = useState(true);
  const [autoTour, setAutoTour] = useState(false);
  const [scenarioProgress, setScenarioProgress] = useState(100);
  const [showSources, setShowSources] = useState(true);
  const [problemLayers, setProblemLayers] = useState({
    traffic: true,
    pollution: true,
    flood: true,
    heat: true,
    waste: true,
    energy: true,
    accident: true,
  });
  const [simulation, setSimulation] = useState({
    traffic: 0.72,
    pollution: 0.55,
    flood: 0.65,
    heat: 0.42,
    waste: 0.38,
    energy: 0.82,
    accident: 0.24,
  });
  const [stats, setStats] = useState({ buildings: 0, trees: 0, vehicles: 0, bridges: 0, sensors: 0 });
  const [sceneActionError, setSceneActionError] = useState("");
  const [webglError, setWebglError] = useState("");

  const ui = useRef({
    isNight: false,
    heatmapMode: "default",
    layers,
    autoRotate: true,
    autoTour: false,
    simulation,
    scenario: "Live profile",
    scenarioProgress: 100,
    showSceneUi: true,
    showSources: true,
    problemLayers,
    trafficVisualPct: 0,
    aqiVal: 156,
    energyPct: 82,
    greenPct: 24,
    liveSensorStations: [],
    windDirection: 270,
    rainfall: 0,
  });
  const activeIssue = selectedIssue || (Array.isArray(city?.zones) ? city.zones.find((zone) => zone?.risk && zone.risk !== "LOW") : null);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === viewportRef.current);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // City telemetry derived from dataset
  const trafficPct = city?.metrics?.traffic?.value ?? 72;
  const energyPct = city?.metrics?.energyUsage?.value ?? 82;
  const aqiVal = liveAirQuality?.us_aqi
    ?? liveAirQuality?.european_aqi
    ?? city?.metrics?.aqi?.value
    ?? 156;
  const liveCurrentSpeed = Number(liveTrafficFlow?.currentSpeed);
  const liveFreeFlowSpeed = Number(liveTrafficFlow?.freeFlowSpeed);
  const trafficVisualPct = Number.isFinite(liveCurrentSpeed)
    && Number.isFinite(liveFreeFlowSpeed)
    && liveFreeFlowSpeed > 0
    ? THREE.MathUtils.clamp((1 - liveCurrentSpeed / liveFreeFlowSpeed) * 100, 0, 100)
    : trafficPct;
  const greenPct = city?.metrics?.greenCover?.value ?? 24;
  const windDirection = liveWeather?.wind_direction_10m ?? 270;
  const rainfall = liveWeather?.precipitation ?? 0;
  const cityName = city?.name ?? "Mumbai";
  const activeIssueCategory = activeIssue?.category === "industrial" ? "pollution" : activeIssue?.category;
  const activeIssueSeverity = PROBLEM_TYPES.some(([key]) => key === activeIssueCategory)
    ? Math.round(
      (scenario === "Live profile"
        ? activeIssueCategory === "traffic"
          ? trafficVisualPct
          : activeIssueCategory === "pollution"
            ? Math.min(100, (aqiVal / 300) * 100)
            : activeIssueCategory === "energy"
              ? energyPct
              : activeIssue?.risk === "HIGH" ? 82 : activeIssue?.risk === "MEDIUM" ? 55 : 20
        : simulation[activeIssueCategory] * scenarioProgress) || 0
    )
    : 0;

  useEffect(() => {
    ui.current = {
      isNight,
      heatmapMode,
      layers,
      autoRotate,
      autoTour,
      simulation,
      scenario,
      scenarioProgress,
      showSceneUi,
      showSources,
      problemLayers,
      trafficVisualPct,
      aqiVal,
      energyPct,
      greenPct,
      liveSensorStations,
      windDirection,
      rainfall,
    };
  }, [
    isNight,
    heatmapMode,
    layers,
    autoRotate,
    autoTour,
    simulation,
    scenario,
    scenarioProgress,
    showSceneUi,
    showSources,
    problemLayers,
    trafficVisualPct,
    aqiVal,
    energyPct,
    greenPct,
    liveSensorStations,
    windDirection,
    rainfall,
  ]);

  /* ---------- Build the 3D digital twin ---------- */
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    setWebglError("");
    const sceneCityName = city?.name ?? "Mumbai";

    // Seeded randomness unique to the current city
    const rand = seeded(2024 + (city?.name?.length || 7) * 31);
    const st = { night: ui.current.isNight, heat: ui.current.heatmapMode };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color();
    scene.fog = new THREE.Fog(0x000000, 240, 700);

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 1, 1500);
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch (error) {
      setWebglError(error instanceof Error
        ? `The 3D scene could not start: ${error.message}`
        : "The 3D scene could not start because WebGL is unavailable.");
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    /* Lights, Sun, Moon & Stars */
    const hemi = new THREE.HemisphereLight(0xa8c4e0, 0x18251f, 1.2);
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

    const rainPositions = new Float32Array(600 * 3);
    for (let i = 0; i < rainPositions.length; i += 3) {
      rainPositions[i] = (rand() - 0.5) * 190;
      rainPositions[i + 1] = rand() * 85 + 8;
      rainPositions[i + 2] = (rand() - 0.5) * 190;
    }
    const rainGeometry = new THREE.BufferGeometry();
    rainGeometry.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
    const rainMaterial = new THREE.PointsMaterial({ color: 0xbbe8ff, size: 0.22, transparent: true, opacity: 0, depthWrite: false });
    const rain = new THREE.Points(rainGeometry, rainMaterial);
    rain.visible = false;
    scene.add(rain);

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
    const gWater = group();
    const gIssues = group();

    /* Ground & Surrounding Hills */
    const ground = add(scene, new THREE.PlaneGeometry(1100, 1100).rotateX(-Math.PI / 2), T(lam({}), 0x263c35, 0x0c1a15), 0, -0.05, 0);
    ground.receiveShadow = true;

    const hillMat = T(lam({ flatShading: true }), 0x263c35, 0x0d1d1c);
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

    const water = T(lam({ map: ripple, transparent: true, opacity: 0.92 }), 0x347da8, 0x14507f);
    add(gWater, new THREE.PlaneGeometry(1100, RV * 2).rotateX(-Math.PI / 2), water, 0, 0.06, 0);

    const walk = T(lam({}), 0x596778, 0x1b2436);
    const grass = T(lam({}), 0x426c4a, 0x12372a);
    [-1, 1].forEach((s) => add(gRoad, new THREE.BoxGeometry(HALF * 2, 0.35, 0.5), walk, 0, 0.17, s * (RV + 0.1)));

    /* Roads */
    const roadTex = canvasTex(128, 32, (g, w, h) => {
      g.fillStyle = "#202936"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#a9a16c"; g.fillRect(8, 14, 56, 3);
      g.fillStyle = "#48586b"; g.fillRect(0, 0, w, 2); g.fillRect(0, h - 2, w, 2);
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

    const plazaMat = T(lam({ color: 0xe2e8f0, emissive: 0x000000 }), 0x66788c, 0x8ca9bf);
    const cityPlaza = add(gBuild, new THREE.CylinderGeometry(24, 28, 2.2, 32), plazaMat, 0, 0.8, 0, true);
    cityPlaza.receiveShadow = true;
    add(gBuild, new THREE.CylinderGeometry(9, 9, 1.4, 24), T(lam({ color: 0x93c5fd, emissive: 0x3b82f6, emissiveIntensity: 0.2 }), 0x8fd3ff, 0x1d4ed8), 0, 1.5, 0, true);
    add(gBuild, new THREE.TorusGeometry(8, 0.7, 12, 30), T(lam({ color: 0xe2e8f0 }), 0xf6f8fb, 0x6ea1d3), 0, 2.2, 0, true);

    const lampMat = T(lam({ color: 0xf9fafb, emissive: 0xfbbf24, emissiveIntensity: 0.26 }), 0xf3f4f6, 0xe0a93d);
    const streetlights = [];
    for (let i = -3; i <= 3; i++) {
      const x = i * 18;
      if (Math.abs(x) < 2) continue;
      const post = add(gRoad, new THREE.CylinderGeometry(0.3, 0.38, 10, 10), lampMat, x, 5, 0, true);
      const head = add(gRoad, new THREE.SphereGeometry(0.8, 12, 12), T(lam({ color: 0xfff3b0, emissive: 0xfbbf24, emissiveIntensity: 0.58 }), 0xfff6c7, 0xfaaf3d), x, 9.8, 0, true);
      streetlights.push([post, head]);
    }

    /* Architectural Facades */
    const facades = [0, 1, 2].map(() => ({
      map: canvasTex(128, 256, (g, w, h) => {
        g.fillStyle = "#40566d"; g.fillRect(0, 0, w, h); g.fillStyle = "#73c6dc";
        for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) g.fillRect(c * 32 + 6, r * 32 + 9, 20, 15);
      }),
      lit: canvasTex(128, 256, (g, w, h) => {
        g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff";
        for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) if (rand() < 0.42) g.fillRect(c * 32 + 6, r * 32 + 9, 20, 15);
      }),
    }));

    const edgeMat = T(new THREE.LineBasicMaterial({ transparent: true, opacity: 0.58 }), 0x475569, 0x22d3ee);
    const buildings = [], pickables = [], treePts = [];
    const pondGeo = new THREE.CircleGeometry(3.2, 28).rotateX(-Math.PI / 2);

    // City zones distribution based on dataset
    const zoneNames = [
      `${sceneCityName} Financial District`,
      `${sceneCityName} Waterfront Marina`,
      `${sceneCityName} Tech Corridor`,
      `${sceneCityName} Metro Core`,
      `${sceneCityName} Green Habitat Zone`,
      `${sceneCityName} Heritage Quarter`
    ];

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (j === Math.floor(N / 2)) continue; // river row
        const cx = (i + 0.5 - N / 2) * P, cz = (j + 0.5 - N / 2) * P;
        // Park frequency scaled by greenCover metric
        const park = rand() < Math.max(0.15, ui.current.greenPct / 80);
        add(gBuild, new THREE.BoxGeometry(BW + 0.6, 0.3, BW + 0.6), park ? grass : walk, cx, 0.15, cz).receiveShadow = true;

        if (park) {
          add(gBuild, pondGeo, water, cx, 0.32, cz);
          const treeCount = Math.floor(20 + (ui.current.greenPct / 100) * 20);
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
          const heightMultiplier = 1 + (ui.current.energyPct / 100) * 0.35;
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
              power: `${Math.round(total * (40 + ui.current.energyPct * 0.4))} kW`,
              occupancy: `${Math.round(total * 30 + (city?.metrics?.population?.value ? 120 : 50))} residents`,
              aqiStatus: ui.current.aqiVal > 200 ? "Severe Risk" : ui.current.aqiVal > 100 ? "Moderate" : "Good",
              iotBeacon: rand() < 0.6 ? "Active Mesh Node" : "Passive Substation"
            }
          };
          meshes.forEach((mm) => { mm.userData.b = b; pickables.push(mm); });
          buildings.push(b);
        }
      }
    }

    // Outer forest ring
    const forestDensity = Math.floor(180 + (ui.current.greenPct / 100) * 160);
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
      if (i === Math.floor(N / 2) || i === Math.floor(N / 2) + 1) {
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
      add(L, new THREE.BoxGeometry(HALF * 2, 0.7, 3.2), deckMat, 0, y, 0, true);
      [-1, 1].forEach((s) => add(L, new THREE.BoxGeometry(HALF * 2, 0.15, 0.15), glow, 0, y + 0.45, s * 1.55));
      for (let u = -HALF + 5; u <= HALF - 5; u += P) if (!skip(u)) add(L, new THREE.BoxGeometry(0.9, y - 0.4, 0.9), deckMat, u, (y - 0.4) / 2, 0, true);
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
      trains.push({ g, u: -HALF * 0.7 + rand() * HALF * 1.4, dir, stations });
    };
    buildLine(0, 0, (Math.floor(N * 0.3) + 0.5 - N / 2) * P, 9, [-50, 50], 1, () => false);
    buildLine(-Math.PI / 2, (Math.ceil(N * 0.7) + 0.5 - N / 2) * P, 0, 13, [-50, 50], -1, (u) => Math.abs(u) < RV + 1);

    /* Traffic: Cars scaled to city traffic percentage */
    const carCount = Math.floor(100 + (ui.current.trafficVisualPct / 100) * 120);
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
    const beaconColor = ui.current.aqiVal > 200 ? 0xf43f5e : ui.current.aqiVal > 100 ? 0xfbbf24 : 0x34d399;
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

    const liveSensorEffects = [];
    const updateLiveSensorEffects = (stations) => {
      liveSensorEffects.forEach(({ marker, halo, haze }) => {
        [marker, halo, haze].forEach((object) => {
          object.traverse((child) => {
            child.geometry?.dispose();
            const objectMaterials = Array.isArray(child.material) ? child.material : [child.material];
            objectMaterials.filter(Boolean).forEach((material) => material.dispose());
          });
        });
      });
      liveSensorEffects.length = 0;
      gSmart.children.filter((child) => child.userData.liveSensorEffect).forEach((child) => gSmart.remove(child));
      if (!Array.isArray(stations)) return;
      const [cityLat, cityLon] = city.coordinates || [0, 0];
      stations.forEach((station) => {
        const [stationLat, stationLon] = station.coordinates || [cityLat, cityLon];
        const x = THREE.MathUtils.clamp((stationLon - cityLon) * 13000 * Math.max(Math.cos((cityLat * Math.PI) / 180), 0.2), -90, 90);
        const z = THREE.MathUtils.clamp((cityLat - stationLat) * 15000, -90, 90);
        const pm25 = station.measurements?.find((measurement) => measurement.parameter === "PM2.5")?.value;
        const severity = Number.isFinite(pm25) ? THREE.MathUtils.clamp(pm25 / 75, 0.15, 1) : 0.15;
        const color = severity > 0.65 ? 0xf97316 : severity > 0.35 ? 0xfbbf24 : 0x38bdf8;
        const marker = new THREE.Mesh(
          new THREE.SphereGeometry(0.9, 12, 12),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
        );
        marker.position.set(x, 2, z);
        const radius = 2.5 + severity * 2.5;
        const halo = new THREE.Mesh(
          new THREE.TorusGeometry(radius, 0.12, 8, 32),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 })
        );
        halo.position.set(x, 0.45, z);
        halo.rotation.x = Math.PI / 2;
        const haze = new THREE.Group();
        for (let i = 0; i < 4; i += 1) {
          const puff = new THREE.Mesh(
            new THREE.SphereGeometry(1.2 + severity, 10, 10),
            new THREE.MeshBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.07 + severity * 0.08 })
          );
          puff.position.set((i - 1.5) * 1.1, 1.8 + i * 0.35, (i % 2 ? 0.8 : -0.8));
          haze.add(puff);
        }
        haze.position.set(x, 0, z);
        [marker, halo, haze].forEach((object) => { object.userData.liveSensorEffect = true; });
        gSmart.add(marker, halo, haze);
        liveSensorEffects.push({ marker, halo, haze, severity });
      });
    };
    updateLiveSensorEffects(ui.current.liveSensorStations);

    const zoneCategory = (category) => category === "industrial" ? "pollution" : category;
    const allCityZones = Array.isArray(city?.zones) ? city.zones : [];
    const activeRiskZones = PROBLEM_TYPES.map(([category], index) => {
      const matchingZones = allCityZones
        .filter((zone) => zone?.category && zoneCategory(zone.category.toLowerCase()) === category)
        .sort((left, right) => ({ LOW: 0, MEDIUM: 1, HIGH: 2 }[right.risk] || 0) - ({ LOW: 0, MEDIUM: 1, HIGH: 2 }[left.risk] || 0));
      if (matchingZones.length) {
        return { ...matchingZones[0], category, simulationKey: category };
      }
      const [lat, lon] = city.coordinates || [0, 0];
      const offsetX = ((index % 3) - 1) * 25;
      const offsetZ = (Math.floor(index / 3) - 1) * 24;
      const latitudeScale = Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
      return {
        id: `demo-${city.id || "city"}-${category}`,
        name: `${category[0].toUpperCase()}${category.slice(1)} Simulation`,
        category,
        simulationKey: category,
        coords: [lat - offsetZ / 15000, lon + offsetX / (13000 * latitudeScale)],
        risk: "MEDIUM",
        desc: "Illustrative simulation event. Its position is not a surveyed incident location.",
      };
    });
    const issueMarkers = [];
    const problemEffects = [];
    const issuePalette = {
      traffic: { color: 0xfb7185, accent: "#fda4af", label: "TRAFFIC" },
      flood: { color: 0xf97316, accent: "#fdba74", label: "FLOOD" },
      industrial: { color: 0xf59e0b, accent: "#fcd34d", label: "INDUSTRIAL" },
      pollution: { color: 0x94a3b8, accent: "#cbd5e1", label: "POLLUTION" },
      waste: { color: 0x84cc16, accent: "#bef264", label: "WASTE" },
      energy: { color: 0xf59e0b, accent: "#fcd34d", label: "ENERGY" },
      heat: { color: 0xef4444, accent: "#fca5a5", label: "HEAT" },
      accident: { color: 0xf97316, accent: "#fdba74", label: "ACCIDENT" },
      hospital: { color: 0x38bdf8, accent: "#7dd3fc", label: "HEALTH" },
      school: { color: 0x34d399, accent: "#a7f3d0", label: "COMMUNITY" },
      green: { color: 0x22c55e, accent: "#86efac", label: "GREEN" },
      default: { color: 0xfbbf24, accent: "#fef08a", label: "CITY" },
    };

    activeRiskZones.forEach((zone) => {
      const [lat, lon] = city.coordinates || [0, 0];
      const [zoneLat, zoneLon] = zone.coords || [lat, lon];
      const x = THREE.MathUtils.clamp((zoneLon - lon) * 13000 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2), -90, 90);
      const z = THREE.MathUtils.clamp((lat - zoneLat) * 15000, -90, 90);
      const categoryKey = zoneCategory((zone.category || "default").toLowerCase());
      const palette = issuePalette[categoryKey] || issuePalette.default;
      const issueColor = palette.color;
      const dangerScale = 1;
      const shapeKey = categoryKey;
      let shape;
      if (shapeKey === "flood") {
        const group = new THREE.Group();
        const base = new THREE.Mesh(
          new THREE.CylinderGeometry(2.2 * dangerScale, 2.2 * dangerScale, 7.2 * dangerScale, 6),
          new THREE.MeshBasicMaterial({ color: issueColor, transparent: true, opacity: 0.92 })
        );
        const top = new THREE.Mesh(
          new THREE.CylinderGeometry(0.8 * dangerScale, 1.8 * dangerScale, 2.3 * dangerScale, 6),
          new THREE.MeshBasicMaterial({ color: 0xfef3c7, transparent: true, opacity: 0.9 })
        );
        const warning = new THREE.Mesh(
          new THREE.ConeGeometry(2.1 * dangerScale, 4.6 * dangerScale, 3),
          new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.95 })
        );
        warning.rotation.z = Math.PI;
        warning.position.y = 7.2 * dangerScale;
        const wave = new THREE.Mesh(
          new THREE.TorusGeometry(2.6 * dangerScale, 0.26 * dangerScale, 8, 26, Math.PI),
          new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.8 })
        );
        wave.position.y = 3.5 * dangerScale;
        wave.rotation.x = Math.PI / 2;
        const floodPlane = new THREE.Mesh(
          new THREE.CircleGeometry(10 * dangerScale, 28),
          new THREE.MeshBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
        );
        floodPlane.rotation.x = -Math.PI / 2;
        floodPlane.position.y = 0.25;
        group.add(base, top, warning, wave, floodPlane);
        shape = group;
        shape.position.set(x, 3.7 * dangerScale, z);
      } else if (shapeKey === "traffic") {
        const group = new THREE.Group();
        const core = new THREE.Mesh(
          new THREE.OctahedronGeometry(3.0 * dangerScale, 0),
          new THREE.MeshBasicMaterial({ color: issueColor, transparent: true, opacity: 0.94 })
        );
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(1.2 * dangerScale, 4.8 * dangerScale, 0.6 * dangerScale),
          new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.9 })
        );
        const stop = new THREE.Mesh(
          new THREE.BoxGeometry(2.2 * dangerScale, 0.8 * dangerScale, 0.5 * dangerScale),
          new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.9 })
        );
        const queue = new THREE.Group();
        for (let i = 0; i < 4; i += 1) {
          const car = new THREE.Mesh(
            new THREE.BoxGeometry(1.1 * dangerScale, 0.75 * dangerScale, 0.7 * dangerScale),
            new THREE.MeshBasicMaterial({ color: 0xf87171, transparent: true, opacity: 0.9 })
          );
          car.position.set((i - 1.5) * 1.5 * dangerScale, 1.6 * dangerScale, 2.2 * dangerScale + i * 0.35);
          queue.add(car);
        }
        stripe.rotation.z = Math.PI / 2;
        stop.position.y = 1.8 * dangerScale;
        group.add(core, stripe, stop, queue);
        shape = group;
        shape.position.set(x, 5.1 * dangerScale, z);
      } else if (shapeKey === "hospital" || shapeKey === "school") {
        const group = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(3.2 * dangerScale, 8 * dangerScale, 3.2 * dangerScale),
          new THREE.MeshBasicMaterial({ color: issueColor, transparent: true, opacity: 0.9 })
        );
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(2.3 * dangerScale, 2.4 * dangerScale, 4),
          new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.9 })
        );
        roof.rotation.y = Math.PI / 4;
        roof.position.y = 6.2 * dangerScale;
        const cross = new THREE.Group();
        const bar1 = new THREE.Mesh(
          new THREE.BoxGeometry(1.7 * dangerScale, 0.9 * dangerScale, 0.5 * dangerScale),
          new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.9 })
        );
        const bar2 = new THREE.Mesh(
          new THREE.BoxGeometry(0.9 * dangerScale, 1.7 * dangerScale, 0.5 * dangerScale),
          new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.9 })
        );
        cross.add(bar1, bar2);
        cross.position.y = 6.4 * dangerScale;
        const pulse = new THREE.Mesh(
          new THREE.TorusGeometry(4.2 * dangerScale, 0.26 * dangerScale, 10, 30),
          new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.5 })
        );
        pulse.rotation.x = Math.PI / 2;
        pulse.position.y = 0.5;
        group.add(body, roof, cross, pulse);
        shape = group;
        shape.position.set(x, 4.1 * dangerScale, z);
      } else {
        const group = new THREE.Group();
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(2.5 * dangerScale, 9.5 * dangerScale, 24),
          new THREE.MeshBasicMaterial({ color: issueColor, transparent: true, opacity: 0.96 })
        );
        const beacon = new THREE.Mesh(
          new THREE.CylinderGeometry(0.9 * dangerScale, 0.9 * dangerScale, 2.5 * dangerScale, 8),
          new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.9 })
        );
        beacon.position.y = 5.8 * dangerScale;
        const exclamation = new THREE.Mesh(
          new THREE.BoxGeometry(0.7 * dangerScale, 4 * dangerScale, 0.6 * dangerScale),
          new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.95 })
        );
        exclamation.position.y = 7.8 * dangerScale;
        const hazardGlow = new THREE.Mesh(
          new THREE.SphereGeometry(3.8 * dangerScale, 16, 16),
          new THREE.MeshBasicMaterial({ color: issueColor, transparent: true, opacity: 0.12 })
        );
        hazardGlow.position.y = 2.8 * dangerScale;
        group.add(cone, beacon, exclamation, hazardGlow);
        shape = group;
        shape.position.set(x, 5.4 * dangerScale, z);
        shape.rotation.x = Math.PI;
      }

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(5.2 * dangerScale, 0.32, 16, 64),
        new THREE.MeshBasicMaterial({ color: issueColor, transparent: true, opacity: zone.risk === "HIGH" ? 0.95 : 0.82 })
      );
      ring.position.set(x, 0.9, z);
      ring.rotation.x = Math.PI / 2;

      const effectRoot = new THREE.Group();
      effectRoot.position.set(x, 0, z);
      const effectState = { type: shapeKey, zone, dangerScale, x, z };

      if (shapeKey === "traffic") {
        const queueCars = [];
        const queueGroup = new THREE.Group();
        const queueLength = 11;
        for (let i = 0; i < queueLength; i += 1) {
          const vehicle = new THREE.Group();
          const kind = i % 4;
          const dimensions = kind === 1 ? [2.6, 0.9, 1.05] : kind === 2 ? [2.3, 1.1, 1.2] : kind === 3 ? [0.9, 0.55, 0.5] : [1.5, 0.65, 0.9];
          const body = new THREE.Mesh(
            new THREE.BoxGeometry(...dimensions.map((value) => value * dangerScale)),
            new THREE.MeshBasicMaterial({ color: [0xef4444, 0x38bdf8, 0xf59e0b, 0xe2e8f0][kind] })
          );
          vehicle.add(body);
          [-0.3, 0.3].forEach((offset) => {
            const brakeLight = new THREE.Mesh(
              new THREE.SphereGeometry(0.13 * dangerScale, 6, 6),
              new THREE.MeshBasicMaterial({ color: 0xff1f38 })
            );
            brakeLight.position.set(-dimensions[0] * 0.48 * dangerScale, 0.05, offset * dangerScale);
            vehicle.add(brakeLight);
          });
          vehicle.position.set((i - 5) * 1.2 * dangerScale, 0.8 * dangerScale, (i % 2 === 0 ? 1.2 : -1.2) * dangerScale);
          queueCars.push(vehicle);
          queueGroup.add(vehicle);
        }
        const barrier = new THREE.Mesh(
          new THREE.BoxGeometry(8 * dangerScale, 0.8 * dangerScale, 0.8 * dangerScale),
          new THREE.MeshBasicMaterial({ color: 0xfca5a5, transparent: true, opacity: 0.7 })
        );
        barrier.position.set(0, 1.5 * dangerScale, 0);
        effectRoot.add(queueGroup, barrier);
        effectState.cars = queueCars;
      } else if (shapeKey === "flood") {
        const floodPatch = new THREE.Mesh(
          new THREE.CircleGeometry(8 * dangerScale, 28),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.38, side: THREE.DoubleSide })
        );
        floodPatch.rotation.x = -Math.PI / 2;
        floodPatch.position.y = 0.3;
        effectRoot.add(floodPatch);
        effectState.patch = floodPatch;
      } else if (shapeKey === "industrial" || shapeKey === "pollution") {
        const hazeGroup = new THREE.Group();
        const hazeMeshes = [];
        for (let i = 0; i < 7; i += 1) {
          const puff = new THREE.Mesh(
            new THREE.SphereGeometry(2.4 * dangerScale + i * 0.45, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.1 + THREE.MathUtils.clamp(ui.current.aqiVal / 600, 0, 0.18) })
          );
          puff.position.set((i - 3) * 1.8 * dangerScale, 1.8 + i * 0.85, (i % 2 === 0 ? 1.8 : -1.8) * dangerScale);
          hazeMeshes.push(puff);
          hazeGroup.add(puff);
        }
        effectRoot.add(hazeGroup);
        effectState.haze = hazeMeshes;
      } else if (shapeKey === "heat") {
        const heatZone = new THREE.Mesh(
          new THREE.CircleGeometry(7.5 * dangerScale, 36),
          new THREE.MeshBasicMaterial({ color: 0xfb5533, transparent: true, opacity: 0.14, side: THREE.DoubleSide })
        );
        heatZone.rotation.x = -Math.PI / 2;
        heatZone.position.y = 0.35;
        const shimmer = new THREE.Mesh(
          new THREE.TorusGeometry(5.5 * dangerScale, 0.18 * dangerScale, 8, 48),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.4 })
        );
        shimmer.rotation.x = Math.PI / 2;
        shimmer.position.y = 0.55;
        effectRoot.add(heatZone, shimmer);
        effectState.heatZone = heatZone;
        effectState.shimmer = shimmer;
      } else if (shapeKey === "hospital" || shapeKey === "school") {
        const emergency = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(2.8 * dangerScale, 1.3 * dangerScale, 1.4 * dangerScale),
          new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.8 })
        );
        const sirenA = new THREE.Mesh(
          new THREE.BoxGeometry(0.7 * dangerScale, 0.5 * dangerScale, 0.4 * dangerScale),
          new THREE.MeshBasicMaterial({ color: 0xfca5a5, transparent: true, opacity: 0.9 })
        );
        const sirenB = new THREE.Mesh(
          new THREE.BoxGeometry(0.7 * dangerScale, 0.5 * dangerScale, 0.4 * dangerScale),
          new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.9 })
        );
        sirenA.position.set(-0.8 * dangerScale, 1.2 * dangerScale, 0.05);
        sirenB.position.set(0.8 * dangerScale, 1.2 * dangerScale, 0.05);
        emergency.add(body, sirenA, sirenB);
        emergency.position.set(0, 1.2 * dangerScale, 0);
        effectRoot.add(emergency);
        effectState.emergency = emergency;
      } else if (shapeKey === "energy") {
        const transformer = new THREE.Mesh(
          new THREE.BoxGeometry(4 * dangerScale, 3.2 * dangerScale, 3.4 * dangerScale),
          new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.88 })
        );
        const insulator = new THREE.Mesh(
          new THREE.CylinderGeometry(0.45 * dangerScale, 0.6 * dangerScale, 2.2 * dangerScale, 8),
          new THREE.MeshBasicMaterial({ color: 0xe2e8f0 })
        );
        insulator.position.y = 2.7 * dangerScale;
        const energyPulse = new THREE.Mesh(
          new THREE.TorusGeometry(4 * dangerScale, 0.2 * dangerScale, 8, 32),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.7 })
        );
        energyPulse.position.y = 1;
        energyPulse.rotation.x = Math.PI / 2;
        shape = new THREE.Group();
        shape.add(transformer, insulator, energyPulse);
        shape.position.set(x, 1.8 * dangerScale, z);
      } else if (shapeKey === "accident") {
        const wreck = new THREE.Group();
        const carBody = new THREE.Mesh(
          new THREE.BoxGeometry(4.4 * dangerScale, 1 * dangerScale, 2.2 * dangerScale),
          new THREE.MeshBasicMaterial({ color: 0x64748b })
        );
        const cabin = new THREE.Mesh(
          new THREE.BoxGeometry(2 * dangerScale, 0.9 * dangerScale, 1.8 * dangerScale),
          new THREE.MeshBasicMaterial({ color: 0x334155 })
        );
        cabin.position.y = 0.85 * dangerScale;
        cabin.position.x = -0.3 * dangerScale;
        const coneGeometry = new THREE.ConeGeometry(0.45 * dangerScale, 1.3 * dangerScale, 6);
        const coneMaterial = new THREE.MeshBasicMaterial({ color: 0xf97316 });
        const cones = [-4, -1.3, 1.3, 4].map((offset) => {
          const cone = new THREE.Mesh(coneGeometry, coneMaterial);
          cone.position.set(offset * dangerScale, 0.65 * dangerScale, 2.4 * dangerScale);
          return cone;
        });
        wreck.add(carBody, cabin, ...cones);
        shape = wreck;
        shape.position.set(x, 0.6 * dangerScale, z);
      } else {
        const wastePile = new THREE.Group();
        for (let i = 0; i < 5; i += 1) {
          const bag = new THREE.Mesh(
            new THREE.BoxGeometry(1.2 * dangerScale, 1.1 * dangerScale, 1.2 * dangerScale),
            new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x475569 : 0x64748b, transparent: true, opacity: 0.82 })
          );
          bag.position.set((i - 2) * 1.2 * dangerScale, 0.6 * dangerScale, (i % 2 === 0 ? 1.5 : -1.2) * dangerScale);
          wastePile.add(bag);
        }
        effectRoot.add(wastePile);
        effectState.waste = wastePile;
      }
      const affectedZone = new THREE.Group();
      const zoneSurface = new THREE.Mesh(
        new THREE.CircleGeometry(1, 48),
        new THREE.MeshBasicMaterial({
          color: palette.color,
          transparent: true,
          opacity: 0.1,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      zoneSurface.rotation.x = -Math.PI / 2;
      zoneSurface.position.y = 0.16;
      const zoneBoundary = new THREE.Mesh(
        new THREE.TorusGeometry(1, 0.2, 8, 64),
        new THREE.MeshBasicMaterial({ color: palette.color, transparent: true, opacity: 0.72 })
      );
      zoneBoundary.rotation.x = Math.PI / 2;
      zoneBoundary.position.y = 0.35;
      affectedZone.add(zoneSurface, zoneBoundary);
      affectedZone.position.set(x, 0, z);

      const sourceRoot = new THREE.Group();
      const sourceMaterial = new THREE.MeshBasicMaterial({ color: palette.color });
      const sourceBase = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 2, 0.8, 12),
        new THREE.MeshBasicMaterial({ color: 0x475569 })
      );
      sourceBase.position.y = 0.4;
      sourceRoot.add(sourceBase);
      if (shapeKey === "traffic") {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 5, 8), sourceMaterial);
        pole.position.set(0, 2.8, 0);
        const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.8, 0.8), new THREE.MeshBasicMaterial({ color: 0x1e293b }));
        head.position.set(0, 5.2, 0);
        const redLamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        redLamp.position.set(0, 5.9, 0.44);
        sourceRoot.add(pole, head, redLamp);
      } else if (shapeKey === "pollution") {
        const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.9, 7, 12), new THREE.MeshBasicMaterial({ color: 0x64748b }));
        stack.position.y = 3.9;
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.15, 8, 16), sourceMaterial);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 7.4;
        sourceRoot.add(stack, rim);
      } else if (shapeKey === "flood") {
        const drain = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.35, 12), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
        drain.position.y = 0.85;
        const grate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 1.5), sourceMaterial);
        grate.position.y = 1.08;
        sourceRoot.add(drain, grate);
      } else if (shapeKey === "waste") {
        const bin = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.82, 2.7, 10), new THREE.MeshBasicMaterial({ color: 0x166534 }));
        bin.position.y = 1.75;
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.05, 0.3, 10), sourceMaterial);
        lid.position.y = 3.2;
        sourceRoot.add(bin, lid);
        const overflowingTrash = [];
        for (let i = 0; i < 6; i += 1) {
          const trash = new THREE.Mesh(
            i % 2 ? new THREE.BoxGeometry(0.9, 0.7, 0.8) : new THREE.SphereGeometry(0.55, 8, 8),
            new THREE.MeshBasicMaterial({ color: i % 2 ? 0x64748b : 0x84cc16 })
          );
          trash.position.set((i % 3 - 1) * 0.65, 3 + Math.floor(i / 3) * 0.55, (i % 2 ? 0.55 : -0.55));
          sourceRoot.add(trash);
          overflowingTrash.push(trash);
        }
        effectState.overflowingTrash = overflowingTrash;
      } else if (shapeKey === "energy") {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 5.6, 8), new THREE.MeshBasicMaterial({ color: 0x64748b }));
        pole.position.y = 3;
        const crossArm = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.25, 0.25), sourceMaterial);
        crossArm.position.y = 5.4;
        sourceRoot.add(pole, crossArm);
        effectState.energySource = sourceBase;
      } else if (shapeKey === "accident") {
        const wreckBody = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 2.3), new THREE.MeshBasicMaterial({ color: 0x475569 }));
        const wreckCabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.85, 1.8), new THREE.MeshBasicMaterial({ color: 0x1e293b }));
        wreckCabin.position.set(-0.3, 0.8, 0);
        const siren = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.5), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
        siren.position.set(0, 1.7, 0);
        const responseVehicle = new THREE.Group();
        const responseBody = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.2, 1.8), new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
        const responseSiren = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.5), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        responseSiren.position.y = 0.75;
        responseVehicle.add(responseBody, responseSiren);
        responseVehicle.position.set(-13, 0.7, 5);
        sourceRoot.add(wreckBody, wreckCabin, siren, responseVehicle);
        effectState.siren = siren;
        effectState.responseVehicle = responseVehicle;
      } else {
        const heatSource = new THREE.Mesh(new THREE.SphereGeometry(1.25, 12, 12), sourceMaterial);
        heatSource.position.y = 1.5;
        sourceRoot.add(heatSource);
      }
      if (shapeKey === "energy") {
        effectState.energyBuildings = buildings
          .filter((building) => Math.hypot(building.x - x, building.z - z) < 28)
          .sort((left, right) => Math.hypot(left.x - x, left.z - z) - Math.hypot(right.x - x, right.z - z))
          .slice(0, 5);
        effectState.energyLines = effectState.energyBuildings.map((building) => {
          const lineMaterial = new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.1, depthWrite: false });
          const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 5.4, 0),
            new THREE.Vector3(building.x - x, building.h + 1, building.z - z),
          ]);
          const line = new THREE.Line(lineGeometry, lineMaterial);
          effectRoot.add(line);
          return { line, building };
        });
      }
      if (shapeKey === "waste") {
        const truck = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(4, 1.7, 2.2), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
        const cab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.5, 2), new THREE.MeshBasicMaterial({ color: 0xe2e8f0 }));
        cab.position.x = 2.25;
        truck.add(body, cab);
        truck.position.set(5, 0.9, 4);
        sourceRoot.add(truck);
        effectState.collectionTruck = truck;
      }
      sourceRoot.position.set(x, 0, z);
      problemEffects.push(effectState);

      const labelCanvas = document.createElement("canvas");
      labelCanvas.width = 640;
      labelCanvas.height = 210;
      const labelCtx = labelCanvas.getContext("2d");
      const drawIssueLabel = (band, bandColor, severity) => {
        labelCtx.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
        labelCtx.fillStyle = "rgba(2, 8, 18, 1)";
        labelCtx.beginPath();
        labelCtx.roundRect(8, 8, 624, 194, 26);
        labelCtx.fill();
        labelCtx.strokeStyle = bandColor;
        labelCtx.lineWidth = 6;
        labelCtx.stroke();
        labelCtx.strokeStyle = "rgba(148, 163, 184, 0.55)";
        labelCtx.lineWidth = 1.5;
        labelCtx.stroke();
        labelCtx.fillStyle = "#ffffff";
        labelCtx.font = "800 42px Inter, sans-serif";
        labelCtx.fillText(zone.name || "Risk Zone", 34, 72, 570);
        labelCtx.fillStyle = "#e2e8f0";
        labelCtx.font = "700 27px Inter, sans-serif";
        labelCtx.fillText(`${palette.label}  ·  ${Math.round(severity * 100)}%`, 36, 122, 370);
        labelCtx.fillStyle = "rgba(15, 23, 42, 0.98)";
        labelCtx.beginPath();
        labelCtx.roundRect(420, 91, 184, 48, 16);
        labelCtx.fill();
        labelCtx.strokeStyle = bandColor;
        labelCtx.lineWidth = 2;
        labelCtx.stroke();
        labelCtx.fillStyle = bandColor;
        labelCtx.font = "900 23px Inter, sans-serif";
        labelCtx.textAlign = "center";
        labelCtx.fillText(band, 512, 123, 164);
        labelCtx.textAlign = "left";
        labelCtx.fillStyle = "#ffffff";
        labelCtx.font = "700 24px Inter, sans-serif";
        labelCtx.fillText("SOURCE  →  EFFECT  →  AREA", 36, 174, 568);
      };
      drawIssueLabel("LIVE", palette.accent, 0);
      const labelTexture = new THREE.CanvasTexture(labelCanvas);
      const label = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: labelTexture, transparent: true, depthTest: true, depthWrite: false })
      );
      label.position.set(x, 27, z);
      label.scale.set(27, 8.85, 1);

      gIssues.add(shape, ring, effectRoot, label, affectedZone, sourceRoot);
      const marker = {
        zone,
        category: shapeKey,
        cone: shape,
        ring,
        label,
        effectRoot,
        affectedZone,
        sourceRoot,
        severity: 0,
        labelTexture,
        statusBand: "",
        drawIssueLabel,
      };
      marker.effectState = effectState;
      shape.userData.issue = marker;
      ring.userData.issue = marker;
      label.userData.issue = marker;
      effectRoot.userData.issue = marker;
      pickables.push(shape, ring, label, effectRoot, sourceRoot, affectedZone);
      issueMarkers.push(marker);
    });

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
        const c = heatColor(st.heat, b, st.night, ui.current.trafficVisualPct, ui.current.energyPct);
        b.mat.color.copy(c);
        b.mat.emissive.copy(st.night ? c : new THREE.Color(0x16465c));
        b.mat.emissiveIntensity = st.night ? 0.35 : 0.16;
      });
    };

    const applyTheme = () => {
      const n = st.night;
      scene.background.set(n ? 0x050811 : 0x17263a);
      scene.fog.color.set(n ? 0x050811 : 0x17263a);
      hemi.color.set(n ? 0x223355 : 0xa8c4e0);
      hemi.groundColor.set(n ? 0x050811 : 0x18251f);
      hemi.intensity = n ? 0.6 : 1.0;
      sun.color.set(n ? 0x6688cc : 0xfffaed);
      sun.intensity = n ? 0.4 : 1.4;
      orb.material.color.set(n ? 0xf0f4ff : 0xffea88);
      stars.visible = n;
      themed.forEach(([m, d, ni]) => m.color.set(n ? ni : d));
      recolor();
    };

    /* Orbit Camera Controls */
    const cam = { th: 0.85, ph: 0.72, r: 190, tx: 0, tz: 0 };
    const home = { ...cam };
    let cameraGoal = null;
    let tourElapsed = 0;
    let tourIndex = 0;
    const placeCam = () => {
      camera.position.set(
        cam.tx + cam.r * Math.sin(cam.th) * Math.cos(cam.ph),
        4 + cam.r * Math.sin(cam.ph),
        cam.tz + cam.r * Math.cos(cam.th) * Math.cos(cam.ph)
      );
      camera.lookAt(cam.tx, 4, cam.tz);
    };

    let dragging = false, panning = false, downX = 0, downY = 0, moved = false;
    const el = mount;
    const onDown = (e) => {
      if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
      dragging = true;
      panning = e.button !== 0 || e.shiftKey;
      downX = e.clientX;
      downY = e.clientY;
      moved = false;
      el.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - downX, dy = e.clientY - downY;
      if (Math.hypot(dx, dy) > 4) moved = true;
      if (panning) {
        const scale = cam.r / Math.max(el.clientHeight, 1);
        cam.tx -= dx * scale * Math.cos(cam.th);
        cam.tz += dx * scale * Math.sin(cam.th);
        cam.tx += dy * scale * Math.sin(cam.th) * Math.cos(cam.ph);
        cam.tz += dy * scale * Math.cos(cam.th) * Math.cos(cam.ph);
        cam.tx = THREE.MathUtils.clamp(cam.tx, -120, 120);
        cam.tz = THREE.MathUtils.clamp(cam.tz, -120, 120);
      } else {
        cam.th -= dx * 0.006;
        cam.ph = THREE.MathUtils.clamp(cam.ph + dy * 0.005, 0.1, 1.4);
      }
      downX = e.clientX; downY = e.clientY;
    };
    const onUp = (e) => {
      if (!dragging) return;
      dragging = false;
      if (moved || panning) return;
      // Raycast building selection
      const rect = el.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const rc = new THREE.Raycaster();
      rc.setFromCamera(mouse, camera);
      const hits = rc.intersectObjects(pickables, true);
      if (hits.length) {
        const hit = hits[0].object;
        let target = hit;
        while (target && !target.userData?.issue && !target.userData?.b) target = target.parent;
        if (target?.userData?.issue) {
          const issueMarker = target.userData.issue;
          setSelectedIssue(issueMarker.zone);
          setSelectedBuilding(null);
          const location = new THREE.Vector3();
          issueMarker.sourceRoot.getWorldPosition(location);
          cameraGoal = { tx: location.x, tz: location.z, r: 76, ph: 0.82 };
        } else if (target?.userData?.b) {
          setSelectedBuilding(target.userData.b.info);
          setSelectedIssue(null);
        } else {
          setSelectedBuilding(null);
          setSelectedIssue(null);
        }
      }
      else {
        setSelectedBuilding(null);
        setSelectedIssue(null);
      }
    };
    const onPointerCancel = () => {
      dragging = false;
      panning = false;
    };
    const onWheel = (e) => {
      e.preventDefault();
      cam.r = THREE.MathUtils.clamp(cam.r + e.deltaY * 0.12, 40, 320);
    };
    const onContextMenu = (e) => e.preventDefault();

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onPointerCancel);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("contextmenu", onContextMenu);

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

      if (ui.current.autoRotate && !dragging) cam.th += dt * 0.14;
      if (ui.current.autoTour && issueMarkers.length) {
        tourElapsed += dt;
        if (tourElapsed >= 7) {
          tourElapsed = 0;
          const next = issueMarkers[tourIndex % issueMarkers.length];
          tourIndex += 1;
          cameraGoal = {
            tx: next.sourceRoot.position.x,
            tz: next.sourceRoot.position.z,
            r: 78,
            ph: 0.8,
          };
        }
      } else {
        tourElapsed = 0;
      }
      if (cameraGoal && !dragging) {
        cam.tx = THREE.MathUtils.damp(cam.tx, cameraGoal.tx, 2.4, dt);
        cam.tz = THREE.MathUtils.damp(cam.tz, cameraGoal.tz, 2.4, dt);
        cam.r = THREE.MathUtils.damp(cam.r, cameraGoal.r, 2.4, dt);
        cam.ph = THREE.MathUtils.damp(cam.ph, cameraGoal.ph, 2.4, dt);
        if (Math.hypot(cam.tx - cameraGoal.tx, cam.tz - cameraGoal.tz) < 0.1 && Math.abs(cam.r - cameraGoal.r) < 0.1) {
          cameraGoal = null;
        }
      }
      placeCam();
      ripple.offset.x += dt * 0.02;

      // Pulse rings animation
      pulseRings.forEach((r, idx) => {
        const s = ((now * 0.0006 + idx / 3) % 1);
        r.scale.setScalar(1 + s * 30);
        r.material.opacity = 0.5 * (1 - s);
      });

      issueMarkers.forEach((marker, idx) => {
        const liveProfile = ui.current.scenario === "Live profile";
        const profileSeverity = marker.category === "traffic"
          ? ui.current.trafficVisualPct / 100
          : marker.category === "pollution"
            ? ui.current.aqiVal / 300
            : marker.category === "energy"
              ? ui.current.energyPct / 100
              : marker.category === "flood"
                ? Math.max(marker.zone?.risk === "HIGH" ? 0.82 : marker.zone?.risk === "MEDIUM" ? 0.55 : 0.2, ui.current.rainfall / 12)
                : marker.zone?.risk === "HIGH" ? 0.82 : marker.zone?.risk === "MEDIUM" ? 0.55 : 0.2;
        const targetSeverity = THREE.MathUtils.clamp(
          (liveProfile ? profileSeverity : ui.current.simulation[marker.category] ?? 0)
          * (ui.current.scenarioProgress / 100),
          0,
          1
        );
        marker.severity += (targetSeverity - marker.severity) * (1 - Math.exp(-dt * 1.4));
        const severity = marker.severity;
        const pulse = 0.82 + Math.sin(now * 0.003 + idx) * 0.04;
        marker.cone.visible = severity > 0.025;
        marker.cone.scale.setScalar(pulse * (0.25 + severity * 0.9));
        marker.ring.scale.setScalar(0.5 + severity * 0.7 + (Math.sin(now * 0.002 + idx) + 1) * severity * 0.12);
        marker.ring.material.opacity = severity * (0.35 + (Math.sin(now * 0.004 + idx) + 1) * 0.18);
        marker.affectedZone.scale.setScalar(5 + severity * 22);
        marker.affectedZone.children[0].material.opacity = severity * 0.14;
        marker.affectedZone.children[1].material.opacity = severity * 0.72;
        const problemVisible = ui.current.layers.issues && ui.current.problemLayers[marker.category];
        marker.cone.visible = problemVisible && severity > 0.025;
        marker.ring.visible = problemVisible && severity > 0.025;
        marker.affectedZone.visible = problemVisible && severity > 0.025;
        marker.sourceRoot.visible = problemVisible && ui.current.showSources;
        marker.effectRoot.visible = problemVisible && severity > 0.015;
        marker.label.visible = problemVisible && ui.current.showSceneUi && severity > 0.08;
        marker.sourceRoot.scale.setScalar(0.65 + severity * 0.35);
        marker.effectRoot.scale.setScalar(0.45 + severity * 0.75);
        const state = marker.effectState;
        if (marker.effectRoot) {
          if (state?.type === "traffic" && state.cars) {
            state.cars.forEach((car, carIndex) => {
              const carSeverity = THREE.MathUtils.clamp(severity * 1.55 - carIndex * 0.11, 0, 1);
              car.scale.setScalar(carSeverity);
              const flowFactor = 1 - severity * 0.88;
              const travel = (now * 0.00026 * flowFactor) + carIndex;
              car.position.x = ((travel % 7) - 3.5) * (1.5 + severity * 0.55);
              car.position.z = (carIndex % 2 === 0 ? 1.2 : -1.2) * (state.dangerScale || 1);
            });
          }
          if (state?.type === "flood" && state.patch) {
            state.patch.material.opacity = severity * (0.18 + (Math.sin(now * 0.003 + idx) + 1) * 0.12);
            state.patch.scale.setScalar(0.45 + severity * 1.2);
            state.patch.position.y = 0.2 + severity * 0.85;
          }
          if ((state?.type === "industrial" || state?.type === "pollution") && state.haze) {
            state.haze.forEach((mesh, meshIndex) => {
              const drift = (now * 0.00012 + meshIndex * 0.9) % (8 + severity * 8);
              const windAngle = ((ui.current.windDirection + 180) * Math.PI) / 180;
              mesh.scale.setScalar((0.4 + severity * 0.8) * (1 + Math.sin(now * 0.0025 + idx + meshIndex) * 0.08));
              mesh.position.x = (meshIndex - 3) * 1.8 + Math.sin(windAngle) * drift;
              mesh.position.z = (meshIndex % 2 === 0 ? 1.8 : -1.8) + Math.cos(windAngle) * drift;
              mesh.position.y = 1.8 + meshIndex * 0.85 + Math.sin(now * 0.001 + idx + meshIndex) * 0.45;
              mesh.material.opacity = severity * (0.04 + THREE.MathUtils.clamp(ui.current.aqiVal / 600, 0, 0.22));
            });
          }
          if (state?.type === "heat") {
            const shimmer = 0.55 + severity * 0.7 + (Math.sin(now * 0.002 + idx) + 1) * severity * 0.08;
            state.heatZone.material.opacity = severity * (0.08 + (Math.sin(now * 0.003 + idx) + 1) * 0.05);
            state.shimmer.scale.setScalar(shimmer);
            state.shimmer.material.opacity = severity * (0.12 + (Math.sin(now * 0.004 + idx) + 1) * 0.12);
          }
          if (state?.type === "energy" && state.energySource) {
            state.energySource.material.color.setHex(Math.sin(now * 0.01) > 0.92 && severity > 0.8 ? 0xffffff : 0xf59e0b);
            state.energyLines?.forEach(({ line, building }) => {
              line.material.opacity = severity * (0.2 + (Math.sin(now * 0.008 + building.x) + 1) * 0.22);
              building.mat.emissive.setHex(0xf59e0b);
              building.mat.emissiveIntensity = severity * (0.08 + (Math.sin(now * 0.004 + building.z) + 1) * 0.18);
            });
          }
          if (state?.type === "accident" && state.siren) {
            state.siren.material.color.setHex(Math.sin(now * 0.015) > 0 ? 0x38bdf8 : 0xef4444);
            if (state.responseVehicle) {
              state.responseVehicle.position.x = -13 + (1 - severity) * 8;
              state.responseVehicle.visible = severity > 0.08;
              state.responseVehicle.children[1].material.color.setHex(Math.sin(now * 0.015) > 0 ? 0xef4444 : 0x38bdf8);
            }
          }
          if (state?.type === "waste" && state.collectionTruck) {
            if (severity > 0.12) state.hasBeenActive = true;
            state.overflowingTrash?.forEach((trash, trashIndex) => {
              const fill = THREE.MathUtils.clamp(severity * 1.7 - trashIndex * 0.18, 0, 1);
              trash.scale.setScalar(fill);
            });
            state.collectionTruck.visible = Boolean(state.hasBeenActive && severity < 0.08);
          }
          if (state?.type === "hospital" || state?.type === "school") {
            if (state.emergency) {
              state.emergency.rotation.y += 0.01;
              const flash = Math.sin(now * 0.01 + idx) > 0;
              state.emergency.children[1].material.color.setHex(flash ? 0xfca5a5 : 0xf87171);
              state.emergency.children[2].material.color.setHex(flash ? 0x7dd3fc : 0x38bdf8);
            }
          }
        }
        if (marker.label) {
          const statusBand = severity < 0.15 ? "NORMAL" : severity < 0.4 ? "LIVE" : severity < 0.72 ? "WARNING" : "CRITICAL";
          if (marker.statusBand !== statusBand || marker.lastLabelPercent !== Math.round(severity * 100)) {
            const color = statusBand === "CRITICAL" ? "#f87171" : statusBand === "WARNING" ? "#fbbf24" : statusBand === "LIVE" ? "#67e8f9" : "#86efac";
            marker.drawIssueLabel(statusBand, color, severity);
            marker.labelTexture.needsUpdate = true;
            marker.statusBand = statusBand;
            marker.lastLabelPercent = Math.round(severity * 100);
          }
          const labelBoost = 1 + severity * 0.04;
          marker.label.scale.set(27 * labelBoost, 8.85 * labelBoost, 1);
          marker.label.material.opacity = 0.98;
        }
      });

      const rainIntensity = ui.current.scenario === "Live profile"
        ? THREE.MathUtils.clamp(ui.current.rainfall / 4, 0, 1)
        : ui.current.scenario === "Monsoon Evening Rush"
          ? 0.9 * (ui.current.scenarioProgress / 100)
          : 0;
      rain.visible = rainIntensity > 0.02;
      rainMaterial.opacity = rainIntensity * 0.55;
      const rainAttribute = rainGeometry.attributes.position;
      for (let i = 0; i < rainAttribute.count; i += 1) {
        let y = rainAttribute.getY(i) - dt * (18 + rainIntensity * 34);
        if (y < 0) {
          y = 50 + rand() * 40;
          rainAttribute.setX(i, (rand() - 0.5) * 190);
          rainAttribute.setZ(i, (rand() - 0.5) * 190);
        }
        rainAttribute.setY(i, y);
      }
      rainAttribute.needsUpdate = true;
      scene.fog.far = 650 - THREE.MathUtils.clamp(ui.current.aqiVal / 350, 0, 1) * 130 - rainIntensity * 45;

      liveSensorEffects.forEach(({ marker, halo, haze, severity }, idx) => {
        const pulse = 1 + Math.sin(now * 0.003 + idx) * 0.12;
        marker.scale.setScalar(pulse);
        halo.scale.setScalar(pulse);
        haze.position.y = Math.sin(now * 0.0015 + idx) * 0.3;
        haze.rotation.y += 0.001 + severity * 0.002;
      });

      // Trains animation
      trains.forEach((tr) => {
        const d = Math.min(...tr.stations.map((s) => Math.abs(tr.u - s)));
        tr.u += tr.dir * 20 * (0.2 + 0.8 * THREE.MathUtils.clamp((d - 1) / 12, 0, 1)) * dt;
        if (tr.u > HALF) tr.u = -HALF;
        if (tr.u < -HALF) tr.u = HALF;
        tr.g.position.x = tr.u;
      });

      // Traffic cars animation
      if (gTraffic.visible) {
        const trafficSeverity = ui.current.scenario === "Live profile"
          ? ui.current.trafficVisualPct / 100
          : ui.current.simulation.traffic * (ui.current.scenarioProgress / 100);
        const floodSeverity = ui.current.scenario === "Live profile"
          ? THREE.MathUtils.clamp(ui.current.rainfall / 12, 0, 1)
          : ui.current.simulation.flood * (ui.current.scenarioProgress / 100);
        carMesh.count = Math.floor(cars.length * (0.18 + THREE.MathUtils.clamp(trafficSeverity, 0, 1) * 0.82));
        cars.forEach((c, n) => {
          c.t += c.dir * c.sp
            * (1 - THREE.MathUtils.clamp(trafficSeverity, 0, 1) * 0.72)
            * (1 - THREE.MathUtils.clamp(floodSeverity, 0, 1) * 0.28)
            * dt;
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
      updateSensors: updateLiveSensorEffects,
      setLayer: (k, v) => {
        if (k === "roads") {
          gRoad.visible = v;
          gBridge.visible = v;
          return;
        }
        const target = {
          buildings: gBuild,
          roads: gRoad,
          green: gGreen,
          metro: gMetro,
          traffic: gTraffic,
          water: gWater,
          sensors: gSmart,
          issues: gIssues,
          bridges: gBridge,
        }[k];
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
      sensors: beaconPos.length + activeRiskZones.length + liveSensorEffects.length
    });

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("contextmenu", onContextMenu);
      const geometries = new Set();
      const materials = new Set();
      const textures = new Set();
      scene.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
        objectMaterials.filter(Boolean).forEach((material) => {
          materials.add(material);
          Object.values(material).forEach((value) => {
            if (value?.isTexture) textures.add(value);
          });
        });
      });
      geometries.forEach((geometry) => geometry.dispose());
      textures.forEach((texture) => texture.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      api.current = null;
    };
  }, [city]);

  // Sync state controls to Three.js api
  useEffect(() => { api.current?.setNight(isNight); }, [isNight]);
  useEffect(() => { api.current?.setHeat(heatmapMode); }, [heatmapMode]);
  useEffect(() => { Object.entries(layers).forEach(([k, v]) => api.current?.setLayer(k, v)); }, [layers]);
  useEffect(() => { api.current?.updateSensors(liveSensorStations); }, [liveSensorStations]);

  const toggleLayer = (k) => setLayers((l) => ({ ...l, [k]: !l[k] }));

  const toggleFullscreen = async () => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    setSceneActionError("");
    try {
      if (document.fullscreenElement === viewport) {
        await document.exitFullscreen();
      } else if (viewport.requestFullscreen) {
        await viewport.requestFullscreen();
      } else {
        throw new Error("Fullscreen is not supported by this browser.");
      }
    } catch (error) {
      setSceneActionError(error instanceof Error ? error.message : "Unable to change fullscreen mode.");
    }
  };

  const iconBtn = "rounded-xl border border-cyan-300/50 bg-[#081523]/95 p-2.5 text-cyan-100 shadow-lg backdrop-blur-xl transition-all hover:border-cyan-200 hover:bg-[#10253a] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300";

  const legend = {
    traffic: ["bg-gradient-to-r from-cyan-400 to-rose-500", "Light Flow", "Congested Grid"],
    energy: ["bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500", "Low Load", "Peak Draw"],
  }[heatmapMode];

  return (
    <div className={embedded ? "space-y-3" : "space-y-6"}>
      {!embedded && <PageHeader
        title={`${cityName.toUpperCase()} DIGITAL TWIN`}
        subtitle="Explore an example 3D city. The buildings and figures are illustrative."
        icon={Boxes}
        badge="3D demo"
        whyFeatureIds="digital-city-twin"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsNight(!isNight)}
              aria-pressed={isNight}
              aria-label={isNight ? "Switch to daylight view" : "Switch to night view"}
              className={iconBtn}
              title={isNight ? "Switch to Daylight View" : "Switch to Night Simulation"}
            >
              {isNight ? <Moon className="w-4 h-4 text-cyan-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            <div className="bg-slate-900/90 p-1 rounded-xl border border-cyan-500/30 flex items-center gap-1 backdrop-blur-md">
              {[
                ["traffic", "Demo Traffic Heat", "bg-rose-500 text-white"],
                ["energy", "Demo Grid Load", "bg-purple-500 text-white"],
                ["default", "Default", "bg-cyan-500 text-slate-950 font-bold"]
              ].map(([k, label, onClass]) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setHeatmapMode(k)}
                  aria-pressed={heatmapMode === k}
                  className={`rounded-lg px-3 py-2 text-[11px] font-bold transition-all ${
                    heatmapMode === k ? onClass : "text-slate-200 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        }
      />}

      {!embedded && <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-100">
        Generated buildings, roads, and simulated event locations are illustrative, not surveyed geography. Available live traffic, air-quality, and particulate-sensor readings modulate their corresponding effects; profile values fill gaps when feeds are unavailable. Sensor positions are approximate.
      </div>}

      {/* Main 3D Simulator Viewport */}
      <div ref={viewportRef} className={`relative w-full overflow-hidden border border-cyan-300/35 shadow-[0_0_60px_rgba(6,182,212,0.18)] bg-[#070a13] ${isFullscreen ? "h-screen rounded-none" : `rounded-2xl ${embedded ? "h-[420px] sm:h-[520px] lg:h-[580px]" : "h-[640px]"}`}`}>
        <div ref={mountRef} className="w-full h-full touch-none cursor-grab active:cursor-grabbing" />

      {webglError && (
        <div role="alert" className="absolute inset-0 z-30 grid place-content-center gap-2 bg-slate-950/95 p-6 text-center">
          <p className="text-sm font-bold text-rose-200">3D view unavailable</p>
          <p className="mx-auto max-w-lg text-xs leading-relaxed text-slate-300">{webglError}</p>
          <p className="text-[11px] text-slate-400">Enable hardware acceleration or use the 2D Digital Twin map.</p>
          <a href={`${import.meta.env.BASE_URL}digital-twin`} className="mx-auto rounded-lg border border-cyan-400/40 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-400/10">
            Open 2D Digital Twin
          </a>
        </div>
      )}

      {/* Layer Toggles Floating Island */}
        {showSceneUi && <div className="absolute left-3 right-16 top-3 z-10 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-[#07111f]/75 p-2 shadow-xl backdrop-blur-xl lg:right-auto lg:max-w-[min(76%,900px)]">
          <Chip on={layers.buildings} onClick={() => toggleLayer("buildings")} icon={Boxes} label="Buildings · DEMO" />
          <Chip on={layers.roads} onClick={() => toggleLayer("roads")} icon={Activity} label="Roads · DEMO" />
          <Chip on={layers.traffic} onClick={() => toggleLayer("traffic")} icon={Car} label="Traffic · DEMO" />
          <Chip on={layers.metro} onClick={() => toggleLayer("metro")} icon={TrainFront} label="Transit · DEMO" />
          <Chip on={layers.green} onClick={() => toggleLayer("green")} icon={TreePine} label="Green · DEMO" />
          <Chip on={layers.water} onClick={() => toggleLayer("water")} icon={Droplet} label="Waterway · DEMO" />
          <Chip on={layers.sensors} onClick={() => toggleLayer("sensors")} icon={Radio} label={`Sensors · ${liveSensorsAvailable ? "LIVE" : "DEMO"}`} />
          <Chip on={layers.issues} onClick={() => toggleLayer("issues")} icon={AlertTriangle} label="Problem Effects" />
        </div>}

        {showSceneUi && <details className="absolute left-3 top-[5.25rem] z-10 w-[min(390px,calc(100%-24px))] overflow-hidden rounded-2xl border border-cyan-200/45 bg-[#050d19]/[.98] text-white shadow-[0_18px_48px_rgba(0,0,0,0.75)] backdrop-blur-2xl sm:left-auto sm:right-16 sm:top-[5.25rem]">
          <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-extrabold tracking-[0.1em] text-white">
            LIVE SCENARIO SIMULATOR <span className="ml-1 text-[12px] font-semibold tracking-normal text-cyan-100">· {scenario}</span>
          </summary>
          <div className="max-h-[45vh] space-y-3 overflow-y-auto border-t border-white/10 p-4">
            <div className="grid grid-cols-1 gap-1.5">
              {Object.keys(SCENARIO_PRESETS).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setSimulation(SCENARIO_PRESETS[preset]);
                    setScenario(preset);
                    setScenarioProgress(100);
                    setScenarioTrend("scenario applied");
                    setSimulationUpdatedAt(new Date());
                  }}
                  aria-pressed={scenario === preset}
                  className={`min-h-10 rounded-lg border px-3 py-2 text-left text-[13px] font-bold transition ${
                    scenario === preset
                      ? "border-cyan-200/70 bg-cyan-400/20 text-white"
                      : "border-slate-500/70 bg-slate-900/90 text-slate-100 hover:border-cyan-200/70"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            {PROBLEM_TYPES.map(([key, label]) => (
              <div key={key} className="grid grid-cols-[108px_1fr_42px] items-center gap-2 text-[13px]">
                <label htmlFor={`severity-${key}`} className="font-semibold text-white">{label}</label>
                <input
                  id={`severity-${key}`}
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(simulation[key] * 100)}
                  onChange={(event) => {
                    const value = Number(event.target.value) / 100;
                    setSimulation((current) => ({ ...current, [key]: value }));
                    setScenario("Custom simulation");
                    setScenarioProgress(100);
                    setScenarioTrend(value > simulation[key] ? "increasing" : value < simulation[key] ? "decreasing" : "stable");
                    setSimulationUpdatedAt(new Date());
                  }}
                  className="h-1.5 w-full cursor-pointer accent-cyan-400"
                  aria-label={`${label} severity`}
                />
                <span className="text-right font-mono text-[13px] font-extrabold text-cyan-100">{Math.round(simulation[key] * 100)}%</span>
              </div>
            ))}
            <div className="border-t border-slate-700/70 pt-2">
              <div className="mb-1 flex justify-between text-[12px] font-semibold text-white">
                <label htmlFor="scenario-progress">Scenario progression</label>
                <span>{scenarioProgress}%</span>
              </div>
              <input
                id="scenario-progress"
                type="range"
                min="0"
                max="100"
                value={scenarioProgress}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setScenarioProgress(value);
                  if (scenario === "Live profile") setScenario("Custom simulation");
                  setScenarioTrend(value > scenarioProgress ? "event progressing" : value < scenarioProgress ? "event receding" : "stable");
                  setSimulationUpdatedAt(new Date());
                }}
                className="h-1.5 w-full cursor-pointer accent-amber-400"
              />
            </div>
            <div className="flex items-center justify-between border-t border-slate-700/70 pt-2">
              <span className="text-[12px] font-bold text-white">Problem layers</span>
              <button
                type="button"
                onClick={() => setShowSources((visible) => !visible)}
                aria-pressed={showSources}
                className="rounded-md border border-cyan-200/50 bg-slate-900 px-2.5 py-1.5 text-[12px] font-bold text-cyan-50"
              >
                Sources {showSources ? "On" : "Off"}
              </button>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {PROBLEM_TYPES.map(([key, label]) => (
                <label key={key} className="flex items-center gap-1.5 text-[12px] font-semibold text-white">
                  <input
                    type="checkbox"
                    checked={problemLayers[key]}
                    onChange={() => setProblemLayers((current) => ({ ...current, [key]: !current[key] }))}
                    className="accent-cyan-400"
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="text-[12px] leading-relaxed text-slate-200">
              Demo playback eases each event in and out. Live sensor feeds are used when available; simulated incident locations are illustrative, not surveyed.
            </p>
          </div>
        </details>}

        {/* Viewport Control Buttons */}
        {showSceneUi && <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5 lg:right-4 lg:flex-row">
          <button
            type="button"
            className={`${iconBtn} ${autoTour ? "!border-amber-400/60 !text-amber-200" : ""}`}
            onClick={() => setAutoTour((enabled) => !enabled)}
            aria-pressed={autoTour}
            title="Tour active problem locations"
            aria-label={autoTour ? "Stop problem location tour" : "Start problem location tour"}
          >
            <span className="text-[10px] font-bold">TOUR</span>
          </button>
          <button type="button" className={iconBtn} onClick={() => api.current?.zoom(0.8)} title="Zoom in" aria-label="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button type="button" className={iconBtn} onClick={() => api.current?.zoom(1.25)} title="Zoom out" aria-label="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            className={`${iconBtn} ${autoRotate ? "!border-emerald-400/60 !text-emerald-300" : ""}`}
            onClick={() => setAutoRotate(!autoRotate)}
            title="Toggle automatic camera rotation"
            aria-label={autoRotate ? "Stop automatic camera rotation" : "Start automatic camera rotation"}
            aria-pressed={autoRotate}
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button type="button" className={iconBtn} onClick={() => api.current?.reset()} title="Reset camera view" aria-label="Reset camera view">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button type="button" className={iconBtn} onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"} aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
            {isFullscreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>}

        <button
          type="button"
          onClick={() => setShowSceneUi((visible) => !visible)}
          className="absolute bottom-3 right-3 z-20 rounded-xl border border-cyan-100/40 bg-[#06111f]/95 px-3 py-2 text-[11px] font-bold text-white shadow-xl backdrop-blur-xl"
          aria-pressed={!showSceneUi}
        >
          {showSceneUi ? "Hide scene UI" : "Show scene UI"}
        </button>

        {/* Generated model element inspector */}
        {selectedBuilding && (
          <div className="absolute top-16 right-4 w-72 rounded-2xl border border-cyan-200/50 bg-[#06111f] p-4 text-[12px] font-medium leading-relaxed text-slate-100 shadow-[0_18px_48px_rgba(0,0,0,0.6)] backdrop-blur-2xl z-20 animate-in fade-in zoom-in-95 space-y-2.5">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
              <div>
                <div className="text-cyan-100 font-extrabold text-sm tracking-wide">{selectedBuilding.name}</div>
                <div className="text-[11px] text-slate-200 font-medium">{selectedBuilding.district} · Generated demo object</div>
              </div>
              <button type="button" onClick={() => setSelectedBuilding(null)} aria-label="Close generated building details" className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
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
                <div key={k} className="flex justify-between items-center gap-3 text-[11px]">
                  <span className="text-slate-300">{k}</span>
                  <span className="font-bold text-white font-mono">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {showSceneUi && activeIssue && (
          <div className="absolute left-4 top-16 z-20 max-w-xs rounded-2xl border border-rose-300/55 bg-[#100b16] p-4 text-[12px] font-medium leading-relaxed text-white shadow-[0_18px_48px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-rose-100">
              <AlertTriangle className="h-3.5 w-3.5" />
              Risk zone · {scenario === "Live profile" ? "profile" : "simulation"}
            </div>
            <div className="mt-2 text-sm font-bold text-white">{activeIssue.name}</div>
            <div className="mt-1 text-[12px] text-slate-100">{activeIssue.desc}</div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-100">
              <span className="font-bold text-amber-200">Severity: {activeIssueSeverity}%</span>
              <span className="font-mono font-bold text-cyan-100">{activeIssueCategory?.toUpperCase()}</span>
            </div>
            {PROBLEM_GUIDANCE[activeIssueCategory] && (
              <div className="mt-2 space-y-1.5 border-t border-white/15 pt-2 text-[11px]">
                <p><span className="font-semibold text-slate-300">Likely source:</span> <span className="text-white">{PROBLEM_GUIDANCE[activeIssueCategory][0]}</span></p>
                <p><span className="font-semibold text-slate-300">Effect:</span> <span className="text-white">{PROBLEM_GUIDANCE[activeIssueCategory][1]}</span></p>
                <p><span className="font-semibold text-slate-300">Action:</span> <span className="text-white">{PROBLEM_GUIDANCE[activeIssueCategory][2]}</span></p>
                <p><span className="font-semibold text-slate-300">Trend:</span> <span className="text-white">{scenarioTrend}</span></p>
                <p className="font-mono text-slate-300">Simulation update {simulationUpdatedAt.toLocaleTimeString()}</p>
              </div>
            )}
          </div>
        )}

        {/* Sample profile overlay */}
        {showSceneUi && <div className="absolute bottom-4 left-4 max-w-sm space-y-2 rounded-2xl border border-cyan-200/30 bg-[#07111f]/95 p-4 text-[12px] font-medium leading-relaxed text-slate-100 shadow-[0_18px_48px_rgba(0,0,0,0.58)] backdrop-blur-2xl pointer-events-none z-10">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" />
            <span className="text-[12px] font-extrabold tracking-wide text-white">{cityName.toUpperCase()} · DEMO SCENE</span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-mono font-semibold">
            <div className="flex justify-between">
              <span className="text-slate-200">Traffic</span>
              <span className="text-rose-200 font-extrabold">{trafficPct}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-200">Grid load</span>
              <span className="text-amber-200 font-extrabold">{energyPct}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-200">Air quality</span>
              <span className="text-cyan-100 font-extrabold">{aqiVal} AQI</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-200">Green cover</span>
              <span className="text-emerald-200 font-extrabold">{greenPct}%</span>
            </div>
          </div>

          {legend && (
            <div className="pt-1.5 border-t border-slate-800">
              <div className={`h-1.5 w-full rounded-full ${legend[0]}`} />
              <div className="mt-1 flex justify-between text-[11px] font-semibold text-white">
                <span>{legend[1]}</span>
                <span>{legend[2]}</span>
              </div>
            </div>
          )}
          <p className="border-t border-white/15 pt-2 text-[11px] font-medium leading-relaxed text-slate-200">
            Drag to orbit · Shift/right-drag to pan · Scroll to zoom. Problem effects include profile data and illustrative simulated event locations.
          </p>
        </div>}

        {/* Bottom Right generated geometry counts */}
        {showSceneUi && <div className="absolute bottom-4 right-4 rounded-2xl border border-cyan-200/30 bg-[#07111f]/95 p-4 text-right text-[11px] font-medium leading-relaxed text-slate-100 shadow-[0_18px_48px_rgba(0,0,0,0.58)] backdrop-blur-2xl pointer-events-none z-10">
          <div className="font-mono text-[12px] font-extrabold text-cyan-100">Generated {cityName} scene</div>
          <div className="mt-1 font-mono text-[11px] text-slate-200">
            {stats.buildings} demo buildings · {stats.trees} demo trees · {stats.vehicles} demo vehicles · {stats.bridges} demo bridges · {stats.sensors} demo markers
          </div>
        </div>}
        {sceneActionError && (
          <div className="absolute bottom-16 right-3 z-30 max-w-sm rounded-lg border border-rose-300/40 bg-slate-950/95 px-3 py-2 text-xs font-semibold text-rose-100 shadow-xl" role="alert">
            {sceneActionError}
          </div>
        )}
      </div>
    </div>
  );
};

export default City3D;
