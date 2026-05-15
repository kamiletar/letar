import { describe, expect, it } from 'vitest'
import { createProductSchema, productItemSchema, productVariantSchema, variantImageSchema } from './product'

describe('Product Validation Schemas', () => {
  describe('productItemSchema', () => {
    it('should validate a valid product item', () => {
      const validItem = {
        sizeId: 'size-uuid-123',
        price: 1999.99,
        availableCount: 5,
      }

      const result = productItemSchema.safeParse(validItem)
      expect(result.success).toBe(true)
    })

    it('should fail when sizeId is empty', () => {
      const invalidItem = {
        sizeId: '',
        price: 1999.99,
        availableCount: 5,
      }

      const result = productItemSchema.safeParse(invalidItem)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Размер обязателен')
      }
    })

    it('should fail when price is negative', () => {
      const invalidItem = {
        sizeId: 'size-uuid-123',
        price: -100,
        availableCount: 5,
      }

      const result = productItemSchema.safeParse(invalidItem)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Цена должна быть положительной')
      }
    })

    it('should fail when price has more than 2 decimal places', () => {
      const invalidItem = {
        sizeId: 'size-uuid-123',
        price: 1999.999,
        availableCount: 5,
      }

      const result = productItemSchema.safeParse(invalidItem)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Цена должна иметь не более 2 знаков после запятой')
      }
    })

    it('should coerce string price to number', () => {
      const item = {
        sizeId: 'size-uuid-123',
        price: '1999.99',
        availableCount: 5,
      }

      const result = productItemSchema.safeParse(item)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.price).toBe(1999.99)
        expect(typeof result.data.price).toBe('number')
      }
    })

    it('should default availableCount to 0', () => {
      const item = {
        sizeId: 'size-uuid-123',
        price: 1999.99,
      }

      const result = productItemSchema.safeParse(item)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.availableCount).toBe(0)
      }
    })

    it('should fail when availableCount is negative', () => {
      const invalidItem = {
        sizeId: 'size-uuid-123',
        price: 1999.99,
        availableCount: -1,
      }

      const result = productItemSchema.safeParse(invalidItem)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Количество не может быть отрицательным')
      }
    })

    it('should fail when availableCount is not an integer', () => {
      const invalidItem = {
        sizeId: 'size-uuid-123',
        price: 1999.99,
        availableCount: 5.5,
      }

      const result = productItemSchema.safeParse(invalidItem)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Количество должно быть целым числом')
      }
    })
  })

  describe('variantImageSchema', () => {
    it('should validate a valid image with absolute URL', () => {
      const validImage = {
        url: '/api/files/products/image.jpg',
        alt: 'Product image',
        order: 0,
      }

      const result = variantImageSchema.safeParse(validImage)
      expect(result.success).toBe(true)
    })

    it('should validate image with http URL', () => {
      const validImage = {
        url: 'http://example.com/image.jpg',
        alt: 'Product image',
        order: 0,
      }

      const result = variantImageSchema.safeParse(validImage)
      expect(result.success).toBe(true)
    })

    it('should validate image with https URL', () => {
      const validImage = {
        url: 'https://example.com/image.jpg',
        alt: 'Product image',
        order: 0,
      }

      const result = variantImageSchema.safeParse(validImage)
      expect(result.success).toBe(true)
    })

    it('should fail when URL is empty', () => {
      const invalidImage = {
        url: '',
        alt: 'Product image',
        order: 0,
      }

      const result = variantImageSchema.safeParse(invalidImage)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('URL обязателен')
      }
    })

    it('should fail when URL is relative without leading slash', () => {
      const invalidImage = {
        url: 'uploads/products/image.jpg',
        alt: 'Product image',
        order: 0,
      }

      const result = variantImageSchema.safeParse(invalidImage)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('URL должен быть абсолютным или начинаться с /')
      }
    })

    it('should make alt text optional', () => {
      const validImage = {
        url: '/api/files/products/image.jpg',
        order: 0,
      }

      const result = variantImageSchema.safeParse(validImage)
      expect(result.success).toBe(true)
    })

    it('should default order to 0', () => {
      const image = {
        url: '/api/files/products/image.jpg',
      }

      const result = variantImageSchema.safeParse(image)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.order).toBe(0)
      }
    })

    it('should fail when order is negative', () => {
      const invalidImage = {
        url: '/api/files/products/image.jpg',
        order: -1,
      }

      const result = variantImageSchema.safeParse(invalidImage)
      expect(result.success).toBe(false)
    })
  })

  describe('productVariantSchema', () => {
    it('should validate a valid product variant', () => {
      const validVariant = {
        composition: 'Хлопок 100%',
        color: 'Красный',
        items: [
          {
            sizeId: 'size-uuid-123',
            price: 1999.99,
            availableCount: 5,
          },
        ],
        images: [
          {
            url: '/api/files/products/image.jpg',
            alt: 'Product image',
            order: 0,
          },
        ],
      }

      const result = productVariantSchema.safeParse(validVariant)
      expect(result.success).toBe(true)
    })

    it('should fail when composition is empty', () => {
      const invalidVariant = {
        composition: '',
        color: 'Красный',
        items: [
          {
            sizeId: 'size-uuid-123',
            price: 1999.99,
            availableCount: 5,
          },
        ],
      }

      const result = productVariantSchema.safeParse(invalidVariant)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Состав обязателен')
      }
    })

    it('should fail when color is empty', () => {
      const invalidVariant = {
        composition: 'Хлопок 100%',
        color: '',
        items: [
          {
            sizeId: 'size-uuid-123',
            price: 1999.99,
            availableCount: 5,
          },
        ],
      }

      const result = productVariantSchema.safeParse(invalidVariant)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Цвет обязателен')
      }
    })

    it('should fail when items array is empty', () => {
      const invalidVariant = {
        composition: 'Хлопок 100%',
        color: 'Красный',
        items: [],
      }

      const result = productVariantSchema.safeParse(invalidVariant)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Необходимо добавить хотя бы один размер')
      }
    })

    it('should default images to empty array', () => {
      const variant = {
        composition: 'Хлопок 100%',
        color: 'Красный',
        items: [
          {
            sizeId: 'size-uuid-123',
            price: 1999.99,
            availableCount: 5,
          },
        ],
      }

      const result = productVariantSchema.safeParse(variant)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.images).toEqual([])
      }
    })
  })

  describe('createProductSchema', () => {
    it('should validate a valid product', () => {
      const validProduct = {
        name: 'Платье летнее',
        description: 'Легкое летнее платье',
        variants: [
          {
            composition: 'Хлопок 100%',
            color: 'Красный',
            items: [
              {
                sizeId: 'size-uuid-m',
                price: 1999.99,
                availableCount: 5,
              },
            ],
            images: [],
          },
        ],
      }

      const result = createProductSchema.safeParse(validProduct)
      expect(result.success).toBe(true)
    })

    it('should fail when name is empty', () => {
      const invalidProduct = {
        name: '',
        description: 'Легкое летнее платье',
        variants: [
          {
            composition: 'Хлопок 100%',
            color: 'Красный',
            items: [
              {
                sizeId: 'size-uuid-m',
                price: 1999.99,
                availableCount: 5,
              },
            ],
          },
        ],
      }

      const result = createProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Название обязательно')
      }
    })

    it('should fail when name exceeds 255 characters', () => {
      const invalidProduct = {
        name: 'a'.repeat(256),
        variants: [
          {
            composition: 'Хлопок 100%',
            color: 'Красный',
            items: [
              {
                sizeId: 'size-uuid-m',
                price: 1999.99,
                availableCount: 5,
              },
            ],
          },
        ],
      }

      const result = createProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
    })

    it('should make description optional', () => {
      const validProduct = {
        name: 'Платье летнее',
        variants: [
          {
            composition: 'Хлопок 100%',
            color: 'Красный',
            items: [
              {
                sizeId: 'size-uuid-m',
                price: 1999.99,
                availableCount: 5,
              },
            ],
          },
        ],
      }

      const result = createProductSchema.safeParse(validProduct)
      expect(result.success).toBe(true)
    })

    it('should fail when variants array is empty', () => {
      const invalidProduct = {
        name: 'Платье летнее',
        description: 'Легкое летнее платье',
        variants: [],
      }

      const result = createProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Необходимо добавить хотя бы один вариант')
      }
    })

    it('should validate product with multiple variants', () => {
      const validProduct = {
        name: 'Платье летнее',
        description: 'Легкое летнее платье',
        variants: [
          {
            composition: 'Хлопок 100%',
            color: 'Красный',
            items: [
              { sizeId: 'size-uuid-s', price: 1899.99, availableCount: 3 },
              { sizeId: 'size-uuid-m', price: 1999.99, availableCount: 5 },
            ],
            images: [],
          },
          {
            composition: 'Хлопок 100%',
            color: 'Синий',
            items: [
              { sizeId: 'size-uuid-m', price: 1999.99, availableCount: 2 },
              { sizeId: 'size-uuid-l', price: 2099.99, availableCount: 1 },
            ],
            images: [],
          },
        ],
      }

      const result = createProductSchema.safeParse(validProduct)
      expect(result.success).toBe(true)
    })
  })
})
