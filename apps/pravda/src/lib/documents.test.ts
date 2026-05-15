import { describe, expect, it } from 'vitest'

import {
  type DocumentCategory,
  documents,
  getAllDocuments,
  getCategoryFromPath,
  getDocumentBySlug,
  getDocumentsByCategory,
  getTitleMap,
} from './documents'

describe('documents', () => {
  describe('getDocumentBySlug', () => {
    it('должен вернуть документ по существующему slug', () => {
      const doc = getDocumentBySlug('constitution')

      expect(doc).toBeDefined()
      expect(doc?.slug).toBe('constitution')
      expect(doc?.title).toBe('Конституция')
      expect(doc?.category).toBe('Основные законы')
      expect(doc?.href).toBe('/constitution')
    })

    it('должен вернуть undefined для несуществующего slug', () => {
      const doc = getDocumentBySlug('nonexistent')

      expect(doc).toBeUndefined()
    })

    it('должен вернуть документ с shortTitle', () => {
      const doc = getDocumentBySlug('criminal-procedure')

      expect(doc).toBeDefined()
      expect(doc?.shortTitle).toBe('УПК')
      expect(doc?.title).toBe('Уголовно-процессуальный кодекс')
    })
  })

  describe('getDocumentsByCategory', () => {
    it('должен вернуть 2 документа для категории "Основные законы"', () => {
      const docs = getDocumentsByCategory('Основные законы')

      expect(docs).toHaveLength(2)
      expect(docs.map((d) => d.slug)).toEqual(['constitution', 'pravda'])
    })

    it('должен вернуть 11 документов для категории "Кодексы"', () => {
      const docs = getDocumentsByCategory('Кодексы')

      expect(docs).toHaveLength(11)
      // Проверяем первый и последний
      expect(docs[0].slug).toBe('tax')
      expect(docs[docs.length - 1].slug).toBe('state-secrets')
    })

    it('должен вернуть 7 документов для категории "Уставы"', () => {
      const docs = getDocumentsByCategory('Уставы')

      expect(docs).toHaveLength(7)
      expect(docs[0].slug).toBe('church')
      expect(docs[docs.length - 1].slug).toBe('fair')
    })

    it('должен вернуть 3 документа для категории "Регламенты"', () => {
      const docs = getDocumentsByCategory('Регламенты')

      expect(docs).toHaveLength(3)
      expect(docs.map((d) => d.slug)).toEqual(['duel', 'veche', 'municipality'])
    })

    it('должен вернуть пустой массив для несуществующей категории', () => {
      // @ts-expect-error — тестируем edge case с невалидной категорией
      const docs = getDocumentsByCategory('Несуществующая категория')

      expect(docs).toEqual([])
    })
  })

  describe('getAllDocuments', () => {
    it('должен вернуть все 23 документа', () => {
      const docs = getAllDocuments()

      expect(docs).toHaveLength(23)
    })

    it('должен вернуть тот же массив что и documents', () => {
      const docs = getAllDocuments()

      expect(docs).toBe(documents)
    })
  })

  describe('getTitleMap', () => {
    it('должен вернуть маппинг slug -> title/shortTitle', () => {
      const map = getTitleMap()

      expect(map['constitution']).toBe('Конституция')
      expect(map['criminal-procedure']).toBe('УПК') // shortTitle
      expect(map['penal']).toBe('УИК') // shortTitle
      expect(map['tax']).toBe('Налоговый кодекс') // title (нет shortTitle)
    })

    it('должен содержать все 23 slug', () => {
      const map = getTitleMap()

      expect(Object.keys(map)).toHaveLength(23)
    })

    it('должен использовать shortTitle если он есть', () => {
      const map = getTitleMap()
      const docWithShortTitle = getDocumentBySlug('ordeals')

      expect(docWithShortTitle?.shortTitle).toBe('Кодекс ордалий')
      expect(map['ordeals']).toBe('Кодекс ордалий')
    })
  })

  describe('getCategoryFromPath', () => {
    it('должен вернуть "Кодексы" для путей /codes/*', () => {
      expect(getCategoryFromPath('/codes/tax')).toBe('Кодексы')
      expect(getCategoryFromPath('/codes/criminal')).toBe('Кодексы')
      expect(getCategoryFromPath('/codes/family')).toBe('Кодексы')
    })

    it('должен вернуть "Уставы" для путей /statutes/*', () => {
      expect(getCategoryFromPath('/statutes/church')).toBe('Уставы')
      expect(getCategoryFromPath('/statutes/trade')).toBe('Уставы')
      expect(getCategoryFromPath('/statutes/military')).toBe('Уставы')
    })

    it('должен вернуть "Регламенты" для путей /regulations/*', () => {
      expect(getCategoryFromPath('/regulations/duel')).toBe('Регламенты')
      expect(getCategoryFromPath('/regulations/veche')).toBe('Регламенты')
      expect(getCategoryFromPath('/regulations/municipality')).toBe('Регламенты')
    })

    it('должен вернуть "Основные законы" для остальных путей', () => {
      expect(getCategoryFromPath('/constitution')).toBe('Основные законы')
      expect(getCategoryFromPath('/pravda')).toBe('Основные законы')
      expect(getCategoryFromPath('/')).toBe('Основные законы')
      expect(getCategoryFromPath('/unknown')).toBe('Основные законы')
    })
  })

  describe('целостность данных', () => {
    it('все документы должны иметь уникальные slugs', () => {
      const slugs = documents.map((d) => d.slug)
      const uniqueSlugs = new Set(slugs)

      expect(uniqueSlugs.size).toBe(slugs.length)
    })

    it('все документы должны иметь валидные hrefs', () => {
      for (const doc of documents) {
        expect(doc.href).toMatch(/^\//)
        expect(doc.href).not.toContain(' ')
      }
    })

    it('все документы должны иметь непустые title', () => {
      for (const doc of documents) {
        expect(doc.title).toBeTruthy()
        expect(doc.title.length).toBeGreaterThan(0)
      }
    })

    it('все категории должны быть валидными', () => {
      const validCategories: DocumentCategory[] = ['Основные законы', 'Кодексы', 'Уставы', 'Регламенты']

      for (const doc of documents) {
        expect(validCategories).toContain(doc.category)
      }
    })

    it('hrefs должны соответствовать категориям', () => {
      for (const doc of documents) {
        const category = getCategoryFromPath(doc.href)
        expect(category).toBe(doc.category)
      }
    })
  })
})
