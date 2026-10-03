import React, { useState } from "react";

export const Tooltip = ({ children, content, position = "right" }) => {
  const [visible, setVisible] = useState(false);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2"
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && content && (
        <div
          className={`absolute z-50 px-2.5 py-1 text-xs font-medium text-cyan-200 bg-slate-900/95 border border-cyan-500/30 rounded-md shadow-xl backdrop-blur-md whitespace-nowrap pointer-events-none transition-all duration-200 ${positionClasses[position]}`}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
