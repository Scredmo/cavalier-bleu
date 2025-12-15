"use client";

import { useEffect } from "react";

const STORAGE_SETTINGS_KEY = "CB_SETTINGS_V1";

type Settings = {
  theme?: "light" | "dark" | "system";
  compactMode?: boolean;
};

function applySettings(settings: Settings) {
  const theme = settings?.theme ?? "system";
  const compact = !!settings?.compactMode;

  // Theme: stored on <html> so CSS can target it reliably
  document.documentElement.dataset.theme = theme;

  // Compact mode: stored on <html> to match your CSS selectors
  document.documentElement.dataset.compact = compact ? "1" : "0";
}

export default function SettingsApplier() {
  useEffect(() => {
    const readAndApply = () => {
      try {
        const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
        const parsed: Settings = raw ? JSON.parse(raw) : {};
        applySettings(parsed);
      } catch {
        applySettings({ theme: "system", compactMode: false });
      }
    };

    // Apply once on mount
    readAndApply();

    // Re-apply if another tab changes settings
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_SETTINGS_KEY) readAndApply();
    };
    window.addEventListener("storage", onStorage);

    // Re-apply in the same tab if your page dispatches this event after saving
    const onCbSettingsUpdated = () => readAndApply();
    window.addEventListener("cb:settings-updated", onCbSettingsUpdated as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cb:settings-updated", onCbSettingsUpdated as EventListener);
    };
  }, []);

  return null;
}