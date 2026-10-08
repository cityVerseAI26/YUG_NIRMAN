export const POLLUTION_DATA = {
  mumbai: {
    currentAQI: 156,
    status: "POOR",
    categoryColor: "#f59e0b",
    mainSource: "Vehicle Emissions (42%)",
    pollutants: [
      { name: "PM 2.5", value: 68, standard: 30, unit: "µg/m³", status: "MODERATE" },
      { name: "PM 10", value: 142, standard: 60, unit: "µg/m³", status: "POOR" },
      { name: "NO₂", value: 48, standard: 40, unit: "µg/m³", status: "MODERATE" },
      { name: "CO", value: 1.4, standard: 2.0, unit: "mg/m³", status: "GOOD" },
      { name: "SO₂", value: 16, standard: 50, unit: "µg/m³", status: "GOOD" },
      { name: "O₃", value: 34, standard: 100, unit: "µg/m³", status: "GOOD" }
    ],
    sources: [
      { name: "Vehicle Emissions", percentage: 42, color: "#f87171" },
      { name: "Construction Dust", percentage: 26, color: "#fbbf24" },
      { name: "Industrial Units", percentage: 18, color: "#38bdf8" },
      { name: "Waste Burning", percentage: 9, color: "#a855f7" },
      { name: "Sea Salt & Natural", percentage: 5, color: "#34d399" }
    ],
    timeline: [
      { time: "00:00", aqi: 138, pm25: 56, pm10: 120 },
      { time: "04:00", aqi: 142, pm25: 60, pm10: 128 },
      { time: "08:00", aqi: 172, pm25: 78, pm10: 158 },
      { time: "12:00", aqi: 165, pm25: 74, pm10: 150 },
      { time: "16:00", aqi: 158, pm25: 70, pm10: 144 },
      { time: "20:00", aqi: 168, pm25: 76, pm10: 155 },
      { time: "23:00", aqi: 156, pm25: 68, pm10: 142 }
    ]
  },
  thane: {
    currentAQI: 138,
    status: "MODERATE",
    categoryColor: "#eab308",
    mainSource: "Industrial & Transit Freight (36%)",
    pollutants: [
      { name: "PM 2.5", value: 54, standard: 30, unit: "µg/m³", status: "MODERATE" },
      { name: "PM 10", value: 118, standard: 60, unit: "µg/m³", status: "MODERATE" },
      { name: "NO₂", value: 38, standard: 40, unit: "µg/m³", status: "GOOD" },
      { name: "CO", value: 1.1, standard: 2.0, unit: "mg/m³", status: "GOOD" },
      { name: "SO₂", value: 19, standard: 50, unit: "µg/m³", status: "GOOD" },
      { name: "O₃", value: 29, standard: 100, unit: "µg/m³", status: "GOOD" }
    ],
    sources: [
      { name: "Industrial Units", percentage: 36, color: "#38bdf8" },
      { name: "Highway Freight", percentage: 31, color: "#f87171" },
      { name: "Construction Dust", percentage: 21, color: "#fbbf24" },
      { name: "Domestic Cooking", percentage: 8, color: "#a855f7" },
      { name: "Natural Vegetation", percentage: 4, color: "#34d399" }
    ],
    timeline: [
      { time: "00:00", aqi: 125, pm25: 48, pm10: 104 },
      { time: "04:00", aqi: 128, pm25: 50, pm10: 109 },
      { time: "08:00", aqi: 152, pm25: 62, pm10: 134 },
      { time: "12:00", aqi: 144, pm25: 58, pm10: 125 },
      { time: "16:00", aqi: 136, pm25: 52, pm10: 115 },
      { time: "20:00", aqi: 148, pm25: 60, pm10: 130 },
      { time: "23:00", aqi: 138, pm25: 54, pm10: 118 }
    ]
  },
  pune: {
    currentAQI: 128,
    status: "MODERATE",
    categoryColor: "#10b981",
    mainSource: "Two-Wheeler / Automobile (38%)",
    pollutants: [
      { name: "PM 2.5", value: 46, standard: 30, unit: "µg/m³", status: "MODERATE" },
      { name: "PM 10", value: 105, standard: 60, unit: "µg/m³", status: "MODERATE" },
      { name: "NO₂", value: 34, standard: 40, unit: "µg/m³", status: "GOOD" },
      { name: "CO", value: 0.9, standard: 2.0, unit: "mg/m³", status: "GOOD" },
      { name: "SO₂", value: 12, standard: 50, unit: "µg/m³", status: "GOOD" },
      { name: "O₃", value: 38, standard: 100, unit: "µg/m³", status: "GOOD" }
    ],
    sources: [
      { name: "Vehicular Traffic", percentage: 38, color: "#f87171" },
      { name: "Biomass / Refuse", percentage: 22, color: "#a855f7" },
      { name: "Construction", percentage: 22, color: "#fbbf24" },
      { name: "Industrial Parks", percentage: 14, color: "#38bdf8" },
      { name: "Other Biogenic", percentage: 4, color: "#34d399" }
    ],
    timeline: [
      { time: "00:00", aqi: 115, pm25: 40, pm10: 92 },
      { time: "04:00", aqi: 118, pm25: 42, pm10: 95 },
      { time: "08:00", aqi: 140, pm25: 53, pm10: 116 },
      { time: "12:00", aqi: 133, pm25: 49, pm10: 110 },
      { time: "16:00", aqi: 126, pm25: 45, pm10: 102 },
      { time: "20:00", aqi: 136, pm25: 51, pm10: 114 },
      { time: "23:00", aqi: 128, pm25: 46, pm10: 105 }
    ]
  },
  bangalore: {
    currentAQI: 112,
    status: "MODERATE",
    categoryColor: "#10b981",
    mainSource: "Traffic Idling & Resuspended Dust (48%)",
    pollutants: [
      { name: "PM 2.5", value: 42, standard: 30, unit: "µg/m³", status: "MODERATE" },
      { name: "PM 10", value: 92, standard: 60, unit: "µg/m³", status: "MODERATE" },
      { name: "NO₂", value: 36, standard: 40, unit: "µg/m³", status: "GOOD" },
      { name: "CO", value: 1.0, standard: 2.0, unit: "mg/m³", status: "GOOD" },
      { name: "SO₂", value: 8, standard: 50, unit: "µg/m³", status: "GOOD" },
      { name: "O₃", value: 40, standard: 100, unit: "µg/m³", status: "GOOD" }
    ],
    sources: [
      { name: "Traffic Idling", percentage: 48, color: "#f87171" },
      { name: "Road Dust", percentage: 24, color: "#fbbf24" },
      { name: "Diesel Generators", percentage: 14, color: "#a855f7" },
      { name: "Light Industry", percentage: 9, color: "#38bdf8" },
      { name: "Biogenic", percentage: 5, color: "#34d399" }
    ],
    timeline: [
      { time: "00:00", aqi: 98, pm25: 35, pm10: 80 },
      { time: "04:00", aqi: 102, pm25: 37, pm10: 83 },
      { time: "08:00", aqi: 124, pm25: 48, pm10: 102 },
      { time: "12:00", aqi: 116, pm25: 44, pm10: 95 },
      { time: "16:00", aqi: 110, pm25: 40, pm10: 90 },
      { time: "20:00", aqi: 122, pm25: 47, pm10: 100 },
      { time: "23:00", aqi: 112, pm25: 42, pm10: 92 }
    ]
  },
  delhi: {
    currentAQI: 268,
    status: "DANGEROUS",
    categoryColor: "#ef4444",
    mainSource: "Thermal, Inversion & Stubble Drift (46%)",
    pollutants: [
      { name: "PM 2.5", value: 158, standard: 30, unit: "µg/m³", status: "DANGEROUS" },
      { name: "PM 10", value: 295, standard: 60, unit: "µg/m³", status: "DANGEROUS" },
      { name: "NO₂", value: 84, standard: 40, unit: "µg/m³", status: "POOR" },
      { name: "CO", value: 3.4, standard: 2.0, unit: "mg/m³", status: "POOR" },
      { name: "SO₂", value: 32, standard: 50, unit: "µg/m³", status: "MODERATE" },
      { name: "O₃", value: 58, standard: 100, unit: "µg/m³", status: "MODERATE" }
    ],
    sources: [
      { name: "Regional Inversion", percentage: 46, color: "#ef4444" },
      { name: "Vehicular Traffic", percentage: 28, color: "#f87171" },
      { name: "Construction Waste", percentage: 14, color: "#fbbf24" },
      { name: "Industrial Coal/Power", percentage: 8, color: "#38bdf8" },
      { name: "Municipal Burning", percentage: 4, color: "#a855f7" }
    ],
    timeline: [
      { time: "00:00", aqi: 242, pm25: 140, pm10: 260 },
      { time: "04:00", aqi: 255, pm25: 148, pm10: 275 },
      { time: "08:00", aqi: 288, pm25: 172, pm10: 320 },
      { time: "12:00", aqi: 274, pm25: 162, pm10: 305 },
      { time: "16:00", aqi: 260, pm25: 152, pm10: 285 },
      { time: "20:00", aqi: 282, pm25: 168, pm10: 315 },
      { time: "23:00", aqi: 268, pm25: 158, pm10: 295 }
    ]
  }
};

export const AQI_LEVELS = [
  { range: "0 - 50", label: "Good", color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/40" },
  { range: "51 - 100", label: "Moderate", color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/40" },
  { range: "101 - 200", label: "Unhealthy", color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/40" },
  { range: "201 - 300+", label: "Severe", color: "text-rose-400", bg: "bg-rose-500/20", border: "border-rose-500/40" }
];
