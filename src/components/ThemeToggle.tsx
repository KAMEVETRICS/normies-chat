"use client";

import { useCallback, useSyncExternalStore } from "react";

// Read the initial theme from the DOM (SSR-safe via getServerSnapshot)
function subscribe(cb: () => void) {
  const observer = new MutationObserver(cb);
  if (typeof document !== "undefined") {
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

// Hydration gate — returns false on server, true on client
const hydrateSubscribe = () => () => {};
const hydrateGetSnapshot = () => true;
const hydrateGetServerSnapshot = () => false;

export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(hydrateSubscribe, hydrateGetSnapshot, hydrateGetServerSnapshot);

  const toggle = useCallback(() => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("normie-theme", next ? "dark" : "light");
  }, [dark]);

  if (!hydrated) return null;

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center p-2 rounded-full hover:bg-[var(--bg-card)] transition-colors duration-300 cursor-pointer"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="material-symbols-outlined text-[var(--text-primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>
        {dark ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}
