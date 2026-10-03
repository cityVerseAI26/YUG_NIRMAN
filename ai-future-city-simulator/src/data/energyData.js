export const ENERGY_DATA = {
  mumbai: {
    totalConsumption: "4,820 MW",
    peakDemand: "5,400 MW",
    gridStatus: "HIGH LOAD (82%)",
    renewableMix: "28.4%",
    breakdown: [
      { name: "Commercial & Tech", value: 44, color: "#38bdf8" },
      { name: "Residential", value: 34, color: "#818cf8" },
      { name: "Industrial & Port", value: 22, color: "#a855f7" }
    ],
    hourlyGridLoad: [
      { time: "00:00", actual: 3100, solar: 0, wind: 640 },
      { time: "04:00", actual: 2900, solar: 0, wind: 710 },
      { time: "08:00", actual: 4200, solar: 420, wind: 650 },
      { time: "12:00", actual: 5200, solar: 1100, wind: 580 },
      { time: "16:00", actual: 4900, solar: 820, wind: 620 },
      { time: "20:00", actual: 5350, solar: 0, wind: 840 },
      { time: "23:00", actual: 4100, solar: 0, wind: 790 }
    ],
    sources: [
      { type: "Solar Microgrids", percentage: 14, capacity: "750 MW" },
      { type: "Offshore Wind", percentage: 14.4, capacity: "820 MW" },
      { type: "Hydroelectric Pumped", percentage: 18.6, capacity: "1,100 MW" },
      { type: "Thermal / Clean Gas", percentage: 53, capacity: "3,200 MW" }
    ]
  },
  thane: {
    totalConsumption: "1,640 MW",
    peakDemand: "1,850 MW",
    gridStatus: "MODERATE (75%)",
    renewableMix: "34.2%",
    breakdown: [
      { name: "Commercial", value: 32, color: "#38bdf8" },
      { name: "Residential", value: 42, color: "#818cf8" },
      { name: "Industrial", value: 26, color: "#a855f7" }
    ],
    hourlyGridLoad: [
      { time: "00:00", actual: 980, solar: 0, wind: 240 },
      { time: "04:00", actual: 920, solar: 0, wind: 280 },
      { time: "08:00", actual: 1420, solar: 180, wind: 260 },
      { time: "12:00", actual: 1780, solar: 450, wind: 230 },
      { time: "16:00", actual: 1650, solar: 320, wind: 250 },
      { time: "20:00", actual: 1820, solar: 0, wind: 310 },
      { time: "23:00", actual: 1350, solar: 0, wind: 290 }
    ],
    sources: [
      { type: "Rooftop Solar", percentage: 22, capacity: "420 MW" },
      { type: "Hydro Utility", percentage: 12.2, capacity: "230 MW" },
      { type: "Biomass Co-gen", percentage: 8.8, capacity: "165 MW" },
      { type: "Regional Grid", percentage: 57, capacity: "1,080 MW" }
    ]
  },
  pune: {
    totalConsumption: "2,350 MW",
    peakDemand: "2,600 MW",
    gridStatus: "OPTIMAL (77%)",
    renewableMix: "36.5%",
    breakdown: [
      { name: "Commercial & IT", value: 46, color: "#38bdf8" },
      { name: "Residential", value: 30, color: "#818cf8" },
      { name: "Automotive/Mfg", value: 24, color: "#a855f7" }
    ],
    hourlyGridLoad: [
      { time: "00:00", actual: 1450, solar: 0, wind: 380 },
      { time: "04:00", actual: 1380, solar: 0, wind: 410 },
      { time: "08:00", actual: 2150, solar: 290, wind: 360 },
      { time: "12:00", actual: 2550, solar: 680, wind: 340 },
      { time: "16:00", actual: 2420, solar: 490, wind: 370 },
      { time: "20:00", actual: 2580, solar: 0, wind: 480 },
      { time: "23:00", actual: 1980, solar: 0, wind: 430 }
    ],
    sources: [
      { type: "Solar Parks", percentage: 24.5, capacity: "650 MW" },
      { type: "Wind Turbines", percentage: 12.0, capacity: "320 MW" },
      { type: "Hydroelectric", percentage: 16.5, capacity: "440 MW" },
      { type: "Thermal Base", percentage: 47, capacity: "1,250 MW" }
    ]
  },
  bangalore: {
    totalConsumption: "4,680 MW",
    peakDemand: "5,100 MW",
    gridStatus: "HIGH LOAD (86%)",
    renewableMix: "42.0%",
    breakdown: [
      { name: "Tech Campuses", value: 50, color: "#38bdf8" },
      { name: "Residential", value: 32, color: "#818cf8" },
      { name: "Aerospace/Mfg", value: 18, color: "#a855f7" }
    ],
    hourlyGridLoad: [
      { time: "00:00", actual: 2900, solar: 0, wind: 680 },
      { time: "04:00", actual: 2750, solar: 0, wind: 740 },
      { time: "08:00", actual: 4100, solar: 520, wind: 690 },
      { time: "12:00", actual: 4980, solar: 1350, wind: 610 },
      { time: "16:00", actual: 4720, solar: 980, wind: 650 },
      { time: "20:00", actual: 5050, solar: 0, wind: 880 },
      { time: "23:00", actual: 3820, solar: 0, wind: 810 }
    ],
    sources: [
      { type: "Pavagada Solar Link", percentage: 28, capacity: "1,450 MW" },
      { type: "Wind Farm Corridor", percentage: 14, capacity: "720 MW" },
      { type: "Hydro Pumped", percentage: 18, capacity: "930 MW" },
      { type: "Clean Grid Imports", percentage: 40, capacity: "2,060 MW" }
    ]
  },
  delhi: {
    totalConsumption: "7,850 MW",
    peakDemand: "8,650 MW",
    gridStatus: "CRITICAL PEAK (88%)",
    renewableMix: "22.0%",
    breakdown: [
      { name: "Commercial & Govt", value: 45, color: "#38bdf8" },
      { name: "Residential", value: 38, color: "#818cf8" },
      { name: "Heavy Industry", value: 17, color: "#a855f7" }
    ],
    hourlyGridLoad: [
      { time: "00:00", actual: 5200, solar: 0, wind: 510 },
      { time: "04:00", actual: 4800, solar: 0, wind: 540 },
      { time: "08:00", actual: 6900, solar: 620, wind: 490 },
      { time: "12:00", actual: 8400, solar: 1480, wind: 460 },
      { time: "16:00", actual: 8100, solar: 940, wind: 480 },
      { time: "20:00", actual: 8620, solar: 0, wind: 620 },
      { time: "23:00", actual: 6800, solar: 0, wind: 580 }
    ],
    sources: [
      { type: "Rooftop Solar & Rewa", percentage: 16, capacity: "1,400 MW" },
      { type: "Waste-to-Energy", percentage: 6, capacity: "520 MW" },
      { type: "Interstate Hydro", percentage: 14, capacity: "1,220 MW" },
      { type: "Thermal / Gas Turbines", percentage: 64, capacity: "5,580 MW" }
    ]
  }
};
