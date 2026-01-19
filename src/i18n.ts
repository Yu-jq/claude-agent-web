import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import zh from './locales/zh.json';

export const supportedLanguages = ['zh', 'en', 'ja', 'ko'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

const STORAGE_KEY = 'ai-chat-preferences';

const normalizeLanguage = (value?: string): SupportedLanguage => {
  if (!value) return 'zh';
  const lowered = value.toLowerCase();
  if (lowered.startsWith('zh')) return 'zh';
  if (lowered.startsWith('en')) return 'en';
  if (lowered.startsWith('ja')) return 'ja';
  if (lowered.startsWith('ko')) return 'ko';
  return 'zh';
};

const getStoredLanguage = (): SupportedLanguage | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { language?: string };
    if (!parsed.language) return null;
    return normalizeLanguage(parsed.language);
  } catch (error) {
    return null;
  }
};

const getBrowserLanguage = (): SupportedLanguage => {
  if (typeof navigator === 'undefined') return 'zh';
  return normalizeLanguage(navigator.language);
};

const initialLanguage = getStoredLanguage() ?? getBrowserLanguage();

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
    ja: { translation: ja },
    ko: { translation: ko },
  },
  lng: initialLanguage,
  fallbackLng: 'zh',
  interpolation: {
    escapeValue: false,
  },
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLanguage;
}

export const detectLanguage = normalizeLanguage;

export default i18n;
