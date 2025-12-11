import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
export type Language = 'en' | 'zh' | 'ar';

interface Translations {
  [key: string]: string | Translations;
}

interface I18nStore {
  language: Language;
  setLanguage: (lang: Language) => void;
  translations: Translations;
  loadTranslations: (lang: Language) => Promise<void>;
}

// ============================================================================
// I18N STORE
// ============================================================================
export const useI18nStore = create<I18nStore>()(
  persist(
    (set, get) => ({
      language: 'en',
      translations: {},
      
      setLanguage: async (lang: Language) => {
        set({ language: lang });
        await get().loadTranslations(lang);
      },
      
      loadTranslations: async (lang: Language) => {
        try {
          let translations;
          switch (lang) {
            case 'en':
              translations = (await import('../locales/en.json')).default;
              break;
            case 'zh':
              translations = (await import('../locales/zh.json')).default;
              break;
            case 'ar':
              translations = (await import('../locales/ar.json')).default;
              break;
            default:
              translations = (await import('../locales/en.json')).default;
          }
          set({ translations });
        } catch (error) {
          console.error(`Failed to load translations for ${lang}:`, error);
          // Fallback to English
          try {
            const enTranslations = (await import('../locales/en.json')).default;
            set({ translations: enTranslations });
          } catch (fallbackError) {
            console.error('Failed to load fallback translations:', fallbackError);
          }
        }
      },
    }),
    {
      name: 'mini3d-i18n',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        language: state.language,
      }),
    }
  )
);

// ============================================================================
// I18N HOOK
// ============================================================================
export function useI18n() {
  const { language, setLanguage, translations, loadTranslations } = useI18nStore();
  
  // Load translations on mount and when language changes
  React.useEffect(() => {
    loadTranslations(language);
  }, [language, loadTranslations]);
  
  // Translation function
  const t = (key: string, params?: Record<string, string>): string => {
    const keys = key.split('.');
    let value: string | Translations = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to key if translation not found
        return key;
      }
    }
    
    if (typeof value !== 'string') {
      return key;
    }
    
    // Replace parameters
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] || match;
      });
    }
    
    return value;
  };
  
  // Get RTL status
  const isRTL = language === 'ar';
  
  // Text alignment direction
  const textDirection = isRTL ? 'rtl' : 'ltr';
  const textAlign = isRTL ? 'right' : 'left';

  return {
    language,
    setLanguage,
    t,
    isRTL,
    textDirection,
    textAlign,
  };
}

