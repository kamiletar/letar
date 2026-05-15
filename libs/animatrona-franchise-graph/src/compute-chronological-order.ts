/**
 * Вычисление хронологического порядка просмотра на основе графа франшизы
 *
 * Топологическая сортировка по связям sequel/prequel.
 * Корневые узлы (без зависимостей) сортируются по году.
 */

import type { FranchiseGraphDocument } from '@letar/animatrona-types'

/**
 * Вычисляет хронологический порядок просмотра.
 *
 * Алгоритм:
 * 1. Строим граф зависимостей из связей sequel/prequel
 * 2. Находим корневые узлы (без зависимостей) и сортируем по году
 * 3. Топологическая сортировка (DFS) для получения порядка
 * 4. Возвращаем Map<shikimoriId, orderNumber> (1-indexed)
 */
export function computeChronologicalOrder(graph: FranchiseGraphDocument): Map<number, number> {
  const order = new Map<number, number>()

  if (!graph.nodes || graph.nodes.length === 0) {
    return order
  }

  const nodeIds = new Set<number>(graph.nodes.map((n: { id: number }) => n.id))

  // Граф зависимостей (prequel → sequel)
  const dependencies = new Map<number, number[]>()
  for (const id of nodeIds) {
    dependencies.set(id, [])
  }

  for (const link of graph.links || []) {
    if (!nodeIds.has(link.source_id) || !nodeIds.has(link.target_id)) {
      continue
    }

    if (link.relation === 'sequel') {
      // source → target (target зависит от source)
      dependencies.get(link.target_id)?.push(link.source_id)
    } else if (link.relation === 'prequel') {
      // target → source (source зависит от target)
      dependencies.get(link.source_id)?.push(link.target_id)
    }
  }

  // Топологическая сортировка
  const visited = new Set<number>()
  const sorted: number[] = []

  function visit(id: number) {
    if (visited.has(id)) {
      return
    }
    visited.add(id)
    for (const dep of dependencies.get(id) || []) {
      visit(dep)
    }
    sorted.push(id)
  }

  // Корни (без зависимостей) → сортируем по году
  const roots = [...nodeIds].filter((id) => (dependencies.get(id)?.length || 0) === 0)
  const nodeById = new Map(graph.nodes.map((n: { id: number; year: number | null }) => [n.id, n] as const))

  roots.sort((a, b) => {
    const nodeA = nodeById.get(a)
    const nodeB = nodeById.get(b)
    return (nodeA?.year || 0) - (nodeB?.year || 0)
  })

  for (const root of roots) {
    visit(root)
  }

  // Оставшиеся (если есть циклы)
  for (const id of nodeIds) {
    visit(id)
  }

  sorted.forEach((id, index) => {
    order.set(id, index + 1)
  })

  return order
}
