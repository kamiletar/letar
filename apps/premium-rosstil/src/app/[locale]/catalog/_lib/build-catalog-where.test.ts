import { describe, expect, it } from 'vitest'
import { buildCatalogWhere } from './build-catalog-where'

describe('buildCatalogWhere', () => {
  it('возвращает пустой объект без параметров', () => {
    expect(buildCatalogWhere({})).toEqual({})
  })

  it('фильтрует по продавцу', () => {
    const result = buildCatalogWhere({ seller: 'premium-rosstil' })
    expect(result).toEqual({ seller: { slug: 'premium-rosstil' } })
  })

  it('фильтрует по категории', () => {
    const result = buildCatalogWhere({ category: 'dresses' })
    expect(result).toEqual({ category: { slug: 'dresses' } })
  })

  it('фильтрует по гендеру', () => {
    const result = buildCatalogWhere({ gender: 'FEMALE' })
    expect(result).toEqual({ gender: 'FEMALE' })
  })

  it('фильтрует по новой коллекции', () => {
    const result = buildCatalogWhere({ newCollection: true })
    expect(result).toEqual({ isNewCollection: true })
  })

  it('фильтрует по текстовому запросу (OR по name и description)', () => {
    const result = buildCatalogWhere({ query: 'платье' })
    expect(result).toEqual({
      OR: [
        { name: { contains: 'платье', mode: 'insensitive' } },
        { description: { contains: 'платье', mode: 'insensitive' } },
      ],
    })
  })

  it('фильтрует по цвету', () => {
    const result = buildCatalogWhere({ color: 'red' })
    expect(result).toEqual({
      variants: { some: { colorRef: { slug: 'red' } } },
    })
  })

  it('фильтрует по размеру', () => {
    const result = buildCatalogWhere({ size: 'M' })
    expect(result).toEqual({
      variants: { some: { items: { some: { size: { international: 'M' } } } } },
    })
  })

  it('комбинирует цвет + размер в один variants.some', () => {
    const result = buildCatalogWhere({ color: 'red', size: 'M' })
    expect(result).toEqual({
      variants: {
        some: {
          colorRef: { slug: 'red' },
          items: { some: { size: { international: 'M' } } },
        },
      },
    })
  })

  it('фильтрует по минимальной цене', () => {
    const result = buildCatalogWhere({ minPrice: 1000 })
    expect(result).toEqual({
      variants: { some: { items: { some: { price: { gte: 1000 } } } } },
    })
  })

  it('фильтрует по максимальной цене', () => {
    const result = buildCatalogWhere({ maxPrice: 5000 })
    expect(result).toEqual({
      variants: { some: { items: { some: { price: { lte: 5000 } } } } },
    })
  })

  it('фильтрует по диапазону цены', () => {
    const result = buildCatalogWhere({ minPrice: 1000, maxPrice: 5000 })
    expect(result).toEqual({
      variants: { some: { items: { some: { price: { gte: 1000, lte: 5000 } } } } },
    })
  })

  it('комбинирует цвет + цену', () => {
    const result = buildCatalogWhere({ color: 'blue', minPrice: 2000 })
    expect(result).toEqual({
      variants: {
        some: {
          colorRef: { slug: 'blue' },
          items: { some: { price: { gte: 2000 } } },
        },
      },
    })
  })

  it('комбинирует размер + цену', () => {
    const result = buildCatalogWhere({ size: 'L', maxPrice: 10000 })
    expect(result).toEqual({
      variants: {
        some: {
          items: {
            some: {
              size: { international: 'L' },
              price: { lte: 10000 },
            },
          },
        },
      },
    })
  })

  it('комбинирует цвет + размер + цену', () => {
    const result = buildCatalogWhere({ color: 'black', size: 'S', minPrice: 500, maxPrice: 3000 })
    expect(result).toEqual({
      variants: {
        some: {
          colorRef: { slug: 'black' },
          items: {
            some: {
              size: { international: 'S' },
              price: { gte: 500, lte: 3000 },
            },
          },
        },
      },
    })
  })

  it('комбинирует все параметры', () => {
    const result = buildCatalogWhere({
      seller: 'shop',
      category: 'jackets',
      gender: 'MALE',
      newCollection: true,
      query: 'куртка',
      color: 'navy',
      size: 'XL',
      minPrice: 3000,
      maxPrice: 15000,
    })

    expect(result.seller).toEqual({ slug: 'shop' })
    expect(result.category).toEqual({ slug: 'jackets' })
    expect(result.gender).toBe('MALE')
    expect(result.isNewCollection).toBe(true)
    expect(result.OR).toHaveLength(2)
    expect(result.variants).toEqual({
      some: {
        colorRef: { slug: 'navy' },
        items: {
          some: {
            size: { international: 'XL' },
            price: { gte: 3000, lte: 15000 },
          },
        },
      },
    })
  })

  it('не добавляет фильтры для falsy значений', () => {
    const result = buildCatalogWhere({
      category: '',
      gender: '',
      query: '',
      color: '',
      size: '',
      newCollection: false,
    })
    expect(result).toEqual({})
  })
})
