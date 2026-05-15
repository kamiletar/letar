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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
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

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPosting) }} />
}
