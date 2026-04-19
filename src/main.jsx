import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Apply saved theme on startup
try {
  const saved = JSON.parse(localStorage.getItem("app_theme_settings") || "{}");
  if (saved.darkMode) document.documentElement.classList.add("dark");
  const applyVar = (name, val) => {
    if (!val) return;
    const hex = val;
    const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h, s, l = (max+min)/2;
    if (max===min){h=s=0;}else{const d=max-min;s=l>0.5?d/(2-max-min):d/(max+min);switch(max){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;case b:h=((r-g)/d+4)/6;break;}}
    document.documentElement.style.setProperty(name, `${Math.round(h*360)} ${Math.round(s*100)}% ${Math.round(l*100)}%`);
  };
  const c = saved.darkMode ? saved.dark : saved.light;
  if (c) {
    applyVar("--background", c.background);
    applyVar("--foreground", c.foreground);
    applyVar("--card", c.background);
    applyVar("--card-foreground", c.foreground);
    applyVar("--primary", c.primary);
    applyVar("--accent", c.accent);
    applyVar("--sidebar-background", c.sidebar);
    applyVar("--sidebar-primary", c.sidebarAccent);
  }
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)