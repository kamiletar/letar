import { describe, expect, it } from 'vitest'
import { generateProductSlug, slugify } from './slugify'

describe('slugify', () => {
  describe('Russian transliteration', () => {
    // Примечание: ь -> '' (пустая строка) в транслитерации
    it('should transliterate "Платье летнее" to "plate-letnee"', () => {
      expect(slugify('Платье летнее')).toBe('plate-letnee')
    })

    it('should transliterate "Юбка женская" to "yubka-zhenskaya"', () => {
      expect(slugify('Юбка женская')).toBe('yubka-zhenskaya')
    })

    it('should transliterate "Щётка" to "shchyotka"', () => {
      expect(slugify('Щётка')).toBe('shchyotka')
    })

    it('should transliterate "Хлопок" to "khlopok"', () => {
      expect(slugify('Хлопок')).toBe('khlopok')
    })

    it('should transliterate "Цвет красный" to "tsvet-krasnyy"', () => {
      expect(slugify('Цвет красный')).toBe('tsvet-krasnyy')
    })

    it('should handle "ё" as "yo"', () => {
      expect(slugify('Зелёный')).toBe('zelyonyy')
    })

    it('should handle "ъ" and "ь" (soft signs)', () => {
      expect(slugify('Объявление')).toBe('obyavlenie')
      expect(slugify('Письмо')).toBe('pismo')
    })
  })

  describe('Case handling', () => {
    it('should convert uppercase to lowercase', () => {
      expect(slugify('ПЛАТЬЕ ЛЕТНЕЕ')).toBe('plate-letnee')
    })

    it('should convert mixed case to lowercase', () => {
      expect(slugify('Платье Летнее')).toBe('plate-letnee')
    })

    it('should handle all caps Russian', () => {
      expect(slugify('КРАСНОЕ')).toBe('krasnoe')
    })
  })

  describe('Special characters removal', () => {
    it('should remove punctuation', () => {
      expect(slugify('Платье, летнее!')).toBe('plate-letnee')
    })

    it('should remove parentheses', () => {
      expect(slugify('Платье (новое)')).toBe('plate-novoe')
    })

    it('should remove quotes', () => {
      expect(slugify('Платье "Лето"')).toBe('plate-leto')
    })

    it('should remove special symbols', () => {
      expect(slugify('Платье@#$%^&*летнее')).toBe('plate-letnee')
    })

    it('should handle numbers', () => {
      expect(slugify('Платье 2024')).toBe('plate-2024')
    })
  })

  describe('Whitespace handling', () => {
    it('should replace single space with hyphen', () => {
      expect(slugify('Платье летнее')).toBe('plate-letnee')
    })

    it('should replace multiple spaces with single hyphen', () => {
      expect(slugify('Платье    летнее')).toBe('plate-letnee')
    })

    it('should trim leading spaces', () => {
      expect(slugify('  Платье летнее')).toBe('plate-letnee')
    })

    it('should trim trailing spaces', () => {
      expect(slugify('Платье летнее  ')).toBe('plate-letnee')
    })

    it('should handle tabs and newlines', () => {
      // Табы и переносы заменяются на пробелы, которые становятся дефисами
      expect(slugify('Платье\t\nлетнее')).toBe('plate-letnee')
    })
  })

  describe('Hyphen handling', () => {
    it('should preserve hyphens in middle', () => {
      expect(slugify('Платье-сарафан')).toBe('plate-sarafan')
    })

    it('should replace multiple hyphens with single', () => {
      expect(slugify('Платье---летнее')).toBe('plate-letnee')
    })

    it('should remove leading hyphens', () => {
      expect(slugify('---Платье летнее')).toBe('plate-letnee')
    })

    it('should remove trailing hyphens', () => {
      expect(slugify('Платье летнее---')).toBe('plate-letnee')
    })
  })

  describe('Underscore handling', () => {
    it('should replace underscores with hyphens', () => {
      expect(slugify('Платье_летнее')).toBe('plate-letnee')
    })

    it('should replace multiple underscores', () => {
      expect(slugify('Платье___летнее')).toBe('plate-letnee')
    })
  })

  describe('Latin characters', () => {
    it('should preserve Latin lowercase', () => {
      expect(slugify('dress summer')).toBe('dress-summer')
    })

    it('should convert Latin uppercase to lowercase', () => {
      expect(slugify('DRESS SUMMER')).toBe('dress-summer')
    })

    it('should handle mixed Cyrillic and Latin', () => {
      expect(slugify('Платье dress')).toBe('plate-dress')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      expect(slugify('')).toBe('')
    })

    it('should handle single character', () => {
      expect(slugify('а')).toBe('a')
    })

    it('should handle only spaces', () => {
      expect(slugify('   ')).toBe('')
    })

    it('should handle only special characters', () => {
      expect(slugify('!@#$%^&*()')).toBe('')
    })

    it('should handle numbers only', () => {
      expect(slugify('12345')).toBe('12345')
    })

    it('should handle mixed content', () => {
      expect(slugify('Платье 100% хлопок, размер M')).toBe('plate-100-khlopok-razmer-m')
    })
  })
})

