import React, { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sun, Moon, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const THEME_KEY = "app_theme_settings";

// Helper: hex → hsl string "h s% l%"
function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Helper: hsl string → hex
function hslToHex(hsl) {
  const parts = hsl.trim().split(/[\s,]+/);
  let h = parseFloat(parts[0]) / 360;
  let s = parseFloat(parts[1]) / 100;
  let l = parseFloat(parts[2]) / 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return `#${Math.round(r*255).toString(16).padStart(2,"0")}${Math.round(g*255).toString(16).padStart(2,"0")}${Math.round(b*255).toString(16).padStart(2,"0")}`;
}

const LIGHT_DEFAULTS = {
  background: "#ffffff",
  foreground: "#0a0a0a",
  primary: "#171717",
  accent: "#8B9A7E",
  sidebar: "#0a0a0a",
  sidebarAccent: "#8B9A7E",
};

const DARK_DEFAULTS = {
  background: "#0a0a0a",
  foreground: "#fafafa",
  primary: "#fafafa",
  accent: "#8B9A7E",
  sidebar: "#000000",
  sidebarAccent: "#8B9A7E",
};

const COLOR_LABELS = {
  background: "Page Background",
  foreground: "Text Color",
  primary: "Primary / Buttons",
  accent: "Accent / Highlights",
  sidebar: "Sidebar Background",
  sidebarAccent: "Sidebar Active Color",
};

function loadTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { darkMode: false, light: { ...LIGHT_DEFAULTS }, dark: { ...DARK_DEFAULTS } };
}

function applyTheme(isDark, colors) {
  const root = document.documentElement;
  const c = isDark ? colors.dark : colors.light;

  if (isDark) root.classList.add("dark"); else root.classList.remove("dark");

  root.style.setProperty("--background", hexToHsl(c.background));
  root.style.setProperty("--foreground", hexToHsl(c.foreground));
  root.style.setProperty("--card", hexToHsl(c.background));
  root.style.setProperty("--card-foreground", hexToHsl(c.foreground));
  root.style.setProperty("--primary", hexToHsl(c.primary));
  root.style.setProperty("--primary-foreground", isDark ? "0 0% 9%" : "0 0% 98%");
  root.style.setProperty("--accent", hexToHsl(c.accent));
  root.style.setProperty("--accent-foreground", isDark ? "0 0% 98%" : "0 0% 9%");
  root.style.setProperty("--sidebar-background", hexToHsl(c.sidebar));
  root.style.setProperty("--sidebar-primary", hexToHsl(c.sidebarAccent));
}

export default function ThemeCustomizer() {
  const [theme, setTheme] = useState(loadTheme);
  const isDark = theme.darkMode;
  const currentColors = isDark ? theme.dark : theme.light;

  useEffect(() => {
    applyTheme(theme.darkMode, theme);
  }, []);

  const save = (updated) => {
    setTheme(updated);
    localStorage.setItem(THEME_KEY, JSON.stringify(updated));
    applyTheme(updated.darkMode, updated);
  };

  const toggleDark = (val) => {
    save({ ...theme, darkMode: val });
  };

  const handleColorChange = (key, hex) => {
    const modeKey = isDark ? "dark" : "light";
    const updated = {
      ...theme,
      [modeKey]: { ...theme[modeKey], [key]: hex },
    };
    save(updated);
  };

  const resetDefaults = () => {
    save({ darkMode: theme.darkMode, light: { ...LIGHT_DEFAULTS }, dark: { ...DARK_DEFAULTS } });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Theme & Colors</p>
        <Button variant="ghost" size="sm" onClick={resetDefaults} className="text-xs text-gray-400 gap-1 h-7">
          <RotateCcw className="w-3 h-3" /> Reset
        </Button>
      </div>

      {/* Dark / Light Mode Toggle */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <Sun className="w-4 h-4 text-amber-500" />
        <div className="flex-1">
          <Label className="text-sm font-medium">Dark Mode</Label>
          <p className="text-xs text-gray-400">Switch between light and dark interface</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-medium", !isDark ? "text-gray-700" : "text-gray-400")}>Light</span>
          <Switch checked={isDark} onCheckedChange={toggleDark} />
          <span className={cn("text-xs font-medium", isDark ? "text-gray-700" : "text-gray-400")}>Dark</span>
          <Moon className="w-4 h-4 text-indigo-400" />
        </div>
      </div>

      {/* Color Pickers */}
      <div>
        <p className="text-xs text-gray-400 mb-3">
          Customizing <span className="font-semibold text-gray-600">{isDark ? "Dark Mode" : "Light Mode"}</span> colors
        </p>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(COLOR_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-3 p-2 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
              <div className="relative flex-shrink-0">
                <input
                  type="color"
                  value={currentColors[key]}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-transparent"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700 leading-tight">{label}</p>
                <p className="text-[10px] text-gray-400 font-mono">{currentColors[key]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Changes apply immediately. Switch between Light/Dark tabs to customize each independently.
      </p>
    </div>
  );
}