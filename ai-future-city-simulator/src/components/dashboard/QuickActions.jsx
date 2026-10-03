import React from "react";
import { motion } from "framer-motion";
import { FlaskConical, Sparkles, MapPin, Bot, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const QuickActions = () => {
  const actions = [
    {
      title: "RUN WHAT-IF SIMULATION",
      subtitle: "Tweak EV mandates, metro expansion & zoning",
      icon: FlaskConical,
      path: "/what-if-simulator",
      color: "from-emerald-500/20 to-teal-600/10",
      border: "border-emerald-500/30 hover:border-emerald-400",
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10 border-emerald-500/30"
    },
    {
      title: "VIEW FUTURE PREDICTION",
      subtitle: "Multi-year demographic & infrastructure projections",
      icon: Sparkles,
      path: "/future-predictions",
      color: "from-purple-500/20 to-indigo-600/10",
      border: "border-purple-500/30 hover:border-purple-400",
      iconColor: "text-purple-400",
      iconBg: "bg-purple-500/10 border-purple-500/30"
    },
    {
      title: "EXPLORE DIGITAL TWIN",
      subtitle: "Public OpenStreetMap features and current model conditions",
      icon: MapPin,
      path: "/digital-twin",
      color: "from-cyan-500/20 to-blue-600/10",
      border: "border-cyan-500/30 hover:border-cyan-400",
      iconColor: "text-cyan-400",
      iconBg: "bg-cyan-500/10 border-cyan-500/30"
    },
    {
      title: "VIEW POLICY EXAMPLES",
      subtitle: "Example policy ideas from bundled sample data",
      icon: Bot,
      path: "/ai-recommendations",
      color: "from-blue-500/20 to-indigo-600/10",
      border: "border-blue-500/30 hover:border-blue-400",
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/10 border-blue-500/30"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.title}
            to={action.path}
            aria-label={`${action.title}: ${action.subtitle}`}
            className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            <motion.div
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              className={`cursor-pointer p-4 rounded-2xl glass-panel border bg-gradient-to-br ${action.color} ${action.border} transition-all duration-200 group relative overflow-hidden`}
            >
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl border ${action.iconBg} ${action.iconColor} group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all duration-200" />
              </div>

              <div className="mt-3">
                <h4 className="text-xs font-bold text-white tracking-wide group-hover:text-cyan-300 transition-colors">
                  {action.title}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {action.subtitle}
                </p>
              </div>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
};

export default QuickActions;
