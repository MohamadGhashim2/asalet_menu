export const catalogLocales = ['ar', 'en', 'tr'] as const

export type CatalogLocale = (typeof catalogLocales)[number]

export function resolveCatalogLocale(value: string | null | undefined): CatalogLocale {
  return value === 'en' || value === 'tr' ? value : 'ar'
}
