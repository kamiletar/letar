// globals: true в vitest.config.ts — describe, expect, it доступны глобально
import { isValidCid } from './cid'

describe('isValidCid', () => {
  describe('CIDv0 (Qm...)', () => {
    it('принимает валидный CIDv0 (46 символов, base58btc-алфавит)', () => {
      expect(isValidCid(`Qm${'z'.repeat(44)}`)).toBe(true)
    })

    it('отклоняет CIDv0 короче 46 символов', () => {
      expect(isValidCid(`Qm${'z'.repeat(43)}`)).toBe(false)
    })

    it('отклоняет CIDv0 длиннее 46 символов', () => {
      expect(isValidCid(`Qm${'z'.repeat(45)}`)).toBe(false)
    })

    it('отклоняет CIDv0 с недопустимым символом 0 (base58 исключает 0)', () => {
      expect(isValidCid(`Qm0${'z'.repeat(43)}`)).toBe(false)
    })

    it('отклоняет CIDv0 с недопустимым символом O (base58 исключает O)', () => {
      expect(isValidCid(`QmO${'z'.repeat(43)}`)).toBe(false)
    })

    it('отклоняет CIDv0 с недопустимым символом I (base58 исключает I)', () => {
      expect(isValidCid(`QmI${'z'.repeat(43)}`)).toBe(false)
    })

    it('отклоняет CIDv0 с недопустимым символом l (base58 исключает l)', () => {
      expect(isValidCid(`Qml${'z'.repeat(43)}`)).toBe(false)
    })

    it('отклоняет строку без префикса Qm', () => {
      expect(isValidCid('X'.repeat(46))).toBe(false)
    })
  })

  describe('CIDv1 (bafy...)', () => {
    it('принимает валидный CIDv1 ровно на нижней границе (50 символов после префикса)', () => {
      expect(isValidCid(`bafy${'a'.repeat(50)}`)).toBe(true)
    })

    it('принимает валидный CIDv1 длиннее нижней границы', () => {
      expect(isValidCid(`bafy${'a'.repeat(60)}`)).toBe(true)
    })

    it('отклоняет CIDv1 короче 50 символов после префикса', () => {
      expect(isValidCid(`bafy${'a'.repeat(49)}`)).toBe(false)
    })

    it('отклоняет CIDv1 с символами вне [a-z2-7] (base32)', () => {
      expect(isValidCid(`bafy${'a'.repeat(49)}1`)).toBe(false)
    })

    it('отклоняет CIDv1 с заглавными буквами', () => {
      expect(isValidCid(`bafy${'A'.repeat(50)}`)).toBe(false)
    })
  })

  describe('невалидные значения', () => {
    it('отклоняет пустую строку', () => {
      expect(isValidCid('')).toBe(false)
    })

    it('отклоняет случайный текст', () => {
      expect(isValidCid('not-a-cid')).toBe(false)
    })

    it('отклоняет CID с пробелами по краям', () => {
      expect(isValidCid(` Qm${'z'.repeat(44)} `)).toBe(false)
    })
  })
})
