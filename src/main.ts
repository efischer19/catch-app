/**
 * Catch — Main Entry Point
 *
 * TypeScript entry point for the Catch PWA. Initializes interactive
 * behavior including the dark mode toggle and service worker registration.
 */

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  registerServiceWorker();
});

/**
 * Initialize the dark/light theme toggle.
 *
 * Behavior:
 * - Reads the user's saved preference from localStorage.
 * - Falls back to the operating system's preferred color scheme.
 * - Updates the `data-theme` attribute on <html> and persists the choice.
 * - Updates the toggle button's label and ARIA attributes.
 */
function initThemeToggle(): void {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

  // Determine initial theme: saved preference > OS preference > light
  const saved = localStorage.getItem("theme");
  const initial = saved ?? (prefersDark.matches ? "dark" : "light");
  applyTheme(initial, toggle);

  // Toggle on click
  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next, toggle);
    localStorage.setItem("theme", next);
  });

  // Respond to OS preference changes (only if no saved preference)
  prefersDark.addEventListener("change", (e: MediaQueryListEvent) => {
    if (!localStorage.getItem("theme")) {
      applyTheme(e.matches ? "dark" : "light", toggle);
    }
  });
}

/**
 * Apply a theme and update the toggle button state.
 */
function applyTheme(theme: string, toggle: HTMLElement): void {
  document.documentElement.setAttribute("data-theme", theme);
  const isDark = theme === "dark";
  toggle.setAttribute("aria-pressed", String(isDark));

  const icon = toggle.querySelector(".icon");
  if (icon) icon.textContent = isDark ? "☀️" : "🌙";

  const label = toggle.querySelector(".label");
  if (label) label.textContent = isDark ? "Light mode" : "Dark mode";
}

/**
 * Register the service worker for PWA installability.
 */
function registerServiceWorker(): void {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Service worker registration failed — not critical for app function
    });
  }
}
