/**
 * Вычисление хронологического порядка просмотра на основе графа франшизы
 *
 * Использует топологическую сортировку по связям sequel/prequel.
 * Корневые узлы (без зависимостей) сортируются по году выхода.
 */

import type { ShikimoriFranchiseGraph } from '@/types/electron.d'

/**
 * Вычисляет хронологический порядок просмотра на основе графа франшизы
 *
 * Алгоритм:
 * 1. Строим граф зависимостей из связей sequel/prequel
 * 2. Находим корневые узлы (без зависимостей) и сортируем по году
 * 3. Топологическая сортировка (DFS) для получения порядка
 * 4. Возвращаем Map<shikimoriId, orderNumber> (1-indexed)
 *
 * @param graph - Граф франшизы из REST API Shikimori
 * @returns Map<shikimoriId, orderNumber> где orderNumber начинается с 1
 */
export function computeChronologicalOrder(graph: ShikimoriFranchiseGraph): Map<number, number> {
  const order = new Map<number, number>()

  // Проверяем что nodes существует
  if (!graph.nodes || graph.nodes.length === 0) {
    return order
  }

  // Собираем все ID
  const nodeIds = new Set(graph.nodes.map((n) => n.id))

  // Строим граф зависимостей (prequel → sequel)
  const dependencies = new Map<number, number[]>()
  const dependents = new Map<number, number[]>()

  for (const id of nodeIds) {
    dependencies.set(id, [])
    dependents.set(id, [])
  }

  // sequel означает что target идёт после source
  // prequel означает что target идёт до source
  for (const link of graph.links || []) {
    const sourceId = graph.nodes[link.source]?.id
    const targetId = graph.nodes[link.target]?.id

    if (!sourceId || !targetId) {
      continue
    }

    if (link.relation === 'sequel') {
      // source → target (target зависит от source)
      dependencies.get(targetId)?.push(sourceId)
      dependents.get(sourceId)?.push(targetId)
    } else if (link.relation === 'prequel') {
      // target → source (source зависит от target)
      dependencies.get(sourceId)?.push(targetId)
      dependents.get(targetId)?.push(sourceId)
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

    // Сначала посещаем зависимости
    for (const dep of dependencies.get(id) || []) {
      visit(dep)
    }

    sorted.push(id)
  }

  // Находим "корневые" узлы (без зависимостей) и сортируем по году
  const roots = [...nodeIds].filter((id) => (dependencies.get(id)?.length || 0) === 0)
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]))

  roots.sort((a, b) => {
    const nodeA = nodeById.get(a)
    const nodeB = nodeById.get(b)
    return (nodeA?.year || 0) - (nodeB?.year || 0)
  })

  // Начинаем с корней
  for (const root of roots) {
    visit(root)
  }

  // Добавляем оставшиеся (если есть циклы)
  for (const id of nodeIds) {
    visit(id)
  }

  // Присваиваем порядковые номера (1-indexed)
  sorted.forEach((id, index) => {
    order.set(id, index + 1)
  })

  return order
}

/**
 * Получить номер сезона для конкретного аниме в рамках франшизы
 *
 * @param graph - Граф франшизы
 * @param shikimoriId - Shikimori ID аниме
 * @returns Номер сезона (1-indexed) или 1 если не найден
 */
export function getFranchiseSeasonNumber(
  graph: ShikimoriFranchiseGraph | null,
  shikimoriId: number | null | undefined
): number {
  if (!graph || !shikimoriId) {
    return 1
  }

  const order = computeChronologicalOrder(graph)
  return order.get(shikimoriId) ?? 1
}
