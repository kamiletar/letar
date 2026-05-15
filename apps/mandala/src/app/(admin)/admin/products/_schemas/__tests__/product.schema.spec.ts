/**
 * Тесты для схемы админки продуктов.
 */

import { AdminProductFormSchema, createProductSchema, productImageSchema, updateProductSchema } from '../product.schema'

describe('productImageSchema', () => {
  it('должен принимать валидные данные', () => {
    const result = productImageSchema.safeParse({
      imageId: 'cuid12345',
      order: 0,
    })
    expect(result.success).toBe(true)
  })

  it('должен отклонять пустой imageId', () => {
    const result = productImageSchema.safeParse({
      imageId: '',
      order: 0,
    })
    expect(result.success).toBe(false)
  })

  it('должен отклонять отрицательный order', () => {
    const result = productImageSchema.safeParse({
      imageId: 'cuid12345',
      order: -1,
    })
    expect(result.success).toBe(false)
  })

  it('должен принимать order=0', () => {
    const result = productImageSchema.safeParse({
      imageId: 'cuid12345',
      order: 0,
    })
    expect(result.success).toBe(true)
  })
})

describe('AdminProductFormSchema', () => {
  const validProduct = {
    slug: 'handmade-bracelet',
    name: 'Браслет ручной работы',
    description: 'Уникальный браслет',
    price: 1500,
  }

  describe('базовые поля', () => {
    it('должен принимать минимальные валидные данные', () => {
      const result = AdminProductFormSchema.safeParse(validProduct)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.slug).toBe('handmade-bracelet')
        expect(result.data.name).toBe('Браслет ручной работы')
        expect(result.data.price).toBe(1500)
      }
    })

    it('должен принимать полные данные', () => {
      const fullProduct = {
        ...validProduct,
        nameEn: 'Handmade Bracelet',
        descriptionEn: 'Unique bracelet',
        metaTitle: 'SEO заголовок',
        metaDescription: 'SEO описание',
        metaTitleEn: 'SEO title',
        metaDescriptionEn: 'SEO description',
        order: 5,
        published: false,
        stock: 10,
        productImages: [
          { imageId: 'img1', order: 0 },
          { imageId: 'img2', order: 1 },
        ],
        ogImageId: 'og-image-cuid',
      }

      const result = AdminProductFormSchema.safeParse(fullProduct)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.stock).toBe(10)
        expect(result.data.productImages).toHaveLength(2)
        expect(result.data.ogImageId).toBe('og-image-cuid')
      }
    })
  })

  describe('price', () => {
    it('должен принимать цену 0', () => {
      const result = AdminProductFormSchema.safeParse({
        ...validProduct,
        price: 0,
      })
      expect(result.success).toBe(true)
    })

    it('должен отклонять отрицательную цену', () => {
      const result = AdminProductFormSchema.safeParse({
        ...validProduct,
        price: -100,
      })
      expect(result.success).toBe(false)
    })

    it('должен отклонять дробную цену', () => {
      const result = AdminProductFormSchema.safeParse({
        ...validProduct,
        price: 99.99,
      })
      expect(result.success).toBe(false)
    })

    it('должен принимать целую цену', () => {
      const result = AdminProductFormSchema.safeParse({
        ...validProduct,
        price: 2500,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('stock', () => {
    it('должен устанавливать stock=1 по умолчанию', () => {
      const result = AdminProductFormSchema.safeParse(validProduct)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.stock).toBe(1)
      }
    })

    it('должен принимать stock=0', () => {
      const result = AdminProductFormSchema.safeParse({
        ...validProduct,
        stock: 0,
      })
      expect(result.success).toBe(true)
    })

    it('должен отклонять отрицательный stock', () => {
      const result = AdminProductFormSchema.safeParse({
        ...validProduct,
        stock: -1,
      })
      expect(result.success).toBe(false)
    })

    it('должен отклонять дробный stock', () => {
      const result = AdminProductFormSchema.safeParse({
        ...validProduct,
        stock: 1.5,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('productImages', () => {
    it('должен устанавливать пустой массив по умолчанию', () => {
      const result = AdminProductFormSchema.safeParse(validProduct)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.productImages).toEqual([])
      }
    })

    it('должен принимать массив изображений', () => {
      const result = AdminProductFormSchema.safeParse({
        ...validProduct,
        productImages: [
          { imageId: 'img1', order: 0 },
          { imageId: 'img2', order: 1 },
          { imageId: 'img3', order: 2 },
        ],
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.productImages).toHaveLength(3)
      }
    })

    it('должен отклонять массив с невалидным изображением', () => {
      const result = AdminProductFormSchema.safeParse({
        ...validProduct,
        productImages: [
          { imageId: 'img1', order: 0 },
          { imageId: '', order: 1 }, // Пустой imageId
        ],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('ogImageId', () => {
    it('должен принимать undefined', () => {
      const result = AdminProductFormSchema.safeParse(validProduct)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.ogImageId).toBeUndefined()
      }
    })

    it('должен трансформировать пустую строку в null', () => {
      const result = AdminProductFormSchema.safeParse({
        ...validProduct,
        ogImageId: '',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.ogImageId).toBeNull()
      }
    })

    it('должен принимать непустой ogImageId', () => {
      const result = AdminProductFormSchema.safeParse({
        ...validProduct,
        ogImageId: 'og-image-cuid',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.ogImageId).toBe('og-image-cuid')
      }
    })
  })

  describe('defaults', () => {
    it('должен устанавливать order=0 по умолчанию', () => {
      const result = AdminProductFormSchema.safeParse(validProduct)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.order).toBe(0)
      }
    })

    it('должен устанавливать published=true по умолчанию', () => {
      const result = AdminProductFormSchema.safeParse(validProduct)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.published).toBe(true)
      }
    })
  })
})

describe('createProductSchema', () => {
  it('должен быть алиасом для AdminProductFormSchema', () => {
    expect(createProductSchema).toBe(AdminProductFormSchema)
  })
})

describe('updateProductSchema', () => {
  it('должен принимать частичные данные', () => {
    const result = updateProductSchema.safeParse({
      price: 2000,
    })
    expect(result.success).toBe(true)
  })

  it('должен принимать пустой объект', () => {
    const result = updateProductSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('должен принимать только stock', () => {
    const result = updateProductSchema.safeParse({
      stock: 5,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.stock).toBe(5)
    }
  })

  it('должен принимать только productImages', () => {
    const result = updateProductSchema.safeParse({
      productImages: [{ imageId: 'new-img', order: 0 }],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.productImages).toHaveLength(1)
    }
  })
})
