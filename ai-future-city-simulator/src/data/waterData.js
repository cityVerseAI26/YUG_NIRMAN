export const WATER_DATA = {
  mumbai: {
    currentDemand: "3,850 MLD",
    reservoirCapacity: "1,447,000 ML (78%)",
    dailyUsage: "3,720 MLD",
    weeklyAverage: "3,690 MLD",
    status: "MODERATE",
    recycleRate: "22%",
    lakes: [
      { name: "Bhatsa Lake", level: 82, capacity: "717,000 ML" },
      { name: "Upper Vaitarna", level: 79, capacity: "227,000 ML" },
      { name: "Middle Vaitarna", level: 76, capacity: "193,000 ML" },
      { name: "Modak Sagar", level: 74, capacity: "128,000 ML" },
      { name: "Tansa Lake", level: 71, capacity: "145,000 ML" }
    ],
    weeklyTrend: [
      { day: "Mon", consumption: 3680, target: 3600 },
      { day: "Tue", consumption: 3710, target: 3600 },
      { day: "Wed", consumption: 3690, target: 3600 },
      { day: "Thu", consumption: 3740, target: 3600 },
      { day: "Fri", consumption: 3780, target: 3600 },
      { day: "Sat", consumption: 3820, target: 3600 },
      { day: "Sun", consumption: 3850, target: 3600 }
    ]
  },
  thane: {
    currentDemand: "520 MLD",
    reservoirCapacity: "210,000 ML (74%)",
    dailyUsage: "505 MLD",
    weeklyAverage: "498 MLD",
    status: "OPTIMAL",
    recycleRate: "26%",
    lakes: [
      { name: "Barvi Dam", level: 78, capacity: "115,000 ML" },
      { name: "STEM Water Supply", level: 74, capacity: "55,000 ML" },
      { name: "Upvan / Local Lakes", level: 68, capacity: "40,000 ML" }
    ],
    weeklyTrend: [
      { day: "Mon", consumption: 495, target: 490 },
      { day: "Tue", consumption: 500, target: 490 },
      { day: "Wed", consumption: 498, target: 490 },
      { day: "Thu", consumption: 504, target: 490 },
      { day: "Fri", consumption: 512, target: 490 },
      { day: "Sat", consumption: 518, target: 490 },
      { day: "Sun", consumption: 520, target: 490 }
    ]
  },
  pune: {
    currentDemand: "1,550 MLD",
    reservoirCapacity: "680,000 ML (71%)",
    dailyUsage: "1,510 MLD",
    weeklyAverage: "1,490 MLD",
    status: "OPTIMAL",
    recycleRate: "31%",
    lakes: [
      { name: "Khadakwasla Dam", level: 75, capacity: "197,000 ML" },
      { name: "Panshet Dam", level: 72, capacity: "212,000 ML" },
      { name: "Varasgaon Dam", level: 70, capacity: "235,000 ML" },
      { name: "Temghar Dam", level: 66, capacity: "36,000 ML" }
    ],
    weeklyTrend: [
      { day: "Mon", consumption: 1480, target: 1470 },
      { day: "Tue", consumption: 1495, target: 1470 },
      { day: "Wed", consumption: 1502, target: 1470 },
      { day: "Thu", consumption: 1515, target: 1470 },
      { day: "Fri", consumption: 1528, target: 1470 },
      { day: "Sat", consumption: 1545, target: 1470 },
      { day: "Sun", consumption: 1550, target: 1470 }
    ]
  },
  bangalore: {
    currentDemand: "2,100 MLD",
    reservoirCapacity: "480,000 ML (89% STRESSED)",
    dailyUsage: "2,040 MLD",
    weeklyAverage: "2,010 MLD",
    status: "CRITICAL",
    recycleRate: "38%",
    lakes: [
      { name: "Cauvery Stage IV", level: 62, capacity: "250,000 ML" },
      { name: "Tippagondanahalli", level: 48, capacity: "90,000 ML" },
      { name: "Hesaraghatta", level: 42, capacity: "50,000 ML" },
      { name: "Treated Reclaimed Grid", level: 85, capacity: "90,000 ML" }
    ],
    weeklyTrend: [
      { day: "Mon", consumption: 1990, target: 1900 },
      { day: "Tue", consumption: 2020, target: 1900 },
      { day: "Wed", consumption: 2015, target: 1900 },
      { day: "Thu", consumption: 2050, target: 1900 },
      { day: "Fri", consumption: 2080, target: 1900 },
      { day: "Sat", consumption: 2110, target: 1900 },
      { day: "Sun", consumption: 2100, target: 1900 }
    ]
  },
  delhi: {
    currentDemand: "4,450 MLD",
    reservoirCapacity: "920,000 ML (85%)",
    dailyUsage: "4,380 MLD",
    weeklyAverage: "4,320 MLD",
    status: "HIGH DEMAND",
    recycleRate: "28%",
    lakes: [
      { name: "Wazirabad / Yamuna Pond", level: 69, capacity: "280,000 ML" },
      { name: "Sonia Vihar Pipeline", level: 74, capacity: "240,000 ML" },
      { name: "Bhakra Storage Allocation", level: 78, capacity: "310,000 ML" },
      { name: "Ranney Wells Network", level: 61, capacity: "90,000 ML" }
    ],
    weeklyTrend: [
      { day: "Mon", consumption: 4290, target: 4200 },
      { day: "Tue", consumption: 4320, target: 4200 },
      { day: "Wed", consumption: 4310, target: 4200 },
      { day: "Thu", consumption: 4370, target: 4200 },
      { day: "Fri", consumption: 4410, target: 4200 },
      { day: "Sat", consumption: 4460, target: 4200 },
      { day: "Sun", consumption: 4450, target: 4200 }
    ]
  }
};
