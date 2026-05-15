import { describe, expect, it } from 'vitest'
import { zRu } from '../index'

describe('zRu.bik() — БИК', () => {
  it('принимает валидный БИК Сбербанка', () => {
    expect(zRu.bik().safeParse('044525225').success).toBe(true)
  })

  it('принимает валидный БИК Альфа-Банка', () => {
    expect(zRu.bik().safeParse('044525593').success).toBe(true)
  })

  it('отклоняет БИК не начинающийся с 04', () => {
    expect(zRu.bik().safeParse('124525225').success).toBe(false)
  })

  it('отклоняет БИК неправильной длины', () => {
    expect(zRu.bik().safeParse('04452522').success).toBe(false)
    expect(zRu.bik().safeParse('0445252250').success).toBe(false)
  })
})
