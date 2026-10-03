import React from "react";
import { Cpu } from "lucide-react";

export const Loading = ({ message = "Synthesizing Digital Twin Telemetry..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[300px] w-full">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl border-2 border-cyan-500/20 border-t-cyan-400 animate-spin flex items-center justify-center shadow-lg shadow-cyan-500/20"></div>
        <div className="absolute inset-0 flex items-center justify-center text-cyan-400 animate-pulse">
          <Cpu className="w-6 h-6" />
        </div>
      </div>
      <p className="mt-4 text-sm font-medium text-cyan-300 tracking-wide animate-pulse">
        {message}
      </p>
      <span className="mt-1 text-xs text-slate-500">
        AI Neural Engine Synchronizing • 240 fps
      </span>
    </div>
  );
};

export default Loading;
