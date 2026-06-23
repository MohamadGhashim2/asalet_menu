'use client'

import { useLocale } from './LocaleProvider'
import type { MessageKey } from './messages'

export function LocalizedText({ id }: { id: MessageKey }) {
  return useLocale().t(id)
}
