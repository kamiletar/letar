import { describe, expect, it } from 'vitest'
import { normalizeBirthCertificate, validateBirthCertificate } from '../birth-certificate'
import { zRu } from '../index'

describe('Свидетельство о рождении — нормализация', () => {
  it('оставляет уже канонический вид без изменений', () => {
    expect(normalizeBirthCertificate('II-МЮ № 123456')).toBe('II-МЮ № 123456')
  })

  it('нормализует ввод без разделителей', () => {
    expect(normalizeBirthCertificate('IIМЮ123456')).toBe('II-МЮ № 123456')
  })

  it('заменяет гомоглиф `|||` на `III` в римской части', () => {
    expect(normalizeBirthCertificate('|||-МЮ № 123456')).toBe('III-МЮ № 123456')
  })

  it('заменяет `1` и кириллическую `І` на `I` в римской части', () => {
    expect(normalizeBirthCertificate('1-МЮ № 123456')).toBe('I-МЮ № 123456')
    expect(normalizeBirthCertificate('І-МЮ № 123456')).toBe('I-МЮ № 123456')
  })

  it('разводит X/Х по позиции: латиница в римской части, кириллица в буквах серии', () => {
    // Х (кириллица) в римской части → X (латиница); X/Y (латиница) в буквах серии → Х/У (кириллица)
    expect(normalizeBirthCertificate('ХХ-XY № 123456')).toBe('XX-ХУ № 123456')
  })

  it('чистит разделители `-`, пробелы и `№`', () => {
    expect(normalizeBirthCertificate('II - МЮ № 123 456')).toBe('II-МЮ № 123456')
  })

  it('короткую строку (≤6 симв.) возвращает как есть — нормализовать нечего', () => {
    expect(normalizeBirthCertificate('12345')).toBe('12345')
  })
})

describe('Свидетельство о рождении — валидация', () => {
  it('принимает валидное свидетельство', () => {
    expect(validateBirthCertificate('II-МЮ № 123456')).toBe(true)
  })

  it('принимает свободный ввод с гомоглифами', () => {
    expect(validateBirthCertificate('|||МЮ123456')).toBe(true)
  })

  it('принимает переменную длину римской части (1-5 знаков)', () => {
    expect(validateBirthCertificate('IМЮ123456')).toBe(true)
    expect(validateBirthCertificate('XLVIIМЮ123456')).toBe(true)
  })

  it('НЕ сужает алфавит букв серии — принимает советские Ё/Ї', () => {
    const result = zRu.birthCertificate().safeParse('II-ЁЇ № 123456')
    expect(result.success).toBe(true)
  })

  it('отклоняет неполный ввод', () => {
    expect(validateBirthCertificate('II-МЮ')).toBe(false)
    expect(validateBirthCertificate('123456')).toBe(false)
  })

  it('отклоняет более 5 римских символов подряд', () => {
    expect(validateBirthCertificate('IIIIII-МЮ № 123456')).toBe(false)
  })
})
