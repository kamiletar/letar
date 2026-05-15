/**
 * Тесты для схемы админки мандал.
 */

import { AdminMandalaFormSchema, createMandalaSchema, updateMandalaSchema } from '../mandala.schema'

describe('AdminMandalaFormSchema', () => {
  const validMandala = {
    slug: 'harmony-mandala',
    name: 'Мандала гармонии',
    imageId: 'cuid12345',
  }

  describe('базовые поля', () => {
    it('должен принимать минимальные валидные данные', () => {
      const result = AdminMandalaFormSchema.safeParse(validMandala)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.slug).toBe('harmony-mandala')
        expect(result.data.name).toBe('Мандала гармонии')
        expect(result.data.imageId).toBe('cuid12345')
      }
    })

    it('должен принимать полные данные', () => {
      const fullMandala = {
        ...validMandala,
        description: 'Мандала для медитации',
        nameEn: 'Harmony Mandala',
        descriptionEn: 'Mandala for meditation',
        isSquare: true,
        metaTitle: 'SEO заголовок',
        metaDescription: 'SEO описание',
        metaKeywords: 'мандала, гармония',
        metaTitleEn: 'SEO title',
        metaDescriptionEn: 'SEO description',
        defaultEffectIndex: 3,
        order: 10,
        published: false,
        centerImageId: 'center123',
        watermarkId: 'watermark456',
        ogImageId: 'og789',
      }

      const result = AdminMandalaFormSchema.safeParse(fullMandala)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isSquare).toBe(true)
        expect(result.data.defaultEffectIndex).toBe(3)
        expect(result.data.centerImageId).toBe('center123')
        expect(result.data.watermarkId).toBe('watermark456')
        expect(result.data.ogImageId).toBe('og789')
      }
    })
  })

  describe('imageId (обязательное)', () => {
    it('должен отклонять пустой imageId', () => {
      const result = AdminMandalaFormSchema.safeParse({
        ...validMandala,
        imageId: '',
      })
      expect(result.success).toBe(false)
    })

    it('должен отклонять отсутствующий imageId', () => {
      const { imageId: _, ...withoutImageId } = validMandala
      const result = AdminMandalaFormSchema.safeParse(withoutImageId)
      expect(result.success).toBe(false)
    })
  })

  describe('опциональные изображения', () => {
    it('должен принимать undefined для centerImageId', () => {
      const result = AdminMandalaFormSchema.safeParse(validMandala)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.centerImageId).toBeUndefined()
      }
    })

    it('должен трансформировать пустую строку centerImageId в null', () => {
      const result = AdminMandalaFormSchema.safeParse({
        ...validMandala,
        centerImageId: '',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.centerImageId).toBeNull()
      }
    })

    it('должен принимать непустой watermarkId', () => {
      const result = AdminMandalaFormSchema.safeParse({
        ...validMandala,
        watermarkId: 'watermark-cuid',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.watermarkId).toBe('watermark-cuid')
      }
    })

    it('должен принимать непустой ogImageId', () => {
      const result = AdminMandalaFormSchema.safeParse({
        ...validMandala,
        ogImageId: 'og-image-cuid',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.ogImageId).toBe('og-image-cuid')
      }
    })
  })

  describe('defaultEffectIndex', () => {
    it('должен принимать значение 0', () => {
      const result = AdminMandalaFormSchema.safeParse({
        ...validMandala,
        defaultEffectIndex: 0,
      })
      expect(result.success).toBe(true)
    })

    it('должен принимать значение 6', () => {
      const result = AdminMandalaFormSchema.safeParse({
        ...validMandala,
        defaultEffectIndex: 6,
      })
      expect(result.success).toBe(true)
    })

    it('должен отклонять значение больше 6', () => {
      const result = AdminMandalaFormSchema.safeParse({
        ...validMandala,
        defaultEffectIndex: 7,
      })
      expect(result.success).toBe(false)
    })

    it('должен отклонять отрицательное значение', () => {
      const result = AdminMandalaFormSchema.safeParse({
        ...validMandala,
        defaultEffectIndex: -1,
      })
      expect(result.success).toBe(false)
    })

    it('должен отклонять дробное значение', () => {
      const result = AdminMandalaFormSchema.safeParse({
        ...validMandala,
        defaultEffectIndex: 2.5,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('order', () => {
    it('должен принимать положительное целое число', () => {
      const result = AdminMandalaFormSchema.safeParse({
        ...validMandala,
        order: 100,
      })
      expect(result.success).toBe(true)
    })

    it('должен отклонять отрицательное значение', () => {
      const result = AdminMandalaFormSchema.safeParse({
        ...validMandala,
        order: -1,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('defaults', () => {
    it('должен устанавливать isSquare=false по умолчанию', () => {
      const result = AdminMandalaFormSchema.safeParse(validMandala)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isSquare).toBe(false)
      }
    })

    it('должен устанавливать defaultEffectIndex=0 по умолчанию', () => {
      const result = AdminMandalaFormSchema.safeParse(validMandala)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.defaultEffectIndex).toBe(0)
      }
    })

    it('должен устанавливать order=0 по умолчанию', () => {
      const result = AdminMandalaFormSchema.safeParse(validMandala)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.order).toBe(0)
      }
    })

    it('должен устанавливать published=true по умолчанию', () => {
      const result = AdminMandalaFormSchema.safeParse(validMandala)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.published).toBe(true)
      }
    })
  })
})

describe('createMandalaSchema', () => {
  it('должен быть алиасом для AdminMandalaFormSchema', () => {
    expect(createMandalaSchema).toBe(AdminMandalaFormSchema)
  })
})

describe('updateMandalaSchema', () => {
  it('должен принимать частичные данные', () => {
    const result = updateMandalaSchema.safeParse({
      name: 'Обновлённое название',
    })
    expect(result.success).toBe(true)
  })

  it('должен принимать пустой объект', () => {
    const result = updateMandalaSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('должен принимать только imageId', () => {
    const result = updateMandalaSchema.safeParse({
      imageId: 'new-image-id',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.imageId).toBe('new-image-id')
    }
  })
})
