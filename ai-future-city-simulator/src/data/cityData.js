import { ADDITIONAL_CITIES } from "./additionalCities.js";
import { POPULATION_ESTIMATES_2026 } from "./populationEstimates2026.js";

export const CITIES = {
  mumbai: {
    id: "mumbai",
    name: "Mumbai",
    state: "Maharashtra",
    tagline: "Financial Capital & Coastal Megacity",
    coordinates: [19.0760, 72.8777],
    zoom: 12,
    metrics: {
      population: {
        value: 12500000,
        display: "12.5M",
        change: "+4.2%",
        trend: "up",
        status: "OPTIMAL",
        sparkline: [11.8, 11.9, 12.1, 12.2, 12.3, 12.5]
      },
      traffic: {
        value: 72,
        display: "72%",
        change: "+5.1%",
        trend: "up",
        status: "HIGH",
        sparkline: [45, 62, 78, 70, 72, 85]
      },
      aqi: {
        value: 156,
        display: "156 AQI",
        change: "-2.4%",
        trend: "down",
        status: "POOR",
        sparkline: [140, 162, 175, 160, 158, 156]
      },
      waterDemand: {
        value: 78,
        display: "78%",
        change: "+1.8%",
        trend: "up",
        status: "MODERATE",
        sparkline: [70, 72, 75, 76, 77, 78]
      },
      energyUsage: {
        value: 82,
        display: "82%",
        change: "+3.6%",
        trend: "up",
        status: "HIGH",
        sparkline: [74, 76, 79, 81, 80, 82]
      },
      greenCover: {
        value: 24,
        display: "24%",
        change: "+0.8%",
        trend: "up",
        status: "GOOD",
        sparkline: [22, 22.5, 23, 23.2, 23.8, 24]
      }
    },
    healthScore: {
      overall: 76,
      status: "GOOD",
      grade: "A-",
      breakdown: [
        { label: "Traffic Flow", score: 72, color: "text-amber-400", bg: "bg-amber-400" },
        { label: "Environment & AQI", score: 68, color: "text-rose-400", bg: "bg-rose-400" },
        { label: "Infrastructure", score: 84, color: "text-cyan-400", bg: "bg-cyan-400" },
        { label: "Resource Utility", score: 79, color: "text-blue-400", bg: "bg-blue-400" },
        { label: "Safety & Resilience", score: 77, color: "text-emerald-400", bg: "bg-emerald-400" }
      ]
    },
    zones: [
      {
        id: "z-mum-1",
        name: "Andheri West Corridor",
        category: "traffic",
        coords: [19.1197, 72.8464],
        traffic: "HIGH (88%)",
        aqi: 168,
        density: "HIGH",
        risk: "MEDIUM",
        desc: "Severe peak congestion at SV Road junction. AI signal tuning active."
      },
      {
        id: "z-mum-2",
        name: "Bandra-Kurla Complex (BKC)",
        category: "industrial",
        coords: [19.0664, 72.8687],
        traffic: "MODERATE (64%)",
        aqi: 145,
        density: "VERY HIGH",
        risk: "LOW",
        desc: "Commercial hub smart grid load at 91% capacity."
      },
      {
        id: "z-mum-3",
        name: "Lilavati Trauma & Research Hub",
        category: "hospital",
        coords: [19.0519, 72.8290],
        traffic: "LOW (35%)",
        aqi: 130,
        density: "MEDIUM",
        risk: "LOW",
        desc: "Emergency corridor clear. 45 ICU beds available."
      },
      {
        id: "z-mum-4",
        name: "IIT Bombay Academic Zone",
        category: "school",
        coords: [19.1334, 72.9133],
        traffic: "LOW (28%)",
        aqi: 112,
        density: "MEDIUM",
        risk: "LOW",
        desc: "Zero emission green campus area with solar microgrid."
      },
      {
        id: "z-mum-5",
        name: "Sanjay Gandhi National Park",
        category: "green",
        coords: [19.2215, 72.9126],
        traffic: "MINIMAL (12%)",
        aqi: 58,
        density: "LOW",
        risk: "LOW",
        desc: "Protected ecological reserve providing 24% of city carbon sink."
      },
      {
        id: "z-mum-6",
        name: "Mithi River Estuary & Kurla Basin",
        category: "flood",
        coords: [19.0728, 72.8797],
        traffic: "MODERATE (52%)",
        aqi: 172,
        density: "HIGH",
        risk: "HIGH",
        desc: "Monsoon flood warning level 2. High tide catchment alert."
      }
    ],
    forecasts: {
      2027: { population: "13.2M", traffic: "76%", aqi: 162, waterDemand: "81%", energyUsage: "85%", change: "+5.6%" },
      2030: { population: "14.8M", traffic: "81%", aqi: 174, waterDemand: "88%", energyUsage: "89%", change: "+18.4%" },
      2035: { population: "16.5M", traffic: "88%", aqi: 190, waterDemand: "94%", energyUsage: "91%", change: "+32.0%" },
      2040: { population: "18.2M", traffic: "92%", aqi: 198, waterDemand: "98%", energyUsage: "96%", change: "+45.6%" }
    }
  },
  thane: {
    id: "thane",
    name: "Thane",
    state: "Maharashtra",
    tagline: "Lake City & Rapid Urbanizing Hub",
    coordinates: [19.2183, 72.9781],
    zoom: 12,
    metrics: {
      population: {
        value: 2400000,
        display: "2.4M",
        change: "+5.8%",
        trend: "up",
        status: "RAPID_GROWTH",
        sparkline: [2.1, 2.18, 2.24, 2.3, 2.35, 2.4]
      },
      traffic: {
        value: 65,
        display: "65%",
        change: "+3.2%",
        trend: "up",
        status: "MODERATE",
        sparkline: [40, 52, 68, 62, 65, 74]
      },
      aqi: {
        value: 138,
        display: "138 AQI",
        change: "-4.1%",
        trend: "down",
        status: "MODERATE",
        sparkline: [155, 150, 145, 142, 140, 138]
      },
      waterDemand: {
        value: 74,
        display: "74%",
        change: "+2.5%",
        trend: "up",
        status: "MODERATE",
        sparkline: [65, 68, 70, 71, 73, 74]
      },
      energyUsage: {
        value: 75,
        display: "75%",
        change: "+4.1%",
        trend: "up",
        status: "MODERATE",
        sparkline: [67, 69, 71, 73, 74, 75]
      },
      greenCover: {
        value: 32,
        display: "32%",
        change: "+1.2%",
        trend: "up",
        status: "GOOD",
        sparkline: [29, 30, 30.5, 31, 31.8, 32]
      }
    },
    healthScore: {
      overall: 80,
      status: "OPTIMAL",
      grade: "A",
      breakdown: [
        { label: "Traffic Flow", score: 76, color: "text-amber-400", bg: "bg-amber-400" },
        { label: "Environment & AQI", score: 74, color: "text-emerald-400", bg: "bg-emerald-400" },
        { label: "Infrastructure", score: 86, color: "text-cyan-400", bg: "bg-cyan-400" },
        { label: "Resource Utility", score: 82, color: "text-blue-400", bg: "bg-blue-400" },
        { label: "Safety & Resilience", score: 82, color: "text-emerald-400", bg: "bg-emerald-400" }
      ]
    },
    zones: [
      {
        id: "z-tha-1",
        name: "Teen Hath Naka Smart Junction",
        category: "traffic",
        coords: [19.1866, 72.9644],
        traffic: "HIGH (79%)",
        aqi: 142,
        density: "HIGH",
        risk: "LOW",
        desc: "Key highway convergence node. AI dynamic light intervals operational."
      },
      {
        id: "z-tha-2",
        name: "Wagle Industrial Estate",
        category: "industrial",
        coords: [19.1982, 72.9463],
        traffic: "MODERATE (60%)",
        aqi: 154,
        density: "HIGH",
        risk: "MEDIUM",
        desc: "IT & manufacturing zone. Rooftop solar generation meets 38% load."
      },
      {
        id: "z-tha-3",
        name: "Jupiter Super Speciality Hospital",
        category: "hospital",
        coords: [19.2064, 72.9734],
        traffic: "LOW (32%)",
        aqi: 122,
        density: "MEDIUM",
        risk: "LOW",
        desc: "Dedicated green transit lane active along Eastern Express corridor."
      },
      {
        id: "z-tha-4",
        name: "Upvan Lake & Eco Belt",
        category: "green",
        coords: [19.2241, 72.9647],
        traffic: "LOW (22%)",
        aqi: 64,
        density: "LOW",
        risk: "LOW",
        desc: "Biodiversity preservation zone. Water quality index at 86/100."
      },
      {
        id: "z-tha-5",
        name: "Kalwa Creek Waterway",
        category: "flood",
        coords: [19.2033, 72.9972],
        traffic: "MODERATE (55%)",
        aqi: 148,
        density: "HIGH",
        risk: "MEDIUM",
        desc: "Tidal surge sensor reporting normal water level +0.8m above datum."
      }
    ],
    forecasts: {
      2027: { population: "2.6M", traffic: "69%", aqi: 142, waterDemand: "78%", energyUsage: "79%", change: "+8.3%" },
      2030: { population: "3.1M", traffic: "74%", aqi: 151, waterDemand: "84%", energyUsage: "86%", change: "+29.1%" },
      2035: { population: "3.7M", traffic: "80%", aqi: 165, waterDemand: "89%", energyUsage: "92%", change: "+54.1%" },
      2040: { population: "4.4M", traffic: "85%", aqi: 172, waterDemand: "93%", energyUsage: "95%", change: "+83.3%" }
    }
  },
  pune: {
    id: "pune",
    name: "Pune",
    state: "Maharashtra",
    tagline: "Education & Innovation Tech Hub",
    coordinates: [18.5204, 73.8567],
    zoom: 12,
    metrics: {
      population: {
        value: 4100000,
        display: "4.1M",
        change: "+4.9%",
        trend: "up",
        status: "OPTIMAL",
        sparkline: [3.6, 3.7, 3.82, 3.9, 4.0, 4.1]
      },
      traffic: {
        value: 68,
        display: "68%",
        change: "+2.8%",
        trend: "up",
        status: "HIGH",
        sparkline: [42, 58, 72, 65, 68, 80]
      },
      aqi: {
        value: 128,
        display: "128 AQI",
        change: "-3.2%",
        trend: "down",
        status: "MODERATE",
        sparkline: [142, 138, 135, 131, 130, 128]
      },
      waterDemand: {
        value: 71,
        display: "71%",
        change: "+1.4%",
        trend: "up",
        status: "GOOD",
        sparkline: [66, 68, 69, 70, 70.5, 71]
      },
      energyUsage: {
        value: 77,
        display: "77%",
        change: "+3.1%",
        trend: "up",
        status: "MODERATE",
        sparkline: [70, 72, 73, 75, 76, 77]
      },
      greenCover: {
        value: 29,
        display: "29%",
        change: "+1.5%",
        trend: "up",
        status: "GOOD",
        sparkline: [26, 27, 27.5, 28, 28.5, 29]
      }
    },
    healthScore: {
      overall: 82,
      status: "OPTIMAL",
      grade: "A",
      breakdown: [
        { label: "Traffic Flow", score: 74, color: "text-amber-400", bg: "bg-amber-400" },
        { label: "Environment & AQI", score: 78, color: "text-cyan-400", bg: "bg-cyan-400" },
        { label: "Infrastructure", score: 88, color: "text-cyan-400", bg: "bg-cyan-400" },
        { label: "Resource Utility", score: 85, color: "text-blue-400", bg: "bg-blue-400" },
        { label: "Safety & Resilience", score: 85, color: "text-emerald-400", bg: "bg-emerald-400" }
      ]
    },
    zones: [
      {
        id: "z-pun-1",
        name: "Hinjawadi IT Park Phase 1",
        category: "industrial",
        coords: [18.5913, 73.7389],
        traffic: "HIGH (84%)",
        aqi: 134,
        density: "VERY HIGH",
        risk: "LOW",
        desc: "Autonomous shuttle pilot running along Rajiv Gandhi Infotech corridor."
      },
      {
        id: "z-pun-2",
        name: "Shivajinagar Interchange",
        category: "traffic",
        coords: [18.5314, 73.8446],
        traffic: "HIGH (76%)",
        aqi: 140,
        density: "HIGH",
        risk: "LOW",
        desc: "Metro Line 3 multimodal integration zone."
      },
      {
        id: "z-pun-3",
        name: "Savitribai Phule Pune University",
        category: "school",
        coords: [18.5529, 73.8260],
        traffic: "LOW (25%)",
        aqi: 88,
        density: "MEDIUM",
        risk: "LOW",
        desc: "411-acre forested academic campus, urban heat refuge."
      },
      {
        id: "z-pun-4",
        name: "Mula-Mutha River Confluence",
        category: "flood",
        coords: [18.5312, 73.8732],
        traffic: "MODERATE (52%)",
        aqi: 132,
        density: "HIGH",
        risk: "MEDIUM",
        desc: "Riverfront rejuvenation telemetry monitoring dissolved oxygen levels."
      }
    ],
    forecasts: {
      2027: { population: "4.4M", traffic: "72%", aqi: 133, waterDemand: "75%", energyUsage: "81%", change: "+7.3%" },
      2030: { population: "5.0M", traffic: "77%", aqi: 141, waterDemand: "82%", energyUsage: "87%", change: "+21.9%" },
      2035: { population: "5.9M", traffic: "83%", aqi: 153, waterDemand: "88%", energyUsage: "92%", change: "+43.9%" },
      2040: { population: "6.8M", traffic: "87%", aqi: 162, waterDemand: "93%", energyUsage: "95%", change: "+65.8%" }
    }
  },
  bangalore: {
    id: "bangalore",
    name: "Bangalore",
    state: "Karnataka",
    tagline: "Silicon Valley of India",
    coordinates: [12.9716, 77.5946],
    zoom: 12,
    metrics: {
      population: {
        value: 13200000,
        display: "13.2M",
        change: "+5.4%",
        trend: "up",
        status: "RAPID_GROWTH",
        sparkline: [11.5, 11.9, 12.3, 12.6, 12.9, 13.2]
      },
      traffic: {
        value: 84,
        display: "84%",
        change: "+6.8%",
        trend: "up",
        status: "CRITICAL",
        sparkline: [55, 75, 88, 82, 84, 94]
      },
      aqi: {
        value: 112,
        display: "112 AQI",
        change: "+1.2%",
        trend: "up",
        status: "MODERATE",
        sparkline: [105, 108, 115, 110, 111, 112]
      },
      waterDemand: {
        value: 89,
        display: "89%",
        change: "+6.2%",
        trend: "up",
        status: "HIGH",
        sparkline: [78, 81, 84, 86, 88, 89]
      },
      energyUsage: {
        value: 86,
        display: "86%",
        change: "+4.5%",
        trend: "up",
        status: "HIGH",
        sparkline: [79, 81, 83, 85, 85.5, 86]
      },
      greenCover: {
        value: 21,
        display: "21%",
        change: "-1.1%",
        trend: "down",
        status: "MODERATE",
        sparkline: [24, 23.5, 22.8, 22.1, 21.5, 21]
      }
    },
    healthScore: {
      overall: 73,
      status: "GOOD",
      grade: "B+",
      breakdown: [
        { label: "Traffic Flow", score: 62, color: "text-rose-400", bg: "bg-rose-400" },
        { label: "Environment & AQI", score: 79, color: "text-emerald-400", bg: "bg-emerald-400" },
        { label: "Infrastructure", score: 82, color: "text-cyan-400", bg: "bg-cyan-400" },
        { label: "Resource Utility", score: 68, color: "text-rose-400", bg: "bg-rose-400" },
        { label: "Safety & Resilience", score: 76, color: "text-emerald-400", bg: "bg-emerald-400" }
      ]
    },
    zones: [
      {
        id: "z-blr-1",
        name: "Silk Board Junction & ORR",
        category: "traffic",
        coords: [12.9177, 77.6238],
        traffic: "CRITICAL (95%)",
        aqi: 145,
        density: "EXTREME",
        risk: "HIGH",
        desc: "Bottleneck node. Adaptive ramp metering engaged by City Traffic AI."
      },
      {
        id: "z-blr-2",
        name: "Electronic City Tech Corridor",
        category: "industrial",
        coords: [12.8399, 77.6770],
        traffic: "MODERATE (68%)",
        aqi: 110,
        density: "HIGH",
        risk: "LOW",
        desc: "Dedicated elevated expressway and IoT street illumination network."
      },
      {
        id: "z-blr-3",
        name: "Cubbon Park Green Sanctuary",
        category: "green",
        coords: [12.9763, 77.5929],
        traffic: "LOW (15%)",
        aqi: 48,
        density: "LOW",
        risk: "LOW",
        desc: "Central 300-acre oxygen oasis with ambient acoustic monitors."
      },
      {
        id: "z-blr-4",
        name: "Bellandur Lake Catchment",
        category: "flood",
        coords: [12.9352, 77.6698],
        traffic: "HIGH (78%)",
        aqi: 138,
        density: "HIGH",
        risk: "HIGH",
        desc: "Wetland restoration sensors detecting runoff nitrogen reduction."
      }
    ],
    forecasts: {
      2027: { population: "14.2M", traffic: "89%", aqi: 120, waterDemand: "93%", energyUsage: "90%", change: "+7.5%" },
      2030: { population: "16.1M", traffic: "93%", aqi: 132, waterDemand: "97%", energyUsage: "95%", change: "+21.9%" },
      2035: { population: "18.5M", traffic: "96%", aqi: 148, waterDemand: "102%", energyUsage: "98%", change: "+40.1%" },
      2040: { population: "20.8M", traffic: "98%", aqi: 160, waterDemand: "108%", energyUsage: "102%", change: "+57.5%" }
    }
  },
  delhi: {
    id: "delhi",
    name: "Delhi",
    state: "National Capital Region",
    tagline: "National Capital & Historic Metropolis",
    coordinates: [28.6139, 77.2090],
    zoom: 12,
    metrics: {
      population: {
        value: 21500000,
        display: "21.5M",
        change: "+3.9%",
        trend: "up",
        status: "OPTIMAL",
        sparkline: [20.1, 20.4, 20.7, 21.0, 21.2, 21.5]
      },
      traffic: {
        value: 79,
        display: "79%",
        change: "+4.4%",
        trend: "up",
        status: "HIGH",
        sparkline: [52, 68, 82, 75, 79, 90]
      },
      aqi: {
        value: 268,
        display: "268 AQI",
        change: "+12.1%",
        trend: "up",
        status: "DANGEROUS",
        sparkline: [210, 225, 240, 255, 260, 268]
      },
      waterDemand: {
        value: 85,
        display: "85%",
        change: "+3.4%",
        trend: "up",
        status: "HIGH",
        sparkline: [76, 79, 81, 83, 84, 85]
      },
      energyUsage: {
        value: 88,
        display: "88%",
        change: "+5.1%",
        trend: "up",
        status: "HIGH",
        sparkline: [80, 82, 84, 86, 87, 88]
      },
      greenCover: {
        value: 23,
        display: "23%",
        change: "+0.4%",
        trend: "up",
        status: "GOOD",
        sparkline: [21, 21.5, 22, 22.4, 22.8, 23]
      }
    },
    healthScore: {
      overall: 67,
      status: "WARNING",
      grade: "C+",
      breakdown: [
        { label: "Traffic Flow", score: 66, color: "text-amber-400", bg: "bg-amber-400" },
        { label: "Environment & AQI", score: 42, color: "text-rose-500", bg: "bg-rose-500" },
        { label: "Infrastructure", score: 86, color: "text-cyan-400", bg: "bg-cyan-400" },
        { label: "Resource Utility", score: 72, color: "text-amber-400", bg: "bg-amber-400" },
        { label: "Safety & Resilience", score: 70, color: "text-amber-400", bg: "bg-amber-400" }
      ]
    },
    zones: [
      {
        id: "z-del-1",
        name: "Connaught Place Central Hub",
        category: "traffic",
        coords: [28.6315, 77.2167],
        traffic: "HIGH (82%)",
        aqi: 245,
        density: "VERY HIGH",
        risk: "MEDIUM",
        desc: "Radial road network operating under automated EV-only lane protocols."
      },
      {
        id: "z-del-2",
        name: "Okhla Industrial Area",
        category: "industrial",
        coords: [28.5307, 77.2711],
        traffic: "HIGH (75%)",
        aqi: 310,
        density: "HIGH",
        risk: "HIGH",
        desc: "Waste-to-energy plant telemetry active. Smog gun suppression deployed."
      },
      {
        id: "z-del-3",
        name: "AIIMS New Delhi Medical Center",
        category: "hospital",
        coords: [28.5672, 77.2100],
        traffic: "MODERATE (58%)",
        aqi: 215,
        density: "HIGH",
        risk: "LOW",
        desc: "Autonomous medical logistics drones active on Ring Road corridor."
      },
      {
        id: "z-del-4",
        name: "Delhi Ridge Ecological Reserve",
        category: "green",
        coords: [28.5982, 77.1724],
        traffic: "LOW (18%)",
        aqi: 140,
        density: "LOW",
        risk: "LOW",
        desc: "Crucial green lungs absorbing 1.2M tons of CO2 annually."
      }
    ],
    forecasts: {
      2027: { population: "22.8M", traffic: "84%", aqi: 285, waterDemand: "89%", energyUsage: "91%", change: "+6.0%" },
      2030: { population: "25.2M", traffic: "89%", aqi: 310, waterDemand: "94%", energyUsage: "96%", change: "+17.2%" },
      2035: { population: "28.5M", traffic: "94%", aqi: 335, waterDemand: "99%", energyUsage: "101%", change: "+32.5%" },
      2040: { population: "32.0M", traffic: "98%", aqi: 350, waterDemand: "105%", energyUsage: "106%", change: "+48.8%" }
    }
  }
};

// Preserve the five hand-curated demo profiles above. Other catalog cities use
// an explicitly illustrative dashboard profile while their map uses the
// selected city's actual coordinates and public map/air-quality data sources.
for (const city of ADDITIONAL_CITIES) {
  if (CITIES[city.id]) continue;
  CITIES[city.id] = {
    ...CITIES.mumbai,
    ...city,
    tagline: `${city.state}, ${city.country}`,
    zoom: 12,
    dataMode: "illustrative",
    metrics: structuredClone(CITIES.mumbai.metrics),
    healthScore: structuredClone(CITIES.mumbai.healthScore),
    zones: [],
    forecasts: structuredClone(CITIES.mumbai.forecasts),
  };
}

for (const city of Object.values(CITIES)) {
  city.country ||= "India";
  city.dataMode ||= "demo";
  const populationEstimate = POPULATION_ESTIMATES_2026[city.id];
  if (populationEstimate) {
    city.metrics.population = {
      ...city.metrics.population,
      value: populationEstimate.population,
      display: `${(populationEstimate.population / 1_000_000).toFixed(1)}M`,
    };
  }
}
