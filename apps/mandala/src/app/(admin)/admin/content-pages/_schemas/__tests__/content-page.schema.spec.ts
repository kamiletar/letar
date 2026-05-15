/**
 * Тесты для схемы админки контентных страниц.
 */

import { AdminContentPageFormSchema, createContentPageSchema, updateContentPageSchema } from '../content-page.schema'

describe('AdminContentPageFormSchema', () => {
  const validContentPage = {
    slug: 'about-us',
    title: 'О нас',
    content: '<p>Текст страницы</p>',
  }

  describe('базовые поля', () => {
    it('должен принимать минимальные валидные данные', () => {
      const result = AdminContentPageFormSchema.safeParse(validContentPage)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.slug).toBe('about-us')
        expect(result.data.title).toBe('О нас')
        expect(result.data.content).toBe('<p>Текст страницы</p>')
      }
    })

    it('должен принимать полные данные', () => {
      const fullPage = {
        ...validContentPage,
        titleEn: 'About Us',
        contentEn: '<p>Page content</p>',
        metaTitle: 'SEO заголовок',
        metaDescription: 'SEO описание',
        metaTitleEn: 'SEO title',
        metaDescriptionEn: 'SEO description',
        published: false,
        ogImageId: 'og-image-cuid',
      }

      const result = AdminContentPageFormSchema.safeParse(fullPage)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.titleEn).toBe('About Us')
        expect(result.data.contentEn).toBe('<p>Page content</p>')
        expect(result.data.published).toBe(false)
        expect(result.data.ogImageId).toBe('og-image-cuid')
      }
    })
  })

  describe('slug', () => {
    it('должен принимать пустой slug (валидация на UI уровне)', () => {
      // Генерируемая схема ContentPageCreateFormSchema не имеет .min(1)
      const result = AdminContentPageFormSchema.safeParse({
        ...validContentPage,
        slug: '',
      })
      expect(result.success).toBe(true)
    })

    it('должен отклонять отсутствующий slug', () => {
      const { slug: _, ...withoutSlug } = validContentPage
      const result = AdminContentPageFormSchema.safeParse(withoutSlug)
      expect(result.success).toBe(false)
    })
  })

  describe('title', () => {
    it('должен принимать пустой title (валидация на UI уровне)', () => {
      // Генерируемая схема ContentPageCreateFormSchema не имеет .min(1)
      const result = AdminContentPageFormSchema.safeParse({
        ...validContentPage,
        title: '',
      })
      expect(result.success).toBe(true)
    })

    it('должен принимать длинный title', () => {
      const result = AdminContentPageFormSchema.safeParse({
        ...validContentPage,
        title: 'А'.repeat(200),
      })
      expect(result.success).toBe(true)
    })
  })

  describe('content', () => {
    it('должен принимать пустой content (валидация на UI уровне)', () => {
      // Генерируемая схема ContentPageCreateFormSchema не имеет .min(1)
      const result = AdminContentPageFormSchema.safeParse({
        ...validContentPage,
        content: '',
      })
      expect(result.success).toBe(true)
    })

    it('должен принимать HTML content', () => {
      const result = AdminContentPageFormSchema.safeParse({
        ...validContentPage,
        content: '<h1>Заголовок</h1><p>Параграф</p><ul><li>Пункт</li></ul>',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('опциональные поля', () => {
    it('должен принимать undefined для titleEn', () => {
      const result = AdminContentPageFormSchema.safeParse(validContentPage)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.titleEn).toBeUndefined()
      }
    })

    it('должен принимать undefined для contentEn', () => {
      const result = AdminContentPageFormSchema.safeParse(validContentPage)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.contentEn).toBeUndefined()
      }
    })

    it('должен принимать пустую строку для metaTitle', () => {
      const result = AdminContentPageFormSchema.safeParse({
        ...validContentPage,
        metaTitle: '',
      })
      expect(result.success).toBe(true)
    })

    it('должен принимать пустую строку для metaDescription', () => {
      const result = AdminContentPageFormSchema.safeParse({
        ...validContentPage,
        metaDescription: '',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('ogImageId', () => {
    it('должен принимать undefined', () => {
      const result = AdminContentPageFormSchema.safeParse(validContentPage)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.ogImageId).toBeUndefined()
      }
    })

    it('должен трансформировать пустую строку в null', () => {
      const result = AdminContentPageFormSchema.safeParse({
        ...validContentPage,
        ogImageId: '',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.ogImageId).toBeNull()
      }
    })

    it('должен принимать непустой ogImageId', () => {
      const result = AdminContentPageFormSchema.safeParse({
        ...validContentPage,
        ogImageId: 'og-cuid-123',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.ogImageId).toBe('og-cuid-123')
      }
    })
  })

  describe('defaults', () => {
    it('должен устанавливать published=true по умолчанию', () => {
      const result = AdminContentPageFormSchema.safeParse(validContentPage)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.published).toBe(true)
      }
    })
  })
})

describe('createContentPageSchema', () => {
  it('должен быть алиасом для AdminContentPageFormSchema', () => {
    expect(createContentPageSchema).toBe(AdminContentPageFormSchema)
  })
})

describe('updateContentPageSchema', () => {
  it('должен принимать частичные данные', () => {
    const result = updateContentPageSchema.safeParse({
      title: 'Обновлённый заголовок',
    })
    expect(result.success).toBe(true)
  })

  it('должен принимать пустой объект', () => {
    const result = updateContentPageSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('должен принимать только published', () => {
    const result = updateContentPageSchema.safeParse({
      published: false,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.published).toBe(false)
    }
  })

  it('должен принимать только content', () => {
    const result = updateContentPageSchema.safeParse({
      content: '<p>Новый контент</p>',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.content).toBe('<p>Новый контент</p>')
    }
  })

  it('должен принимать только ogImageId', () => {
    const result = updateContentPageSchema.safeParse({
      ogImageId: 'new-og-image',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ogImageId).toBe('new-og-image')
    }
  })
})
