// src/context/PreferencesContext.js
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage, { STORAGE_KEYS } from '../utils/storage.js';
import { LIGHT, DARK } from '../theme/colors.js';
import { makeStyles } from '../theme/styles.js';
import { tFor } from '../i18n/strings.js';

const PreferencesContext = createContext();

export const PreferencesProvider = ({ children }) => {
  const [theme, setTheme] = useState("light");
  const [prefLanguage, setPrefLanguage] = useState("en");
  const [prefNotifications, setPrefNotifications] = useState(true);
  const [prefDataSaver, setPrefDataSaver] = useState(true);
  const [prefTtsRate, setPrefTtsRate] = useState(1.0);
  const [currentTown, setCurrentTown] = useState("Bothaville");
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const [p, tw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.PREFS),
          AsyncStorage.getItem(STORAGE_KEYS.TOWN),
        ]);
        
        if (p) {
          const prefs = JSON.parse(p);
          if (prefs?.theme) setTheme(prefs.theme);
          if (prefs?.language) setPrefLanguage(prefs.language);
          if (typeof prefs?.dataSaver === "boolean") setPrefDataSaver(prefs.dataSaver);
          if (typeof prefs?.ttsRate === "number") setPrefTtsRate(prefs.ttsRate);
          if (typeof prefs?.notifications === "boolean") setPrefNotifications(prefs.notifications);
        }
        if (tw) setCurrentTown(JSON.parse(tw).currentTown || "Bothaville");
      } catch (e) {
        console.warn("[Yaka] Prefs load error", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadPrefs();
  }, []);
  
  useEffect(() => {
    if (isLoading) return;
    AsyncStorage.setItem(
      STORAGE_KEYS.PREFS,
      JSON.stringify({
        theme,
        language: prefLanguage,
        dataSaver: prefDataSaver,
        ttsRate: prefTtsRate,
        notifications: prefNotifications
      })
    ).catch(()=>{});
  }, [theme, prefLanguage, prefDataSaver, prefTtsRate, prefNotifications, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    AsyncStorage.setItem(STORAGE_KEYS.TOWN, JSON.stringify({ currentTown })).catch(()=>{});
  }, [currentTown, isLoading]);

  // ⚠️ Tiny fix: expose setTheme on both C and styles so callers can do C.setTheme(...) or styles.setTheme(...)
  const baseColors = theme === "dark" ? DARK : LIGHT;
  const C = useMemo(() => ({ ...baseColors, setTheme }), [baseColors]);
  const styles = useMemo(() => ({ ...makeStyles(C), setTheme }), [C]);

  const t = useMemo(() => tFor(prefLanguage), [prefLanguage]);

  const value = {
    theme, setTheme,
    prefLanguage, setPrefLanguage,
    prefNotifications, setPrefNotifications,
    prefDataSaver, setPrefDataSaver,
    prefTtsRate, setPrefTtsRate,
    currentTown, setCurrentTown,
    C, styles, t, 
    isLoading,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePrefs = () => useContext(PreferencesContext);
