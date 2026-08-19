import { describe, expect, it } from 'vitest'

import {
  buildFlattenedTree,
  computeMoveResult,
  getChildDepth,
  getDepth,
  getDescendantIds,
  getSubtreeHeight,
  validateTreeMove,
} from './tree-utils'

interface Node {
  id: string
  parentId: string | null
  order: number
}

// root
//   ├── a (order 0)
//   │     └── a1 (order 0)
//   └── b (order 1)
const NODES: Node[] = [
  { id: 'root', parentId: null, order: 0 },
  { id: 'a', parentId: 'root', order: 0 },
  { id: 'a1', parentId: 'a', order: 0 },
  { id: 'b', parentId: 'root', order: 1 },
]

describe('buildFlattenedTree', () => {
  it('обходит дерево в порядке order, считая глубину', () => {
    const flat = buildFlattenedTree(NODES)
    expect(flat.map((n) => [n.item.id, n.depth])).toEqual([
      ['root', 0],
      ['a', 1],
      ['a1', 2],
      ['b', 1],
    ])
  })

  it('не спускается в детей свёрнутого узла', () => {
    const flat = buildFlattenedTree(NODES, new Set(['a']))
    expect(flat.map((n) => n.item.id)).toEqual(['root', 'a', 'b'])
  })

  it('помечает hasChildren', () => {
    const flat = buildFlattenedTree(NODES)
    const a = flat.find((n) => n.item.id === 'a')
    const b = flat.find((n) => n.item.id === 'b')
    expect(a?.hasChildren).toBe(true)
    expect(b?.hasChildren).toBe(false)
  })
})

describe('getDescendantIds / getDepth / getSubtreeHeight', () => {
  it('находит всех потомков', () => {
    expect(getDescendantIds(NODES, 'root').sort()).toEqual(['a', 'a1', 'b'])
    expect(getDescendantIds(NODES, 'a')).toEqual(['a1'])
    expect(getDescendantIds(NODES, 'a1')).toEqual([])
  })

  it('считает глубину узла', () => {
    expect(getDepth(NODES, 'root')).toBe(0)
    expect(getDepth(NODES, 'a')).toBe(1)
    expect(getDepth(NODES, 'a1')).toBe(2)
  })

  it('getChildDepth(null) — уровень корня', () => {
    expect(getChildDepth(NODES, null)).toBe(0)
    expect(getChildDepth(NODES, 'a')).toBe(2)
  })

  it('высота поддерева', () => {
    expect(getSubtreeHeight(NODES, 'a1')).toBe(0)
    expect(getSubtreeHeight(NODES, 'a')).toBe(1)
    expect(getSubtreeHeight(NODES, 'root')).toBe(2)
  })
})

describe('validateTreeMove', () => {
  const MAX_DEPTH = 3

  it('запрещает перенос узла в самого себя', () => {
    expect(validateTreeMove(NODES, 'a', 'a', MAX_DEPTH)).toBe('SELF')
  })

  it('запрещает перенос в собственного потомка (цикл)', () => {
    expect(validateTreeMove(NODES, 'a', 'a1', MAX_DEPTH)).toBe('CYCLE')
  })

  it('разрешает обычный перенос в пределах глубины', () => {
    expect(validateTreeMove(NODES, 'b', 'a', MAX_DEPTH)).toBeNull()
  })

  it('запрещает перенос, превышающий глубину дерева', () => {
    // a1 (сам лист) под b на глубину 2 — окей, но перенос ветки "a" (высота 1, содержит a1)
    // под "a1" (глубина 2) дал бы глубину 2+1+1=4 > 3 — впрочем это уже CYCLE. Проверяем на
    // отдельном примере глубины: лист без потомков переносим под узел на максимальной глубине.
    const deep: Node[] = [
      ...NODES,
      { id: 'a1x', parentId: 'a1', order: 0 }, // глубина 3 — уже вне лимита в 3 уровня (0..2)
    ]
    expect(validateTreeMove(deep, 'b', 'a1', MAX_DEPTH)).toBe('DEPTH_EXCEEDED')
  })

  it('учитывает высоту переносимого поддерева, а не только глубину узла', () => {
    // "a" (высота 1, т.к. есть a1) переносим под "b" (глубина 1) → a окажется на глубине 2,
    // а a1 — на глубине 3, что превышает MAX_DEPTH=3 (уровни 0,1,2)
    expect(validateTreeMove(NODES, 'a', 'b', MAX_DEPTH)).toBe('DEPTH_EXCEEDED')
  })
})

describe('computeMoveResult', () => {
  it('возвращает null, если активный и целевой узел совпадают', () => {
    const flat = buildFlattenedTree(NODES)
    expect(computeMoveResult(flat, 'a', 'a')).toBeNull()
  })

  it('перенос "b" на позицию первого ребёнка "a" делает его сиблингом a, не ребёнком', () => {
    // Дропнуть прямо ПОСЛЕ "a" (на место a1) — b встаёт сиблингом "a" (тот же родитель, "root"),
    // а не ребёнком "a": перевложение через drag намеренно не поддерживается, см. комментарий
    // к `computeMoveResult`.
    const flat = buildFlattenedTree(NODES)
    const result = computeMoveResult(flat, 'b', 'a1')
    expect(result?.newParentId).toBe('root')
    expect(result?.orderedSiblingIds).toEqual(['a', 'b'])
  })

  it('перенос узла в начало списка делает его корневым', () => {
    const flat = buildFlattenedTree(NODES)
    const result = computeMoveResult(flat, 'b', 'root')
    expect(result?.newParentId).toBeNull()
    expect(result?.orderedSiblingIds).toEqual(['b', 'root'])
  })
})
