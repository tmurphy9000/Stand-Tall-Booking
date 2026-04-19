import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Check } from "lucide-react";

const THEME_KEY = "app_theme_settings";

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

const DEFAULTS = {
  background: "#ffffff",
  foreground: "#0a0a0a",
  primary: "#171717",
  accent: "#8B9A7E",
  sidebar: "#0a0a0a",
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

function loadColors() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Guard against old nested format (light/dark keys)
      if (parsed.background && typeof parsed.background === "string") return parsed;
    }
  } catch {}
  return { ...DEFAULTS };
}

function applyColors(colors) {
  const root = document.documentElement;
  root.style.setProperty("--background", hexToHsl(colors.background));
  root.style.setProperty("--foreground", hexToHsl(colors.foreground));
  root.style.setProperty("--card", hexToHsl(colors.background));
  root.style.setProperty("--card-foreground", hexToHsl(colors.foreground));
  root.style.setProperty("--primary", hexToHsl(colors.primary));
  root.style.setProperty("--accent", hexToHsl(colors.accent));
  root.style.setProperty("--sidebar-background", hexToHsl(colors.sidebar));
  root.style.setProperty("--sidebar-primary", hexToHsl(colors.sidebarAccent));
}

export default function ThemeCustomizer() {
  const [saved, setSaved] = useState(loadColors);
  // pending holds the in-progress value for the currently open picker
  const [pending, setPending] = useState(null); // { key, value }
  const colorInputRefs = useRef({});

  useEffect(() => {
    applyColors(saved);
  }, []);

  const openPicker = (key) => {
    setPending({ key, value: saved[key] });
    // Programmatically open the color picker
    setTimeout(() => colorInputRefs.current[key]?.click(), 0);
  };

  const handlePickerChange = (key, hex) => {
    setPending({ key, value: hex });
  };

  const handleDone = () => {
    if (!pending) return;
    const updated = { ...saved, [pending.key]: pending.value };
    setSaved(updated);
    localStorage.setItem(THEME_KEY, JSON.stringify(updated));
    applyColors(updated);
    setPending(null);
  };

  const handleCancel = () => {
    setPending(null);
  };

  const resetDefaults = () => {
    setSaved({ ...DEFAULTS });
    localStorage.setItem(THEME_KEY, JSON.stringify(DEFAULTS));
    applyColors(DEFAULTS);
    setPending(null);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Theme & Colors</p>
        <Button variant="ghost" size="sm" onClick={resetDefaults} className="text-xs text-gray-400 gap-1 h-7">
          <RotateCcw className="w-3 h-3" /> Reset
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Object.entries(COLOR_LABELS).map(([key, label]) => {
          const isEditing = pending?.key === key;
          const displayColor = isEditing ? pending.value : saved[key];

          return (
            <div
              key={key}
              className={`flex items-center gap-3 p-2 border rounded-lg transition-colors ${isEditing ? "border-[#8B9A7E] bg-green-50" : "border-gray-100 hover:border-gray-200"}`}
            >
              {/* Hidden native color input */}
              <input
                ref={(el) => (colorInputRefs.current[key] = el)}
                type="color"
                value={displayColor}
                onChange={(e) => handlePickerChange(key, e.target.value)}
                className="sr-only"
              />

              {/* Color swatch — clicking opens picker */}
              <button
                onClick={() => isEditing ? null : openPicker(key)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                style={{ backgroundColor: displayColor }}
              />

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-700 leading-tight">{label}</p>
                <p className="text-[10px] text-gray-400 font-mono">{displayColor}</p>
              </div>

              {isEditing && (
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={handleDone}
                    className="w-6 h-6 rounded-full bg-[#8B9A7E] text-white flex items-center justify-center hover:bg-[#6B7A5E] transition-colors"
                    title="Done"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleCancel}
                    className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-300 transition-colors text-xs font-bold"
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400">
        Click a color swatch to pick a new color, then press the checkmark to save and apply.
      </p>
    </div>
  );
}