/**
 * SEO константы и утилиты.
 * Единый источник для метаданных, OpenGraph и JSON-LD.
 */

import type { Metadata } from 'next'

import { type DocumentInfo, documents } from './documents'

/** Базовый URL сайта */
export const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pravda.letar.best'

/** Название сайта */
export const SITE_NAME = 'Pravda — Свод законов Руси'

/** Описание сайта */
export const SITE_DESCRIPTION =
  'Официальный свод законов Руси. Конституция, кодексы, уставы и регламенты. 22 документа, 1337 статей.'

/** Ключевые слова */
export const SITE_KEYWORDS = [
  'законодательство',
  'Русь',
  'Конституция',
  'кодексы',
  'уставы',
  'регламенты',
  'право',
  'законы РФ',
]

/**
 * Получить документ по href.
 */
export function getDocumentByHref(href: string): DocumentInfo | undefined {
  return documents.find((d) => d.href === href)
}

/**
 * Получить путь к статическому OG Image.
 * /constitution -> /og/constitution.png
 * /codes/tax -> /og/codes-tax.png
 */
export function getOgImagePath(href: string): string {
  return '/og/' + href.slice(1).replace(/\//g, '-') + '.png'
}

/**
 * Генерирует metadata для страницы документа.
 */
export function getDocumentMetadata(href: string): Metadata {
  const doc = getDocumentByHref(href)

  if (!doc) {
    return { title: 'Документ не найден' }
  }

  const description = doc.description || `${doc.title} — ${doc.category} Руси`
  const ogImage = getOgImagePath(doc.href)

  return {
    title: doc.title,
    description,
    alternates: {
      canonical: doc.href,
    },
    openGraph: {
      type: 'article',
      title: doc.title,
      description,
      url: `${BASE_URL}${doc.href}`,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: doc.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: doc.title,
      description,
      images: [ogImage],
    },
  }
}

/**
 * Генерирует metadata для страницы категории.
 */
export function getCategoryMetadata(title: string, description: string, href: string): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: href,
    },
    openGraph: {
      type: 'website',
      title: `${title} | Pravda`,
      description,
      url: `${BASE_URL}${href}`,
    },
    twitter: {
      card: 'summary',
      title: `${title} | Pravda`,
      description,
    },
  }
}
