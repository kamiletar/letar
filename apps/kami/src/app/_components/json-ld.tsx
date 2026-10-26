import { JsonLdScript, toJsonLdHtml } from '@letar/seo'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'

type JsonLdProps = {
  locale: string
}

/**
 * JSON-LD структурированные данные для SEO
 * Включает: Person (автор), WebSite (сайт)
 */
export function JsonLd({ locale }: JsonLdProps) {
  const isRu = locale === 'ru'

  // Данные об авторе
  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: isRu ? 'Ками Летар' : 'Kami Letar',
    alternateName: 'Kami',
    url: `${BASE_URL}/${locale}/`,
    image: `${BASE_URL}/images/avatar.jpg`,
    jobTitle: isRu ? 'Архитектор программного обеспечения' : 'Software Architect',
    description: isRu
      ? 'Архитектор программного обеспечения. Специализируюсь на React, Next.js, TypeScript.'
      : 'Software architect. Specializing in React, Next.js, TypeScript.',
    sameAs: ['https://github.com/xKami-dev', 'https://t.me/xKami'],
    knowsAbout: ['React', 'Next.js', 'TypeScript', 'Node.js', 'Software Architecture', 'Fullstack Development'],
  }

  // Данные о сайте
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: isRu ? 'Ками Летар — Портфолио' : 'Kami Letar — Portfolio',
    url: `${BASE_URL}/${locale}/`,
    description: isRu
      ? 'Персональный сайт архитектора ПО. Проекты, навыки, блог.'
      : 'Software architect portfolio. Projects, skills, blog.',
    author: {
      '@type': 'Person',
      name: isRu ? 'Ками Летар' : 'Kami Letar',
    },
    inLanguage: isRu ? 'ru-RU' : 'en-US',
  }

  return (
    <>
      <JsonLdScript html={toJsonLdHtml(person)} />
      <JsonLdScript html={toJsonLdHtml(website)} />
    </>
  )
}

type BlogPostingJsonLdProps = {
  locale: string
  title: string
  description: string
  slug: string
  publishedAt: string
  tags?: readonly string[]
}

/**
 * JSON-LD для страницы блога
 */
export function BlogPostingJsonLd({ locale, title, description, slug, publishedAt, tags }: BlogPostingJsonLdProps) {
  const isRu = locale === 'ru'

  const blogPosting = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: description,
    url: `${BASE_URL}/${locale}/blog/${slug}/`,
    datePublished: publishedAt,
    dateModified: publishedAt,
    author: {
      '@type': 'Person',
      name: isRu ? 'Ками Летар' : 'Kami Letar',
      url: `${BASE_URL}/${locale}/`,
    },
    publisher: {
      '@type': 'Person',
      name: isRu ? 'Ками Летар' : 'Kami Letar',
    },
    inLanguage: isRu ? 'ru-RU' : 'en-US',
    keywords: tags?.join(', '),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/${locale}/blog/${slug}/`,
    },
  }

  return <JsonLdScript html={toJsonLdHtml(blogPosting)} />
}

/** JSON-LD FAQPage для вопросов и ответов посадочной. */
export function FaqJsonLd({ items }: { items: readonly { q: string; a: string }[] }) {
  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return <JsonLdScript html={toJsonLdHtml(faqPage)} />
}
