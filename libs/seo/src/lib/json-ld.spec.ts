import { describe, expect, it } from 'vitest'
import { breadcrumbJsonLd, faqJsonLd, organizationJsonLd } from './json-ld'

describe('breadcrumbJsonLd', () => {
  it('строит BreadcrumbList с абсолютными ссылками', () => {
    const ld = breadcrumbJsonLd('https://example.com', [
      { name: 'Главная', path: '/' },
      { name: 'Каталог', path: '/catalog' },
    ])

    expect(ld).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Главная', item: 'https://example.com/' },
        { '@type': 'ListItem', position: 2, name: 'Каталог', item: 'https://example.com/catalog' },
      ],
    })
  })
})

describe('organizationJsonLd', () => {
  it('строит Organization из переданных параметров', () => {
    const ld = organizationJsonLd({
      name: 'Тестовая компания',
      url: 'https://example.com',
      description: 'Описание',
    })

    expect(ld).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Тестовая компания',
      url: 'https://example.com',
      description: 'Описание',
    })
  })

  it('description необязателен', () => {
    const ld = organizationJsonLd({ name: 'X', url: 'https://x.example' })
    expect(ld.description).toBeUndefined()
  })

  it('принимает legalName, контакты, соцсети и логотип', () => {
    const ld = organizationJsonLd({
      name: 'Тестовая компания',
      url: 'https://example.com',
      legalName: 'ИП Тестов Т.Т.',
      email: 'info@example.com',
      telephone: '+7 900 000-00-00',
      sameAs: ['https://vk.com/example'],
      logo: 'https://example.com/logo.png',
    })

    expect(ld.legalName).toBe('ИП Тестов Т.Т.')
    expect(ld.email).toBe('info@example.com')
    expect(ld.telephone).toBe('+7 900 000-00-00')
    expect(ld.sameAs).toEqual(['https://vk.com/example'])
    expect(ld.logo).toBe('https://example.com/logo.png')
  })
})

describe('faqJsonLd', () => {
  it('строит FAQPage с Question/Answer по каждому пункту', () => {
    const ld = faqJsonLd([
      { question: 'Вопрос 1?', answer: 'Ответ 1.' },
      { question: 'Вопрос 2?', answer: 'Ответ 2.' },
    ])

    expect(ld).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Вопрос 1?',
          acceptedAnswer: { '@type': 'Answer', text: 'Ответ 1.' },
        },
        {
          '@type': 'Question',
          name: 'Вопрос 2?',
          acceptedAnswer: { '@type': 'Answer', text: 'Ответ 2.' },
        },
      ],
    })
  })

  it('пустой список даёт пустой mainEntity', () => {
    expect(faqJsonLd([])).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [],
    })
  })
})
