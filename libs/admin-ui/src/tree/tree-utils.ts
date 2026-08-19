/**
 * Чистые функции для древовидных admin-CRUD списков с drag&drop-перевложением
 * (`SortableTree`). Framework-free — без React/Chakra, чтобы их можно было переиспользовать
 * и на сервере (server action, проверка инвариантов) и на клиенте (проекция при перетаскивании).
 */

export interface TreeItemLike {
  id: string
  parentId: string | null
}

export interface OrderedTreeItem extends TreeItemLike {
  order: number
}

export interface FlattenedTreeNode<T extends OrderedTreeItem> {
  item: T
  depth: number
  parentId: string | null
  hasChildren: boolean
}

/**
 * Дерево в порядке обхода (родитель → дети по возрастанию `order`) с глубиной вложенности.
 * `collapsedIds` — узлы, чьи дети не разворачиваются (используется и для ручного сворачивания
 * в UI, и как приём «временно скрыть поддерево» во время перетаскивания активного узла).
 */
export function buildFlattenedTree<T extends OrderedTreeItem>(
  items: T[],
  collapsedIds: ReadonlySet<string> = new Set(),
): FlattenedTreeNode<T>[] {
  const childrenByParent = new Map<string | null, T[]>()
  for (const item of items) {
    const siblings = childrenByParent.get(item.parentId) ?? []
    siblings.push(item)
    childrenByParent.set(item.parentId, siblings)
  }
  for (const siblings of childrenByParent.values()) {
    siblings.sort((a, b) => a.order - b.order)
  }

  const result: FlattenedTreeNode<T>[] = []
  const visit = (parentId: string | null, depth: number) => {
    for (const item of childrenByParent.get(parentId) ?? []) {
      const hasChildren = (childrenByParent.get(item.id)?.length ?? 0) > 0
      result.push({ item, depth, parentId, hasChildren })
      if (hasChildren && !collapsedIds.has(item.id)) {
        visit(item.id, depth + 1)
      }
    }
  }
  visit(null, 0)
  return result
}

/** Id всех потомков узла (сам узел не включён) — обходом вширь по `parentId`. */
export function getDescendantIds<T extends TreeItemLike>(items: T[], id: string): string[] {
  const childrenByParent = new Map<string, T[]>()
  for (const item of items) {
    if (item.parentId === null) {
      continue
    }
    const siblings = childrenByParent.get(item.parentId) ?? []
    siblings.push(item)
    childrenByParent.set(item.parentId, siblings)
  }

  const result: string[] = []
  const queue = [id]
  while (queue.length > 0) {
    const currentId = queue.shift()!
    for (const child of childrenByParent.get(currentId) ?? []) {
      result.push(child.id)
      queue.push(child.id)
    }
  }
  return result
}

/** Уровень узла: 0 — корневая категория, 1 — её ребёнок и так далее. */
export function getDepth<T extends TreeItemLike>(items: T[], id: string): number {
  const byId = new Map(items.map((item) => [item.id, item]))
  let depth = 0
  let current = byId.get(id)
  while (current?.parentId) {
    depth++
    current = byId.get(current.parentId)
  }
  return depth
}

/** Уровень, на котором окажется РЕБЁНОК узла `parentId` (`null` — уровень корня, то есть 0). */
export function getChildDepth<T extends TreeItemLike>(
  items: T[],
  parentId: string | null,
): number {
  if (parentId === null) {
    return 0
  }
  return getDepth(items, parentId) + 1
}

/** Высота поддерева узла: 0, если детей нет, иначе 1 + максимум по детям. */
export function getSubtreeHeight<T extends TreeItemLike>(items: T[], id: string): number {
  const children = items.filter((item) => item.parentId === id)
  if (children.length === 0) {
    return 0
  }
  return 1 + Math.max(...children.map((child) => getSubtreeHeight(items, child.id)))
}

export type TreeMoveErrorCode = 'SELF' | 'CYCLE' | 'DEPTH_EXCEEDED'

/**
 * Инварианты дерева, которые не выражены схемой (см. PLAN_SHOP_CATALOG.md §2.4): запрет цикла
 * (перенос в собственного потомка или в себя) и ограничение глубины с учётом высоты
 * переносимого поддерева — узел тащит своих детей с собой, глубина считается по самой глубокой
 * ветке, а не по самому узлу. Текст сообщения — на стороне вызывающего (`code` — не строка,
 * чтобы библиотека оставалась без языка/домена и годилась для любого дерева, не только категорий).
 */
export function validateTreeMove<T extends TreeItemLike>(
  items: T[],
  nodeId: string,
  newParentId: string | null,
  maxDepth: number,
): TreeMoveErrorCode | null {
  if (newParentId === nodeId) {
    return 'SELF'
  }
  if (newParentId !== null && getDescendantIds(items, nodeId).includes(newParentId)) {
    return 'CYCLE'
  }
  const newDepth = getChildDepth(items, newParentId)
  const height = getSubtreeHeight(items, nodeId)
  if (newDepth + height > maxDepth - 1) {
    return 'DEPTH_EXCEEDED'
  }
  return null
}

export interface TreeMoveResult {
  newParentId: string | null
  /** Id всех детей нового родителя ПОСЛЕ переноса, в новом порядке (включая сам перенесённый узел). */
  orderedSiblingIds: string[]
}

/**
 * Итог перетаскивания узла `activeId` на позицию узла `overId` в видимом (уже отфильтрованном
 * от собственных потомков активного узла — см. `buildFlattenedTree` с активным id в
 * `collapsedIds`) списке. Новый родитель определяется по узлу, оказавшемуся ПЕРЕД перенесённым
 * после сдвига — «отпустил после X» переносит на тот же уровень, что и X, а не внутрь X. Чтобы
 * сделать узел ребёнком конкретной категории, а не просто соседом, — явный выбор в интерфейсе
 * (`SortableTree` также поддерживает выбор родителя без мыши), а не перетаскивание.
 */
export function computeMoveResult<T extends OrderedTreeItem>(
  visibleFlat: FlattenedTreeNode<T>[],
  activeId: string,
  overId: string,
): TreeMoveResult | null {
  const activeIndex = visibleFlat.findIndex((node) => node.item.id === activeId)
  const overIndex = visibleFlat.findIndex((node) => node.item.id === overId)
  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
    return null
  }

  const reordered = arrayMoveGeneric(visibleFlat, activeIndex, overIndex)
  const droppedIndex = reordered.findIndex((node) => node.item.id === activeId)
  const anchor = reordered[droppedIndex - 1]
  const newParentId = anchor ? anchor.parentId : null

  const orderedSiblingIds = reordered
    .filter((node) => node.item.id === activeId || node.parentId === newParentId)
    .map((node) => node.item.id)

  return { newParentId, orderedSiblingIds }
}

/** Локальная копия `arrayMove` из `@dnd-kit/sortable` — без зависимости от dnd-kit в чистой логике. */
function arrayMoveGeneric<T>(array: T[], from: number, to: number): T[] {
  const result = array.slice()
  const [moved] = result.splice(from, 1)
  result.splice(to < 0 ? result.length + to : to, 0, moved)
  return result
}
