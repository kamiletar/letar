import type { FranchiseGraphDocument, FranchiseGraphLink, FranchiseGraphNode } from '@letar/animatrona-types'
import { describe, expect, it } from 'vitest'
import { computeChronologicalOrder } from './compute-chronological-order'

/** Хелпер для узла графа франшизы — заполняет обязательные поля дефолтами */
function node(id: number, year: number | null): FranchiseGraphNode {
  return {
    id,
    name: `Anime ${id}`,
    kind: 'tv',
    year,
    image_url: '',
    url: '',
    weight: 1,
  }
}

/** Хелпер для связи графа франшизы */
function link(source_id: number, target_id: number, relation: string): FranchiseGraphLink {
  return { source_id, target_id, relation, weight: 1 }
}

function graph(nodes: FranchiseGraphNode[], links: FranchiseGraphLink[]): FranchiseGraphDocument {
  return {
    version: 1,
    rootShikimoriId: nodes[0]?.id ?? 0,
    name: 'Test Franchise',
    nodes,
    links,
  }
}

describe('computeChronologicalOrder', () => {
  it('возвращает пустой Map для пустого графа', () => {
    const result = computeChronologicalOrder(graph([], []))
    expect(result.size).toBe(0)
  })

  it('возвращает пустой Map если nodes отсутствует', () => {
    const result = computeChronologicalOrder({
      version: 1,
      rootShikimoriId: 0,
      name: 'Empty',
      nodes: undefined as unknown as FranchiseGraphNode[],
      links: [],
    })
    expect(result.size).toBe(0)
  })

  it('единственный узел без связей получает порядок 1', () => {
    const result = computeChronologicalOrder(graph([node(1, 2020)], []))
    expect(result.get(1)).toBe(1)
    expect(result.size).toBe(1)
  })

  it('несколько корневых узлов без связей сортируются по году', () => {
    // Узлы добавлены в графе в порядке 3,1,2 — годы не по порядку
    const result = computeChronologicalOrder(
      graph([node(3, 2022), node(1, 2018), node(2, 2020)], []),
    )
    expect(result.get(1)).toBe(1)
    expect(result.get(2)).toBe(2)
    expect(result.get(3)).toBe(3)
  })

  it('узлы без года (null) считаются как год 0 — идут первыми', () => {
    const result = computeChronologicalOrder(
      graph([node(1, 2020), node(2, null)], []),
    )
    expect(result.get(2)).toBe(1)
    expect(result.get(1)).toBe(2)
  })

  it('sequel: source выходит раньше target (prequel → sequel)', () => {
    // 1 -- sequel --> 2 означает "2 является сиквелом 1", то есть 1 идёт раньше
    const result = computeChronologicalOrder(
      graph([node(1, 2018), node(2, 2020)], [link(1, 2, 'sequel')]),
    )
    expect(result.get(1)).toBe(1)
    expect(result.get(2)).toBe(2)
  })

  it('prequel: target выходит раньше source (source зависит от target)', () => {
    // 2 -- prequel --> 1 означает "1 является приквелом 2", то есть 1 идёт раньше 2
    const result = computeChronologicalOrder(
      graph([node(2, 2020), node(1, 2018)], [link(2, 1, 'prequel')]),
    )
    expect(result.get(1)).toBe(1)
    expect(result.get(2)).toBe(2)
  })

  it('цепочка из трёх сиквелов сохраняет хронологический порядок', () => {
    const result = computeChronologicalOrder(
      graph(
        [node(1, 2010), node(2, 2012), node(3, 2014)],
        [link(1, 2, 'sequel'), link(2, 3, 'sequel')],
      ),
    )
    expect(result.get(1)).toBe(1)
    expect(result.get(2)).toBe(2)
    expect(result.get(3)).toBe(3)
  })

  it('связи с типом отличным от sequel/prequel игнорируются при построении зависимостей', () => {
    const result = computeChronologicalOrder(
      graph(
        [node(1, 2010), node(2, 2012)],
        [link(1, 2, 'side_story')],
      ),
    )
    // Оба узла остаются корневыми (side_story не создаёт зависимость) → сортировка по году
    expect(result.get(1)).toBe(1)
    expect(result.get(2)).toBe(2)
  })

  it('связи, ссылающиеся на несуществующие узлы, отбрасываются без ошибок', () => {
    const result = computeChronologicalOrder(
      graph([node(1, 2010)], [link(1, 999, 'sequel'), link(999, 1, 'prequel')]),
    )
    expect(result.get(1)).toBe(1)
    expect(result.size).toBe(1)
  })

  it('цикл в графе не приводит к бесконечной рекурсии и включает все узлы', () => {
    // 1 -- sequel --> 2 -- sequel --> 1 (цикл)
    const result = computeChronologicalOrder(
      graph(
        [node(1, 2010), node(2, 2012)],
        [link(1, 2, 'sequel'), link(2, 1, 'sequel')],
      ),
    )
    expect(result.size).toBe(2)
    expect([...result.values()].sort()).toEqual([1, 2])
  })

  it('разветвлённый граф (несколько сиквелов от одного корня) — каждый узел получает уникальный порядок', () => {
    // 1 является приквелом для 2 и 3
    const result = computeChronologicalOrder(
      graph(
        [node(1, 2010), node(2, 2012), node(3, 2013)],
        [link(1, 2, 'sequel'), link(1, 3, 'sequel')],
      ),
    )
    const values = [...result.values()].sort((a, b) => a - b)
    expect(values).toEqual([1, 2, 3])
    // Корень (1) обязан быть раньше обоих сиквелов
    expect(result.get(1)).toBeLessThan(result.get(2)!)
    expect(result.get(1)).toBeLessThan(result.get(3)!)
  })

  it('результат — 1-indexed непрерывная последовательность без пропусков', () => {
    const result = computeChronologicalOrder(
      graph([node(1, 2010), node(2, 2011), node(3, 2012), node(4, 2013)], []),
    )
    const values = [...result.values()].sort((a, b) => a - b)
    expect(values).toEqual([1, 2, 3, 4])
  })
})