describe('generateProductSlug', () => {
  describe('Product name only', () => {
    it('should generate slug from product name', () => {
      expect(generateProductSlug('Платье летнее')).toBe('plate-letnee')
    })

    it('should handle complex product name', () => {
      expect(generateProductSlug('Платье-сарафан летнее')).toBe('plate-sarafan-letnee')
    })
  })

  describe('Product name with color', () => {
    it('should generate slug with color', () => {
      expect(generateProductSlug('Платье летнее', 'Красный')).toBe('plate-letnee-krasnyy')
    })

    it('should handle multiple word color', () => {
      expect(generateProductSlug('Платье', 'Тёмно-синий')).toBe('plate-tyomno-siniy')
    })
  })

  describe('Product name with size', () => {
    it('should generate slug with size', () => {
      expect(generateProductSlug('Платье летнее', undefined, 'M')).toBe('plate-letnee-m')
    })

    it('should handle Russian size', () => {
      expect(generateProductSlug('Платье', undefined, '48')).toBe('plate-48')
    })
  })

  describe('Full slug with all parameters', () => {
    it('should generate full slug with name, color, and size', () => {
      expect(generateProductSlug('Платье летнее', 'Красный', 'M')).toBe('plate-letnee-krasnyy-m')
    })

    it('should handle complex full slug', () => {
      expect(generateProductSlug('Юбка женская', 'Тёмно-синий', '46-48')).toBe('yubka-zhenskaya-tyomno-siniy-46-48')
    })

    it('should handle all Russian parameters', () => {
      expect(generateProductSlug('Платье вечернее', 'Чёрный', 'Размер 46')).toBe('plate-vechernee-chyornyy-razmer-46')
    })
  })

  describe('Optional parameters', () => {
    it('should handle undefined color', () => {
      expect(generateProductSlug('Платье', undefined, 'M')).toBe('plate-m')
    })

    it('should handle undefined size', () => {
      expect(generateProductSlug('Платье', 'Красный')).toBe('plate-krasnyy')
    })

    it('should handle both undefined', () => {
      expect(generateProductSlug('Платье')).toBe('plate')
    })

    it('should handle empty string color', () => {
      // Пустой цвет не создаёт двойной дефис - они схлопываются
      expect(generateProductSlug('Платье', '', 'M')).toBe('plate-m')
    })
  })

  describe('Real-world examples', () => {
    it('should generate slug for summer dress', () => {
      expect(generateProductSlug('Платье летнее лёгкое', 'Белый', 'S')).toBe('plate-letnee-lyogkoe-belyy-s')
    })

    it('should generate slug for winter coat', () => {
      expect(generateProductSlug('Пальто зимнее шерстяное', 'Чёрный', 'L')).toBe('palto-zimnee-sherstyanoe-chyornyy-l')
    })

    it('should generate slug for jeans', () => {
      expect(generateProductSlug('Джинсы женские', 'Синий', '29-32')).toBe('dzhinsy-zhenskie-siniy-29-32')
    })

    it('should generate slug with composition in name', () => {
      expect(generateProductSlug('Блузка 100% хлопок', 'Розовый', 'M')).toBe('bluzka-100-khlopok-rozovyy-m')
    })
  })

  describe('SEO optimization', () => {
    it('should create readable URL-friendly slugs', () => {
      const slug = generateProductSlug('Платье летнее', 'Красный', 'M')
      expect(slug).toMatch(/^[a-z0-9-]+$/)
    })

    it('should not have consecutive hyphens', () => {
      const slug = generateProductSlug('Платье  летнее', 'Красный  яркий')
      expect(slug).not.toMatch(/--/)
    })

    it('should not start or end with hyphen', () => {
      const slug = generateProductSlug(' Платье ', ' Красный ')
      expect(slug).not.toMatch(/^-/)
      expect(slug).not.toMatch(/-$/)
    })
  })
})
