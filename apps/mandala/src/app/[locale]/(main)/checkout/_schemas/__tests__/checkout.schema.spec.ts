/**
 * Тесты для схем checkout и корзины.
 */

import { CartItemDataSchema, CartItemsArraySchema } from '../checkout.schema'

describe('CartItemDataSchema', () => {
  const validCartItem = {
    productId: 'prod-123',
    productSlug: 'test-product',
    name: 'Тестовый товар',
    price: 1500,
    quantity: 2,
  }

  it('должен принимать валидный элемент корзины', () => {
    const result = CartItemDataSchema.safeParse(validCartItem)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(validCartItem)
    }
  })

  describe('productId', () => {
    it('должен отклонять пустой productId', () => {
      const result = CartItemDataSchema.safeParse({ ...validCartItem, productId: '' })
      expect(result.success).toBe(false)
    })

    it('должен отклонять undefined productId', () => {
      const { productId: _, ...withoutProductId } = validCartItem
      const result = CartItemDataSchema.safeParse(withoutProductId)
      expect(result.success).toBe(false)
    })
  })

  describe('productSlug', () => {
    it('должен отклонять пустой productSlug', () => {
      const result = CartItemDataSchema.safeParse({ ...validCartItem, productSlug: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('name', () => {
    it('должен отклонять пустое название', () => {
      const result = CartItemDataSchema.safeParse({ ...validCartItem, name: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('price', () => {
    it('должен отклонять нулевую цену', () => {
      const result = CartItemDataSchema.safeParse({ ...validCartItem, price: 0 })
      expect(result.success).toBe(false)
    })

    it('должен отклонять отрицательную цену', () => {
      const result = CartItemDataSchema.safeParse({ ...validCartItem, price: -100 })
      expect(result.success).toBe(false)
    })

    it('должен принимать дробную цену', () => {
      const result = CartItemDataSchema.safeParse({ ...validCartItem, price: 99.99 })
      expect(result.success).toBe(true)
    })
  })

  describe('quantity', () => {
    it('должен отклонять нулевое количество', () => {
      const result = CartItemDataSchema.safeParse({ ...validCartItem, quantity: 0 })
      expect(result.success).toBe(false)
    })

    it('должен отклонять отрицательное количество', () => {
      const result = CartItemDataSchema.safeParse({ ...validCartItem, quantity: -1 })
      expect(result.success).toBe(false)
    })

    it('должен отклонять дробное количество', () => {
      const result = CartItemDataSchema.safeParse({ ...validCartItem, quantity: 1.5 })
      expect(result.success).toBe(false)
    })

    it('должен принимать положительное целое количество', () => {
      const result = CartItemDataSchema.safeParse({ ...validCartItem, quantity: 10 })
      expect(result.success).toBe(true)
    })
  })
})

describe('CartItemsArraySchema', () => {
  const validCartItem = {
    productId: 'prod-123',
    productSlug: 'test-product',
    name: 'Тестовый товар',
    price: 1500,
    quantity: 2,
  }

  it('должен принимать массив с одним элементом', () => {
    const result = CartItemsArraySchema.safeParse([validCartItem])
    expect(result.success).toBe(true)
  })

  it('должен принимать массив с несколькими элементами', () => {
    const result = CartItemsArraySchema.safeParse([
      validCartItem,
      { ...validCartItem, productId: 'prod-456', productSlug: 'another-product' },
    ])
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(2)
    }
  })

  it('должен отклонять пустой массив', () => {
    const result = CartItemsArraySchema.safeParse([])
    expect(result.success).toBe(false)
  })

  it('должен отклонять массив с невалидным элементом', () => {
    const result = CartItemsArraySchema.safeParse([
      validCartItem,
      { ...validCartItem, price: -100 }, // Невалидная цена
    ])
    expect(result.success).toBe(false)
  })

  it('должен отклонять не-массив', () => {
    const result = CartItemsArraySchema.safeParse(validCartItem)
    expect(result.success).toBe(false)
  })

  it('должен отклонять null', () => {
    const result = CartItemsArraySchema.safeParse(null)
    expect(result.success).toBe(false)
  })
})
