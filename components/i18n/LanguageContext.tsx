import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { type Language, TRANSLATIONS, resolveLanguage, type Translations } from './translations';

const STORAGE_KEY = '@tower_defense_language';

interface LanguageContextValue {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Best-effort synchronous initialisation from the device locale.
    // The persisted preference is loaded asynchronously in the effect below.
    const locales = Localization.getLocales();
    const deviceLocale = locales[0]?.languageTag ?? 'en';
    return resolveLanguage(deviceLocale);
  });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'de' || saved === 'en') {
          setLanguageState(saved);
        }
      })
      .catch((err) => {
        if (__DEV__) {
          console.warn('[LanguageContext] Failed to load saved language:', err);
        }
      });
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
    } catch (err) {
      if (__DEV__) {
        console.warn('[LanguageContext] Failed to save language preference:', err);
      }
    }
  }, []);

  const value: LanguageContextValue = {
    language,
    t: TRANSLATIONS[language],
    setLanguage,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used inside <LanguageProvider>');
  }
  return ctx;
}
