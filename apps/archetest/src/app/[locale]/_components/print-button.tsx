'use client'

import { Button, type ButtonProps } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'
import { LuPrinter } from 'react-icons/lu'

/**
 * На время печати — светлая тема: тёмный фон браузер по умолчанию не печатает, и светлый текст
 * тёмной темы на белой бумаге почти не виден. Слушатели `beforeprint`/`afterprint` ловят и
 * Ctrl+P, не только кнопку. Возвращаем ровно тот класс, что был.
 */
function useLightThemeWhilePrinting() {
  useEffect(() => {
    const root = document.documentElement
    let wasDark = false
    // Флаг только взводится: повторный beforeprint (его шлёт, например, сам Chromium при
    // печати в PDF поверх уже начатой) иначе затёр бы wasDark, и тема не вернулась бы
    const before = () => {
      if (root.classList.replace('dark', 'light')) {
        wasDark = true
      }
    }
    const after = () => {
      if (wasDark) {
        root.classList.replace('light', 'dark')
        wasDark = false
      }
    }
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])
}

/**
 * «Сохранить в PDF» (волна 7.6): системный диалог печати браузера, где PDF — один из
 * принтеров. Серверного рендера PDF нет намеренно (`.claude/rules/heavy-work-off-main-thread.md`);
 * что прячется на бумаге — `@media print` в `theme/index.ts` и атрибут `data-print-hide`.
 */
export function PrintButton(props: Omit<ButtonProps, 'onClick'>) {
  const t = useTranslations('print')
  useLightThemeWhilePrinting()

  return (
    <Button variant="outline" {...props} onClick={() => window.print()} data-print-hide="">
      <LuPrinter />
      {t('button')}
    </Button>
  )
}
