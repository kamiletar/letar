import { i18n } from '@/lib/i18n'
import { defineI18nUI } from 'fumadocs-ui/i18n'
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

export const i18nUI = defineI18nUI(i18n, {
  en: {
    displayName: 'English',
  },
  ru: {
    displayName: 'Русский',
    search: 'Поиск по документации',
    searchNoResult: 'Ничего не найдено',
    toc: 'Содержание',
    lastUpdate: 'Последнее обновление',
    previousPage: 'Предыдущая',
    nextPage: 'Следующая',
    chooseLanguage: 'Язык',
  },
})

export function baseOptions(locale: string): BaseLayoutProps {
  return {
    nav: {
      title: '@letar/forms',
    },
    links: [
      {
        text: locale === 'ru' ? 'Документация' : 'Documentation',
        url: `/${locale}/docs`,
        active: 'nested-url',
      },
      {
        text: 'GitHub',
        url: 'https://github.com/kamiletar/letar-forms',
      },
      {
        text: 'npm',
        url: 'https://www.npmjs.com/package/@letar/forms',
      },
    ],
  }
}
