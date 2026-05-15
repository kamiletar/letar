import { describe, expect, it } from 'vitest'
import { resolveAutoComplete } from './autocomplete-map'

describe('resolveAutoComplete', () => {
  describe('авто-определение по имени поля', () => {
    it.each([
      ['email', 'email'],
      ['phone', 'tel'],
      ['tel', 'tel'],
      ['mobile', 'tel'],
      ['firstName', 'given-name'],
      ['first_name', 'given-name'],
      ['lastName', 'family-name'],
      ['surname', 'family-name'],
      ['name', 'name'],
      ['password', 'current-password'],
      ['newPassword', 'new-password'],
      ['address', 'street-address'],
      ['city', 'address-level2'],
      ['zip', 'postal-code'],
      ['postalCode', 'postal-code'],
      ['country', 'country-name'],
      ['company', 'organization'],
      ['username', 'username'],
    ])('"%s" → "%s"', (fieldName, expected) => {
      expect(resolveAutoComplete(fieldName)).toBe(expected)
    })
  })

  describe('dot-path — берёт последний сегмент', () => {
    it('address.city → address-level2', () => {
      expect(resolveAutoComplete('address.city')).toBe('address-level2')
    })

    it('user.profile.email → email', () => {
      expect(resolveAutoComplete('user.profile.email')).toBe('email')
    })

    it('shipping.postalCode → postal-code', () => {
      expect(resolveAutoComplete('shipping.postalCode')).toBe('postal-code')
    })
  })

  describe('неизвестные имена → undefined', () => {
    it('title → undefined', () => {
      expect(resolveAutoComplete('title')).toBeUndefined()
    })

    it('description → undefined', () => {
      expect(resolveAutoComplete('description')).toBeUndefined()
    })

    it('amount → undefined', () => {
      expect(resolveAutoComplete('amount')).toBeUndefined()
    })
  })

  describe('приоритет: prop > meta > auto', () => {
    it('prop имеет наивысший приоритет', () => {
      expect(resolveAutoComplete('email', 'off', 'username')).toBe('username')
    })

    it('meta override авто-определения', () => {
      expect(resolveAutoComplete('email', 'off')).toBe('off')
    })

    it('meta = off отключает автозаполнение', () => {
      expect(resolveAutoComplete('phone', 'off')).toBe('off')
    })

    it('авто-определение когда нет prop и meta', () => {
      expect(resolveAutoComplete('email')).toBe('email')
    })

    it('prop override meta', () => {
      expect(resolveAutoComplete('email', 'tel', 'organization')).toBe('organization')
    })
  })

  describe('индексы массива', () => {
    it('убирает индексы массива из имени', () => {
      expect(resolveAutoComplete('phone[0]')).toBe('tel')
    })

    it('dot-path с индексом', () => {
      expect(resolveAutoComplete('contacts.email[2]')).toBe('email')
    })
  })
})
