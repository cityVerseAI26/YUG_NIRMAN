export const INITIAL_ALERTS = {
  mumbai: [
    {
      id: "alt-mum-1",
      priority: "high",
      title: "Severe Traffic Gridlock",
      description: "Severe bottleneck detected at Andheri Western Express Flyover. Average vehicle speed dropped to 9 km/h.",
      location: "Andheri West Corridor",
      timestamp: "4 mins ago",
      category: "Transportation",
      read: false
    },
    {
      id: "alt-mum-2",
      priority: "warning",
      title: "Air Quality Spike",
      description: "PM2.5 micro-particles exceeded 170 µg/m³ around Powai Lake construction perimeter.",
      location: "Powai Central",
      timestamp: "18 mins ago",
      category: "Environment",
      read: false
    },
    {
      id: "alt-mum-3",
      priority: "medium",
      title: "High Tide Catchment Warning",
      description: "Mithi River floodgate sensors alert: Tidal swell approaching 4.4 meters. Sump pumps primed.",
      location: "Kurla Basin",
      timestamp: "42 mins ago",
      category: "Flood / Climate",
      read: false
    },
    {
      id: "alt-mum-4",
      priority: "normal",
      title: "Metro Line 3 Optimal Transit",
      description: "Multimodal underground trains operating with 99.4% punctuality, carrying 42,000 commuters/hr.",
      location: "Colaba-SEEPZ Line",
      timestamp: "1 hour ago",
      category: "Infrastructure",
      read: true
    }
  ],
  thane: [
    {
      id: "alt-tha-1",
      priority: "warning",
      title: "Substation Thermal Surge",
      description: "Wagle Estate Transformer T-4 telemetry reporting 84°C under heavy afternoon industrial draw.",
      location: "Wagle Industrial Sector",
      timestamp: "8 mins ago",
      category: "Energy",
      read: false
    },
    {
      id: "alt-tha-2",
      priority: "medium",
      title: "Elevated Water Inflow Pressure",
      description: "Barvi Dam trunk line conduit sensor #12 indicating 4.8 bar pressure fluctuation.",
      location: "Ghodbunder Pipeline",
      timestamp: "25 mins ago",
      category: "Resources",
      read: false
    },
    {
      id: "alt-tha-3",
      priority: "normal",
      title: "Lake Aeration Autonomous Sweep",
      description: "Upvan Lake solar skimming vessels completed dissolved oxygen restoration cycle.",
      location: "Upvan Lake Eco Belt",
      timestamp: "1.5 hours ago",
      category: "Environment",
      read: true
    }
  ],
  pune: [
    {
      id: "alt-pun-1",
      priority: "high",
      title: "Hinjawadi Flyover Congestion",
      description: "Phase 1 roundabout backup extending 2.4 km toward Wakad bridge. Dynamic green signals engaged.",
      location: "Hinjawadi Tech Park",
      timestamp: "12 mins ago",
      category: "Transportation",
      read: false
    },
    {
      id: "alt-pun-2",
      priority: "medium",
      title: "Riverfront Dissolved Oxygen Dip",
      description: "Mula River sensor M-04 reading 4.1 mg/L near Sangam Bridge after storm runoff.",
      location: "Mula-Mutha Confluence",
      timestamp: "38 mins ago",
      category: "Environment",
      read: false
    },
    {
      id: "alt-pun-3",
      priority: "normal",
      title: "Smart Solar Canopy Generation Peak",
      description: "Municipal building microgrids fed 128 MWh clean energy into regional ring circuit.",
      location: "Shivajinagar District",
      timestamp: "2 hours ago",
      category: "Energy",
      read: true
    }
  ],
  bangalore: [
    {
      id: "alt-blr-1",
      priority: "high",
      title: "Critical Bottleneck at Silk Board",
      description: "Outer Ring Road junction delay index is 9.4/10. Spillover affecting HSR Layout access routes.",
      location: "Silk Board - ORR",
      timestamp: "2 mins ago",
      category: "Transportation",
      read: false
    },
    {
      id: "alt-blr-2",
      priority: "warning",
      title: "Groundwater Depletion Alert",
      description: "East Zone telemetry indicates shallow aquifer extraction rate at 182% replenishment pace.",
      location: "Whitefield Watershed",
      timestamp: "22 mins ago",
      category: "Resources",
      read: false
    },
    {
      id: "alt-blr-3",
      priority: "normal",
      title: "Namma Metro Purple Line Surge Mode",
      description: "Train frequency shortened to 3.5 min headway to absorb IT corridor peak passenger surge.",
      location: "Indiranagar - Whitefield",
      timestamp: "55 mins ago",
      category: "Transportation",
      read: true
    }
  ],
  delhi: [
    {
      id: "alt-del-1",
      priority: "high",
      title: "Air Quality Hazard Warning",
      description: "Severe atmospheric inversion trapped PM2.5 at 310 µg/m³ in Anand Vihar & Okhla corridor.",
      location: "Anand Vihar Hub",
      timestamp: "5 mins ago",
      category: "Environment",
      read: false
    },
    {
      id: "alt-del-2",
      priority: "warning",
      title: "Peak Grid Load Threshold Alert",
      description: "Citywide air conditioning cooling demand reached 8,240 MW. Auxiliary gas turbines fired.",
      location: "Trans-Yamuna Substation",
      timestamp: "16 mins ago",
      category: "Energy",
      read: false
    },
    {
      id: "alt-del-3",
      priority: "medium",
      title: "Ring Road Multi-Vehicle Breakdown",
      description: "Freight carrier stoppage cleared near Ashram flyover; residual backlog dissolving.",
      location: "Ashram Chowk",
      timestamp: "45 mins ago",
      category: "Transportation",
      read: false
    },
    {
      id: "alt-del-4",
      priority: "normal",
      title: "Smog Cannon Fleet Deployment",
      description: "24 anti-smog autonomous mobile mist cannons dispatched across primary radial arterials.",
      location: "Central Ridge Perimeter",
      timestamp: "1.2 hours ago",
      category: "Environment",
      read: true
    }
  ]
};

export const createSampleAlertTemplates = (city) => [
  {
    id: `${city.id}-template-transport`,
    priority: "medium",
    title: "Traffic conditions review",
    description: "Example alert template for reviewing congestion on a monitored corridor. Connect a verified traffic feed to show current conditions.",
    location: "Citywide template",
    timestamp: "Template",
    category: "Transportation",
    read: false,
  },
  {
    id: `${city.id}-template-environment`,
    priority: "warning",
    title: "Air quality monitoring notice",
    description: "Example alert template for an air-quality threshold notice. No current reading or local monitoring station is connected here.",
    location: "Citywide template",
    timestamp: "Template",
    category: "Environment",
    read: false,
  },
  {
    id: `${city.id}-template-resources`,
    priority: "medium",
    title: "Water and infrastructure review",
    description: "Example alert template for utility planning and infrastructure review. Connect verified municipal data before treating this as an active alert.",
    location: "Citywide template",
    timestamp: "Template",
    category: "Resources",
    read: false,
  },
];
