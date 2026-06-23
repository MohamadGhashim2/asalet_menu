'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { messages, supportedLocales, type Locale, type MessageKey } from './messages'

const LOCALE_STORAGE_KEY = 'asalet-ui-locale-v1'
const LOCALE_COOKIE_KEY = 'asalet_ui_locale'

type TranslationValues = Record<string, string | number>

type LocaleContextValue = {
  locale: Locale
  direction: 'rtl' | 'ltr'
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, values?: TranslationValues) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function interpolate(template: string, values?: TranslationValues) {
  if (!values) return template

  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`))
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ar')

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
  }, [])

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (!storedLocale || !supportedLocales.includes(storedLocale as Locale)) return

    const frame = window.requestAnimationFrame(() => {
      setLocaleState(storedLocale as Locale)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const direction = locale === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = locale
    document.documentElement.dir = direction
    document.documentElement.style.direction = direction
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    document.cookie = `${LOCALE_COOKIE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`
  }, [locale])

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    direction: locale === 'ar' ? 'rtl' : 'ltr',
    setLocale,
    t: (key, values) => interpolate(messages[locale][key], values),
  }), [locale, setLocale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) throw new Error('useLocale must be used within LocaleProvider')
  return context
}
