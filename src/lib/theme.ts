export type Theme = "light" | "dark";

const THEME_KEY = "plan-theme";

export function getTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    return (localStorage.getItem(THEME_KEY) as Theme) || "light";
  } catch {
    return "light";
  }
}

export function setTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute("data-theme", theme);
  } catch {}
}

export function toggleTheme(): Theme {
  const current = getTheme();
  const next: Theme = current === "light" ? "dark" : "light";

  // Add transition class
  document.documentElement.classList.add("theme-transitioning");
  setTheme(next);

  setTimeout(() => {
    document.documentElement.classList.remove("theme-transitioning");
  }, 350);

  return next;
}
