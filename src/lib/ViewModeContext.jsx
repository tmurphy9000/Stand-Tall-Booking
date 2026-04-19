import React, { createContext, useContext, useState, useEffect } from "react";

const ViewModeContext = createContext({ isMobile: false, setIsMobile: () => {} });

export function ViewModeProvider({ children }) {
  const [isMobile, setIsMobileState] = useState(() => {
    return localStorage.getItem("view_mode") === "mobile";
  });

  const setIsMobile = (val) => {
    localStorage.setItem("view_mode", val ? "mobile" : "desktop");
    setIsMobileState(val);
  };

  return (
    <ViewModeContext.Provider value={{ isMobile, setIsMobile }}>
      <div className={isMobile ? "max-w-[390px] mx-auto" : ""}>
        {children}
      </div>
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  return useContext(ViewModeContext);
}