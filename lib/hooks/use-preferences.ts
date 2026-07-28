"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import {
  applyAccentHue,
  applyGlassOpacity,
  applyTheme,
  getPreferencesSnapshot,
  getServerPreferencesSnapshot,
  resetPreferencesStore,
  subscribePreferences,
  updatePreferencesStore,
  type AppPreferences,
} from "@/lib/preferences";

export function usePreferences(): {
  preferences: AppPreferences;
  updatePreferences: (patch: Partial<AppPreferences>) => void;
  resetPreferences: () => void;
} {
  const preferences = useSyncExternalStore(subscribePreferences, getPreferencesSnapshot, getServerPreferencesSnapshot);

  useEffect(() => {
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    const onColorScheme = () => {
      if (preferences.theme === "system") applyTheme("system");
    };

    applyTheme(preferences.theme);
    colorScheme.addEventListener("change", onColorScheme);
    return () => colorScheme.removeEventListener("change", onColorScheme);
  }, [preferences.theme]);

  useEffect(() => {
    applyGlassOpacity(preferences.glassOpacity, preferences.glassDisabled);
  }, [preferences.glassOpacity, preferences.glassDisabled]);

  useEffect(() => {
    applyAccentHue(preferences.accentHue);
  }, [preferences.accentHue]);

  const updatePreferences = useCallback((patch: Partial<AppPreferences>) => {
    updatePreferencesStore(patch);
  }, []);

  const resetPreferences = useCallback(() => {
    resetPreferencesStore();
  }, []);

  return { preferences, updatePreferences, resetPreferences };
}
