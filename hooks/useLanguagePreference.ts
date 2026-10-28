// hooks/useLanguagePreference.ts
// Highrise.pk — ALEEM Locale/Language Preference State Manager Hook

import { useState, useEffect, useCallback } from 'react';

type LocaleMode = 'auto' | 'en' | 'ur';

interface UseLanguagePreferenceReturn {
  localeMode: LocaleMode;
  setLocaleMode: (mode: LocaleMode) => void;
  toggleLocale: () => void;
}

const STORAGE_KEY = 'aleem_locale_preference';

export default function useLanguagePreference(): UseLanguagePreferenceReturn {
  const [localeMode, setLocaleModeState] = useState<LocaleMode>('auto');

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY) as LocaleMode;
      if (stored && ['auto', 'en', 'ur'].includes(stored)) {
        setLocaleModeState(stored);
      }
    } catch {
      // sessionStorage blocked — fall back to auto
    }
  }, []);

  const setLocaleMode = useCallback((mode: LocaleMode) => {
    setLocaleModeState(mode);
    try {
      sessionStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // sessionStorage blocked — silent
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleModeState((prev) => {
      const next: LocaleMode = prev === 'auto' ? 'ur' : prev === 'ur' ? 'en' : 'auto';
      try {
        sessionStorage.setItem(STORAGE_KEY, next);
      } catch {
        // sessionStorage blocked — silent
      }
      return next;
    });
  }, []);

  return { localeMode, setLocaleMode, toggleLocale };
}