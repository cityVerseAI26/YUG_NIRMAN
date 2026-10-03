export const TRAFFIC_DATA = {
  mumbai: {
    today: [
      { time: "06:00", congestion: 24, speed: 48, vehicles: 12400 },
      { time: "07:00", congestion: 38, speed: 42, vehicles: 21200 },
      { time: "08:00", congestion: 68, speed: 29, vehicles: 45800 },
      { time: "09:00", congestion: 89, speed: 18, vehicles: 62400 },
      { time: "10:00", congestion: 84, speed: 22, vehicles: 58900 },
      { time: "11:00", congestion: 66, speed: 31, vehicles: 41200 },
      { time: "12:00", congestion: 58, speed: 34, vehicles: 36800 },
      { time: "13:00", congestion: 52, speed: 37, vehicles: 33400 },
      { time: "14:00", congestion: 55, speed: 36, vehicles: 35100 },
      { time: "15:00", congestion: 61, speed: 32, vehicles: 39500 },
      { time: "16:00", congestion: 71, speed: 27, vehicles: 48600 },
      { time: "17:00", congestion: 85, speed: 20, vehicles: 59800 },
      { time: "18:00", congestion: 92, speed: 16, vehicles: 68200 },
      { time: "19:00", congestion: 88, speed: 19, vehicles: 64100 },
      { time: "20:00", congestion: 76, speed: 25, vehicles: 52400 },
      { time: "21:00", congestion: 59, speed: 33, vehicles: 38700 },
      { time: "22:00", congestion: 44, speed: 40, vehicles: 26500 },
      { time: "23:00", congestion: 31, speed: 46, vehicles: 17200 }
    ],
    week: [
      { day: "Mon", congestion: 78, speed: 24, peak: "09:15 AM" },
      { day: "Tue", congestion: 76, speed: 26, peak: "09:30 AM" },
      { day: "Wed", congestion: 74, speed: 27, peak: "06:45 PM" },
      { day: "Thu", congestion: 79, speed: 23, peak: "07:00 PM" },
      { day: "Fri", congestion: 86, speed: 19, peak: "07:30 PM" },
      { day: "Sat", congestion: 62, speed: 34, peak: "08:15 PM" },
      { day: "Sun", congestion: 48, speed: 42, peak: "05:00 PM" }
    ],
    month: [
      { week: "Week 1", congestion: 71, incidents: 142 },
      { week: "Week 2", congestion: 75, incidents: 168 },
      { week: "Week 3", congestion: 70, incidents: 129 },
      { week: "Week 4", congestion: 72, incidents: 138 }
    ],
    summary: {
      currentCongestion: "72%",
      peakTime: "7:00 PM",
      averageSpeed: "28 km/h",
      activeBottlenecks: 14,
      aiTunedSignals: 248
    }
  },
  thane: {
    today: [
      { time: "06:00", congestion: 20, speed: 52, vehicles: 8400 },
      { time: "07:00", congestion: 32, speed: 46, vehicles: 15200 },
      { time: "08:00", congestion: 58, speed: 33, vehicles: 31000 },
      { time: "09:00", congestion: 76, speed: 24, vehicles: 42500 },
      { time: "10:00", congestion: 72, speed: 26, vehicles: 39800 },
      { time: "11:00", congestion: 59, speed: 35, vehicles: 29500 },
      { time: "12:00", congestion: 51, speed: 38, vehicles: 26100 },
      { time: "13:00", congestion: 47, speed: 40, vehicles: 24000 },
      { time: "14:00", congestion: 49, speed: 39, vehicles: 25200 },
      { time: "15:00", congestion: 54, speed: 36, vehicles: 28400 },
      { time: "16:00", congestion: 63, speed: 32, vehicles: 34200 },
      { time: "17:00", congestion: 74, speed: 25, vehicles: 41800 },
      { time: "18:00", congestion: 82, speed: 21, vehicles: 48900 },
      { time: "19:00", congestion: 79, speed: 23, vehicles: 46000 },
      { time: "20:00", congestion: 68, speed: 29, vehicles: 37500 },
      { time: "21:00", congestion: 52, speed: 36, vehicles: 28000 },
      { time: "22:00", congestion: 38, speed: 44, vehicles: 19400 },
      { time: "23:00", congestion: 26, speed: 49, vehicles: 12100 }
    ],
    week: [
      { day: "Mon", congestion: 69, speed: 29, peak: "09:00 AM" },
      { day: "Tue", congestion: 67, speed: 30, peak: "09:15 AM" },
      { day: "Wed", congestion: 65, speed: 31, peak: "06:30 PM" },
      { day: "Thu", congestion: 68, speed: 29, peak: "06:45 PM" },
      { day: "Fri", congestion: 74, speed: 26, peak: "07:15 PM" },
      { day: "Sat", congestion: 58, speed: 36, peak: "07:45 PM" },
      { day: "Sun", congestion: 44, speed: 44, peak: "04:30 PM" }
    ],
    month: [
      { week: "Week 1", congestion: 64, incidents: 82 },
      { week: "Week 2", congestion: 67, incidents: 94 },
      { week: "Week 3", congestion: 63, incidents: 78 },
      { week: "Week 4", congestion: 65, incidents: 85 }
    ],
    summary: {
      currentCongestion: "65%",
      peakTime: "6:45 PM",
      averageSpeed: "33 km/h",
      activeBottlenecks: 8,
      aiTunedSignals: 112
    }
  },
  pune: {
    today: [
      { time: "06:00", congestion: 18, speed: 50, vehicles: 9800 },
      { time: "07:00", congestion: 30, speed: 44, vehicles: 17500 },
      { time: "08:00", congestion: 62, speed: 31, vehicles: 36400 },
      { time: "09:00", congestion: 81, speed: 21, vehicles: 49200 },
      { time: "10:00", congestion: 75, speed: 24, vehicles: 44100 },
      { time: "11:00", congestion: 61, speed: 33, vehicles: 32800 },
      { time: "12:00", congestion: 53, speed: 36, vehicles: 29000 },
      { time: "13:00", congestion: 48, speed: 39, vehicles: 26500 },
      { time: "14:00", congestion: 52, speed: 37, vehicles: 28400 },
      { time: "15:00", congestion: 58, speed: 34, vehicles: 31900 },
      { time: "16:00", congestion: 67, speed: 29, vehicles: 38200 },
      { time: "17:00", congestion: 79, speed: 22, vehicles: 47600 },
      { time: "18:00", congestion: 86, speed: 18, vehicles: 54000 },
      { time: "19:00", congestion: 83, speed: 20, vehicles: 51200 },
      { time: "20:00", congestion: 71, speed: 27, vehicles: 41500 },
      { time: "21:00", congestion: 55, speed: 34, vehicles: 30800 },
      { time: "22:00", congestion: 40, speed: 42, vehicles: 21000 },
      { time: "23:00", congestion: 27, speed: 48, vehicles: 13900 }
    ],
    week: [
      { day: "Mon", congestion: 72, speed: 27, peak: "09:10 AM" },
      { day: "Tue", congestion: 70, speed: 28, peak: "09:20 AM" },
      { day: "Wed", congestion: 69, speed: 29, peak: "06:30 PM" },
      { day: "Thu", congestion: 73, speed: 27, peak: "06:50 PM" },
      { day: "Fri", congestion: 80, speed: 22, peak: "07:20 PM" },
      { day: "Sat", congestion: 60, speed: 35, peak: "08:00 PM" },
      { day: "Sun", congestion: 45, speed: 43, peak: "05:15 PM" }
    ],
    month: [
      { week: "Week 1", congestion: 66, incidents: 95 },
      { week: "Week 2", congestion: 70, incidents: 112 },
      { week: "Week 3", congestion: 67, incidents: 91 },
      { week: "Week 4", congestion: 68, incidents: 104 }
    ],
    summary: {
      currentCongestion: "68%",
      peakTime: "6:30 PM",
      averageSpeed: "31 km/h",
      activeBottlenecks: 10,
      aiTunedSignals: 186
    }
  },
  bangalore: {
    today: [
      { time: "06:00", congestion: 28, speed: 42, vehicles: 16800 },
      { time: "07:00", congestion: 46, speed: 35, vehicles: 29400 },
      { time: "08:00", congestion: 78, speed: 20, vehicles: 58000 },
      { time: "09:00", congestion: 96, speed: 12, vehicles: 76500 },
      { time: "10:00", congestion: 92, speed: 14, vehicles: 71200 },
      { time: "11:00", congestion: 79, speed: 21, vehicles: 54900 },
      { time: "12:00", congestion: 71, speed: 25, vehicles: 47200 },
      { time: "13:00", congestion: 66, speed: 28, vehicles: 42800 },
      { time: "14:00", congestion: 69, speed: 26, vehicles: 45300 },
      { time: "15:00", congestion: 75, speed: 23, vehicles: 51200 },
      { time: "16:00", congestion: 84, speed: 18, vehicles: 62400 },
      { time: "17:00", congestion: 93, speed: 13, vehicles: 74800 },
      { time: "18:00", congestion: 98, speed: 10, vehicles: 83500 },
      { time: "19:00", congestion: 95, speed: 12, vehicles: 79200 },
      { time: "20:00", congestion: 87, speed: 17, vehicles: 66400 },
      { time: "21:00", congestion: 73, speed: 24, vehicles: 50100 },
      { time: "22:00", congestion: 56, speed: 32, vehicles: 36200 },
      { time: "23:00", congestion: 40, speed: 38, vehicles: 22800 }
    ],
    week: [
      { day: "Mon", congestion: 88, speed: 17, peak: "09:30 AM" },
      { day: "Tue", congestion: 86, speed: 18, peak: "09:45 AM" },
      { day: "Wed", congestion: 85, speed: 19, peak: "07:15 PM" },
      { day: "Thu", congestion: 89, speed: 16, peak: "07:30 PM" },
      { day: "Fri", congestion: 94, speed: 12, peak: "08:00 PM" },
      { day: "Sat", congestion: 72, speed: 28, peak: "08:30 PM" },
      { day: "Sun", congestion: 58, speed: 36, peak: "06:00 PM" }
    ],
    month: [
      { week: "Week 1", congestion: 81, incidents: 215 },
      { week: "Week 2", congestion: 86, incidents: 254 },
      { week: "Week 3", congestion: 83, incidents: 220 },
      { week: "Week 4", congestion: 84, incidents: 241 }
    ],
    summary: {
      currentCongestion: "84%",
      peakTime: "6:15 PM",
      averageSpeed: "18 km/h",
      activeBottlenecks: 26,
      aiTunedSignals: 340
    }
  },
  delhi: {
    today: [
      { time: "06:00", congestion: 26, speed: 45, vehicles: 22000 },
      { time: "07:00", congestion: 42, speed: 38, vehicles: 38500 },
      { time: "08:00", congestion: 74, speed: 24, vehicles: 72000 },
      { time: "09:00", congestion: 91, speed: 16, vehicles: 94000 },
      { time: "10:00", congestion: 87, speed: 18, vehicles: 88500 },
      { time: "11:00", congestion: 72, speed: 26, vehicles: 69000 },
      { time: "12:00", congestion: 64, speed: 30, vehicles: 58400 },
      { time: "13:00", congestion: 59, speed: 33, vehicles: 53100 },
      { time: "14:00", congestion: 63, speed: 31, vehicles: 56800 },
      { time: "15:00", congestion: 70, speed: 27, vehicles: 65400 },
      { time: "16:00", congestion: 80, speed: 22, vehicles: 78000 },
      { time: "17:00", congestion: 90, speed: 17, vehicles: 92400 },
      { time: "18:00", congestion: 95, speed: 14, vehicles: 104000 },
      { time: "19:00", congestion: 91, speed: 16, vehicles: 96500 },
      { time: "20:00", congestion: 82, speed: 21, vehicles: 81000 },
      { time: "21:00", congestion: 67, speed: 28, vehicles: 61500 },
      { time: "22:00", congestion: 51, speed: 36, vehicles: 44000 },
      { time: "23:00", congestion: 37, speed: 42, vehicles: 29500 }
    ],
    week: [
      { day: "Mon", congestion: 83, speed: 21, peak: "09:15 AM" },
      { day: "Tue", congestion: 81, speed: 22, peak: "09:30 AM" },
      { day: "Wed", congestion: 80, speed: 23, peak: "06:45 PM" },
      { day: "Thu", congestion: 84, speed: 20, peak: "07:10 PM" },
      { day: "Fri", congestion: 90, speed: 16, peak: "07:45 PM" },
      { day: "Sat", congestion: 68, speed: 30, peak: "08:15 PM" },
      { day: "Sun", congestion: 52, speed: 39, peak: "05:30 PM" }
    ],
    month: [
      { week: "Week 1", congestion: 76, incidents: 280 },
      { week: "Week 2", congestion: 82, incidents: 315 },
      { week: "Week 3", congestion: 78, incidents: 264 },
      { week: "Week 4", congestion: 79, incidents: 292 }
    ],
    summary: {
      currentCongestion: "79%",
      peakTime: "6:30 PM",
      averageSpeed: "23 km/h",
      activeBottlenecks: 22,
      aiTunedSignals: 420
    }
  }
};
