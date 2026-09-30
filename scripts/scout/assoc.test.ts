import { describe, expect, test } from 'bun:test'
import { assocExpansion, buildAssoc, tokenize } from '../../libs/scout/src/index'

/** Синтетические пары: слово «тормозит» устойчиво идёт вместе с термом «воркер» */
const pairs = Array.from({ length: 12 }, (_, i) => ({
  queryTerms: tokenize(i % 2 ? 'тормозит сайт' : 'тормозит страница'),
  docTerms: ['воркер', i % 3 ? 'кеш' : 'шум', `уник${i}`],
}))

describe('словарь ассоциаций', () => {
  test('связывает слово запроса с термом дока, редкое и случайное отсекает порогами', () => {
    const dict = buildAssoc(pairs, { minQuery: 3, minJoint: 3, minPmi: 0 }, 'test')
    expect(dict.terms[tokenize('тормозит')[0]].map(([t]) => t)).toContain('воркер')
    expect(dict.terms[tokenize('тормозит')[0]].map(([t]) => t)).not.toContain('уник1')
    expect(dict.sessions).toBe(12)
  })

  test('расширение запроса: вес < 1, собственные слова запроса не дублируются', () => {
    const dict = buildAssoc(pairs, { minQuery: 3, minJoint: 3, minPmi: 0 }, 'test')
    const extra = assocExpansion('тормозит сайт', dict, 0.3)
    expect(extra.get('воркер')).toBeLessThanOrEqual(0.3)
    expect(extra.has('тормозит')).toBe(false)
    expect(assocExpansion('constructor', dict, 0.3).size).toBe(0)
  })
})
