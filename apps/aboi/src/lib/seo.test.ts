import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { breadcrumbJsonLd, organizationJsonLd, productJsonLd } from './seo'

const ORIGINAL_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL

beforeAll(() => {
  process.env.NEXT_PUBLIC_BASE_URL = 'https://test.example'
})
afterAll(() => {
  process.env.NEXT_PUBLIC_BASE_URL = ORIGINAL_BASE_URL
})

describe('productJsonLd', () => {
  const baseProduct = {
    slug: 'kosmicheskij-orbit',
    name: 'Космический Орбит',
    description: 'Описание',
    pricePerMeter: 150000,
    imageUrls: ['https://test.example/api/files/products/a.jpg'],
  }

  it('имеет корректный @context и @type', () => {
    const ld = productJsonLd(baseProduct)
    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@type']).toBe('Product')
  })

  it('конвертирует цену из копеек в рубли с 2 знаками', () => {
    const ld = productJsonLd(baseProduct)
    const offer = ld.offers as Record<string, unknown>
    expect(offer.price).toBe('1500.00')
    expect(offer.priceCurrency).toBe('RUB')
  })

  it('указывает доступность InStock', () => {
    const ld = productJsonLd(baseProduct)
    const offer = ld.offers as Record<string, unknown>
    expect(offer.availability).toBe('https://schema.org/InStock')
  })

  it('строит URL из BASE_URL и slug', () => {
    const ld = productJsonLd(baseProduct)
    expect(ld.url).toBe('https://test.example/catalog/kosmicheskij-orbit/')
  })

  it('пропускает image, если массив пуст', () => {
    const ld = productJsonLd({ ...baseProduct, imageUrls: [] })
    expect(ld.image).toBeUndefined()
  })

  it('пропускает description, если null', () => {
    const ld = productJsonLd({ ...baseProduct, description: null })
    expect(ld.description).toBeUndefined()
  })
})

describe('breadcrumbJsonLd', () => {
  it('строит позиции 1..N', () => {
    const ld = breadcrumbJsonLd([
      { name: 'Главная', path: '/' },
      { name: 'Каталог', path: '/catalog/' },
      { name: 'Орбит', path: '/catalog/orbit/' },
    ])
    expect(ld['@type']).toBe('BreadcrumbList')
    const items = ld.itemListElement as Array<{ position: number; item: string; name: string }>
    expect(items).toHaveLength(3)
    expect(items[0]!.position).toBe(1)
    expect(items[2]!.position).toBe(3)
    expect(items[2]!.item).toBe('https://test.example/catalog/orbit/')
  })
})

describe('organizationJsonLd', () => {
  it('возвращает Organization с brand-name', () => {
    const ld = organizationJsonLd()
    expect(ld['@type']).toBe('Organization')
    expect(ld.name).toBe('НейроАбоИ')
    expect(ld.url).toBe('https://test.example')
  })
})
