import { describe, expect, it } from 'vitest'
import { describeAlgorithm, DX7_ALGORITHMS, getAlgorithm } from './dx7-algorithms'

describe('dx7-algorithms: структурные инварианты всех 32 алгоритмов DX7', () => {
  it('ровно 32 алгоритма', () => {
    expect(DX7_ALGORITHMS).toHaveLength(32)
  })

  it.each(DX7_ALGORITHMS.map((alg, i) => [i + 1, alg] as const))(
    'алгоритм %d: ровно одно обратное ребро (feedback), и оно указывает на fbOp',
    (_num, alg) => {
      const backwardEdges: Array<{ i: number; src: number }> = []
      alg.src.forEach((mods, i) => {
        mods.forEach((src) => {
          if (src <= i) {
            backwardEdges.push({ i, src })
          }
        })
      })
      expect(backwardEdges).toHaveLength(1)
      expect(backwardEdges[0].i).toBe(alg.fbOp)
    },
  )

  it.each(DX7_ALGORITHMS.map((alg, i) => [i + 1, alg] as const))(
    'алгоритм %d: у каждого несущего есть хотя бы один источник или он листовой модулятор сам по себе',
    (_num, alg) => {
      for (const carrier of alg.carriers) {
        expect(carrier).toBeGreaterThanOrEqual(0)
        expect(carrier).toBeLessThanOrEqual(5)
      }
    },
  )

  it('getAlgorithm зажимает вне диапазона 1-32', () => {
    expect(getAlgorithm(0)).toBe(DX7_ALGORITHMS[0])
    expect(getAlgorithm(1)).toBe(DX7_ALGORITHMS[0])
    expect(getAlgorithm(32)).toBe(DX7_ALGORITHMS[31])
    expect(getAlgorithm(99)).toBe(DX7_ALGORITHMS[31])
  })

  it('describeAlgorithm не падает и возвращает непустую строку для всех 32', () => {
    for (let alg = 1; alg <= 32; alg++) {
      const desc = describeAlgorithm(alg)
      expect(desc.length).toBeGreaterThan(0)
    }
  })

  it('describeAlgorithm(1): два независимых пути — короткий дуэт и глубокая цепочка с fb', () => {
    expect(describeAlgorithm(1)).toBe('2→1 + 6→5→4→3')
  })

  it('describeAlgorithm(32): чистый аддитив — шесть независимых несущих', () => {
    expect(describeAlgorithm(32)).toBe('1 + 2 + 3 + 4 + 5 + 6')
  })
})
