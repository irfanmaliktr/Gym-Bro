import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { DEFAULT_LANGUAGE, setLanguage, type Language } from '../db/settings'
import { en, type Messages } from './en'
import { id } from './id'

/** Active UI language (ONBD-004). Persisted in `app_settings.language` (§12). */
export type Lang = Language

const dictionaries: Record<Lang, Messages> = { en, id }
const LOCALES: Record<Lang, string> = { en: 'en-US', id: 'id-ID' }

function resolve(messages: Messages, key: string): string | undefined {
  let value: unknown = messages
  for (const part of key.split('.')) {
    if (typeof value !== 'object' || value === null) return undefined
    value = (value as Record<string, unknown>)[part]
  }
  return typeof value === 'string' ? value : undefined
}

interface I18nValue {
  lang: Lang
  setLang: (lang: Lang) => void
  toggleLang: () => void
  /** BCP-47 locale for date/number formatting (I18N-003). */
  locale: string
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nValue | null>(null)

interface I18nProviderProps {
  children: ReactNode
  /**
   * Language resolved by `bootstrapDatabase()` before the first render, so the
   * app never flashes English at an Indonesian user (I18N-002).
   */
  initialLang?: Lang
}

export function I18nProvider({ children, initialLang = DEFAULT_LANGUAGE }: I18nProviderProps) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  // Persist through Dexie (`app_settings`, §12) instead of localStorage, so a
  // backup/restore (§11) carries the preference with the rest of the data.
  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    void setLanguage(next).catch((error: unknown) => {
      console.error('[gymbro] failed to persist language preference', error)
    })
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const template = resolve(dictionaries[lang], key) ?? resolve(en, key) ?? key
      if (!params) return template
      return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in params ? String(params[name]) : match,
      )
    },
    [lang],
  )

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      toggleLang: () => setLang(lang === 'en' ? 'id' : 'en'),
      locale: LOCALES[lang],
      t,
    }),
    [lang, setLang, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>')
  return ctx
}
