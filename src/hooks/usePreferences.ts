import { useEffect, useState } from 'react';
import i18n, { detectLanguage, supportedLanguages, type SupportedLanguage } from '@/i18n';
import type { ProcessDisplayMode } from '@/types/chat';

const STORAGE_KEY = 'ai-chat-preferences';

interface PreferencesState {
  processDisplayMode: ProcessDisplayMode;
  language: SupportedLanguage;
}

const DEFAULTS: PreferencesState = {
  processDisplayMode: 'full',
  language: detectLanguage(i18n.language),
};

export function usePreferences() {
  const [preferences, setPreferences] = useState<PreferencesState>(DEFAULTS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<PreferencesState>;
      const language =
        parsed.language && supportedLanguages.includes(parsed.language)
          ? parsed.language
          : detectLanguage(i18n.language);
      i18n.changeLanguage(language);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = language;
      }
      setPreferences({
        processDisplayMode:
          parsed.processDisplayMode === 'status' ? 'status' : 'full',
        language,
      });
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }, [preferences]);

  const setProcessDisplayMode = (mode: ProcessDisplayMode) => {
    setPreferences((prev) => ({ ...prev, processDisplayMode: mode }));
  };

  const setLanguage = (language: SupportedLanguage) => {
    const normalized = detectLanguage(language);
    i18n.changeLanguage(normalized);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = normalized;
    }
    setPreferences((prev) => ({ ...prev, language: normalized }));
  };

  return {
    preferences,
    processDisplayMode: preferences.processDisplayMode,
    setProcessDisplayMode,
    language: preferences.language,
    setLanguage,
  };
}
