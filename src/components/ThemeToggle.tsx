"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { getTheme, toggleTheme, type Theme } from "@/lib/theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(getTheme());
  }, []);

  const handleToggle = () => {
    const next = toggleTheme();
    setTheme(next);
  };

  return (
    <button
      onClick={handleToggle}
      className="btn-icon"
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "light" ? (
        <Moon size={18} strokeWidth={1.75} />
      ) : (
        <Sun size={18} strokeWidth={1.75} />
      )}
    </button>
  );
}
