import { beforeAll, describe, expect, it } from 'vitest'
import {
  buildCityEntries,
  type CityEntry,
  loadCities,
  matchCity,
  matchCityIn,
  normalizeCityText,
  searchCities,
} from './city-search'

describe('normalizeCityText', () => {
  it('приводит регистр, ё/е, дефисы и префикс «г.»', () => {
    expect(normalizeCityText('  Г. Ростов-на-Дону ')).toBe('ростов на дону')
    expect(normalizeCityText('Королёв')).toBe('королев')
    expect(normalizeCityText('город Москва')).toBe('москва')
    expect(normalizeCityText('Санкт–Петербург')).toBe('санкт петербург')
  })
})

describe('buildCityEntries', () => {
  it('уникальное название остаётся значением, повторяющееся получает регион', () => {
    const entries = buildCityEntries(
      [['Тверь', 0], ['Советск', 0], ['Советск', 1]],
      ['Тверская область', 'Калининградская область'],
    )
    expect(entries.map((e) => e.value)).toEqual([
      'Тверь',
      'Советск, Тверская область',
      'Советск, Калининградская область',
    ])
  })
})

describe('справочник', () => {
  let cities: readonly CityEntry[]

  beforeAll(async () => {
    cities = await loadCities()
  })

  it('содержит порядка тысячи городов, крупные первыми', () => {
    expect(cities.length).toBeGreaterThan(1000)
    expect(cities[0]?.name).toBe('Москва')
    expect(cities[1]?.name).toBe('Санкт-Петербург')
  })

  it('повторная загрузка возвращает тот же массив (кеш)', async () => {
    expect(await loadCities()).toBe(cities)
  })

  it('все значения уникальны — иначе опции Combobox сольются', () => {
    expect(new Set(cities.map((c) => c.value)).size).toBe(cities.length)
  })

  describe('searchCities', () => {
    it('находит без учёта регистра и ё/е', () => {
      expect(searchCities(cities, 'королев')[0]?.name).toBe('Королёв')
      expect(searchCities(cities, 'ТВЕРЬ')[0]?.name).toBe('Тверь')
    })

    it('совпадения с начала названия выше вхождений внутри', () => {
      const names = searchCities(cities, 'ново').map((c) => c.name)
      expect(names[0]).toMatch(/^Ново/)
      expect(names.slice(0, 3).every((n) => n.startsWith('Ново'))).toBe(true)
    })

    it('слово внутри названия выше случайной подстроки', () => {
      const names = searchCities(cities, 'уренгой', 5).map((c) => c.name)
      expect(names).toContain('Новый Уренгой')
    })

    it('при равенстве групп крупный город выше', () => {
      const names = searchCities(cities, 'нижн').map((c) => c.name)
      expect(names.indexOf('Нижний Новгород')).toBeLessThan(names.indexOf('Нижняя Тура'))
    })

    it('пустой запрос — самые крупные города', () => {
      expect(searchCities(cities, '', 3).map((c) => c.name)).toEqual(['Москва', 'Санкт-Петербург', cities[2]!.name])
    })

    it('различает одноимённые города по региону после запятой', () => {
      const all = searchCities(cities, 'советск')
      expect(all.filter((c) => c.name === 'Советск').length).toBeGreaterThan(1)
      const kaliningrad = searchCities(cities, 'советск, калинин')
      expect(kaliningrad).toHaveLength(1)
      expect(kaliningrad[0]?.region).toBe('Калининградская область')
    })

    it('понимает сокращения', () => {
      expect(searchCities(cities, 'мск')[0]?.name).toBe('Москва')
      expect(searchCities(cities, 'спб')[0]?.name).toBe('Санкт-Петербург')
    })

    it('несуществующий город — пустой список', () => {
      expect(searchCities(cities, 'зззз')).toEqual([])
    })

    it('уважает limit', () => {
      expect(searchCities(cities, 'а', 7)).toHaveLength(7)
    })
  })

  describe('matchCity', () => {
    it.each([
      ['москва', 'Москва'],
      ['г. Москва', 'Москва'],
      ['Мск', 'Москва'],
      ['  ТВЕРЬ ', 'Тверь'],
      ['Ростов на Дону', 'Ростов-на-Дону'],
      ['королев', 'Королёв'],
    ])('«%s» → %s', async (text, expected) => {
      const match = await matchCity(text)
      expect(match?.name).toBe(expected)
      expect(match?.ambiguous).toBe(false)
    })

    it('опечатки и неизвестные города — null', async () => {
      expect(await matchCity('Масква')).toBeNull()
      expect(await matchCity('Берлин')).toBeNull()
      expect(await matchCity('')).toBeNull()
    })

    it('одноимённый город без региона — самый крупный и ambiguous', () => {
      const match = matchCityIn(cities, 'Советск')
      expect(match?.ambiguous).toBe(true)
      expect(match?.name).toBe('Советск')
    })

    it('регион в тексте снимает неоднозначность', () => {
      const match = matchCityIn(cities, 'Советск, Кировская область')
      expect(match?.ambiguous).toBe(false)
      expect(match?.region).toBe('Кировская область')
    })

    it('значение поля поддаётся разбору обратно в тот же город', () => {
      for (const entry of cities.filter((c) => c.value !== c.name)) {
        expect(matchCityIn(cities, entry.value)?.value).toBe(entry.value)
      }
    })
  })
})
