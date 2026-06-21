import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const ThemeContext = createContext({ theme: "light", setTheme: () => {} });

function storageKey(userId) {
  return userId ? `theme_${userId}` : "theme_default";
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("light");
  const userIdRef = useRef(null);

  useEffect(() => {
    // Read initial session and apply stored preference
    supabase.auth.getSession().then(({ data: { session } }) => {
      userIdRef.current = session?.user?.id ?? null;
      const stored = localStorage.getItem(storageKey(userIdRef.current));
      if (stored === "dark" || stored === "light") setThemeState(stored);
    });

    // Re-apply whenever auth state changes (login → load user pref, logout → light)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      userIdRef.current = session?.user?.id ?? null;
      const stored = localStorage.getItem(storageKey(userIdRef.current));
      setThemeState(stored === "dark" ? "dark" : "light");
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const setTheme = (next) => {
    setThemeState(next);
    localStorage.setItem(storageKey(userIdRef.current), next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
