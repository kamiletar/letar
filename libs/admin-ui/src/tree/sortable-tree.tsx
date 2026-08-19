'use client'

import { Box, Flex, IconButton, NativeSelect, Text } from '@chakra-ui/react'
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useId, useState, useTransition } from 'react'
import { PiArrowDown, PiArrowUp, PiCaretDown, PiCaretRight, PiDotsSixVertical } from 'react-icons/pi'

import {
  buildFlattenedTree,
  computeMoveResult,
  type FlattenedTreeNode,
  getChildDepth,
  getDescendantIds,
  type OrderedTreeItem,
  validateTreeMove,
} from './tree-utils'

export interface SortableTreeMoveResult {
  success?: boolean
  error?: string
}

export interface SortableTreeProps<T extends OrderedTreeItem> {
  /** Узлы дерева, в любом порядке — сортировка по `order` внутри каждого родителя делает сам компонент. */
  items: T[]
  /** Подпись строки. */
  renderLabel: (item: T) => React.ReactNode
  /** Доп. содержимое строки после подписи (статус-бейдж и т.п.). */
  renderMeta?: (item: T) => React.ReactNode
  /** Действия справа (ссылка «Редактировать» и т.п.). */
  renderActions?: (item: T) => React.ReactNode
  /** Текстовая подпись узла для списка «Переместить в» (plain text, не JSX — это `<option>`). */
  getOptionLabel: (item: T) => string
  /**
   * Перенос узла: смена родителя и/или порядка внутри уровня. Вызывается и при drag&drop,
   * и при действиях без мыши (кнопки вверх/вниз, выбор родителя). Верни `{ error }`,
   * если перенос отклонён сервером — компонент откатит оптимистичное изменение.
   */
  onMove: (
    nodeId: string,
    newParentId: string | null,
    orderedSiblingIds: string[],
  ) => Promise<SortableTreeMoveResult>
  /** Сколько уровней вложенности допустимо (по умолчанию 3 — §2.4 PLAN_SHOP_CATALOG.md). */
  maxDepth?: number
  /** Ширина отступа на уровень вложенности, px. */
  indentationWidth?: number
  emptyLabel?: React.ReactNode
}

const ROOT_OPTION_VALUE = ''

/**
 * Древовидный CRUD-список с drag&drop-сортировкой и перевложением (@dnd-kit) — курс на
 * `/admin/materials/categories` (PLAN_SHOP_CATALOG.md, волна C), рассчитан на переиспользование
 * для любого дерева с `parentId`/`order` (например `/admin/works/categories` позже).
 *
 * Перетаскивание меняет позицию узла в списке и, если он оказался среди детей другого
 * родителя, переносит его туда — но всегда СИБЛИНГОМ соседнего узла, никогда не «внутрь» него.
 * Сделать узел явно ребёнком конкретной категории — через выпадающий список «Переместить в»
 * в каждой строке; те же кнопки «▲/▼» и список работают без мыши (клавиатура, скринридер,
 * мобильный тач, для которого перетаскивание по длинному дереву практически неработоспособно).
 */
export function SortableTree<T extends OrderedTreeItem>({
  items,
  renderLabel,
  renderMeta,
  renderActions,
  getOptionLabel,
  onMove,
  maxDepth = 3,
  indentationWidth = 20,
  emptyLabel = 'Пока ничего нет',
}: SortableTreeProps<T>) {
  const [nodes, setNodes] = useState(items)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  // Стабильный id для aria-атрибутов dnd-kit (aria-describedby и т.п.) — без него библиотека
  // генерирует их через собственный module-level счётчик, который на сервере и на клиенте
  // увеличивается по-разному → hydration mismatch на каждой строке дерева.
  const dndContextId = useId()

  useEffect(() => {
    setNodes(items)
  }, [items])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  )

  // Во время перетаскивания дети активного узла временно скрыты — иначе можно отпустить курсор
  // прямо на своём же потомке и получить бессмысленную проекцию (см. computeMoveResult).
  const dragCollapsed = activeId ? new Set([...collapsedIds, activeId]) : collapsedIds
  const flat = buildFlattenedTree(nodes, dragCollapsed)

  function commitMove(nodeId: string, newParentId: string | null, orderedSiblingIds: string[]) {
    const violation = validateTreeMove(nodes, nodeId, newParentId, maxDepth)
    if (violation) {
      setError(violationMessage(violation, maxDepth))
      return
    }

    setError(null)
    const previous = nodes
    const orderIndexById = new Map(orderedSiblingIds.map((id, index) => [id, index]))
    setNodes((current) =>
      current.map((node) => {
        if (node.id === nodeId) {
          return { ...node, parentId: newParentId, order: orderIndexById.get(node.id) ?? node.order }
        }
        const newOrder = orderIndexById.get(node.id)
        return newOrder === undefined ? node : { ...node, order: newOrder }
      })
    )

    startTransition(async () => {
      const result = await onMove(nodeId, newParentId, orderedSiblingIds)
      if (result.error) {
        setError(result.error)
        setNodes(previous) // откат — сервер отклонил (гонка/повторная проверка инвариантов)
      }
      // При успехе локальное оптимистичное состояние уже верное; `revalidatePath` на сервере
      // обновит props.items к следующему заходу на страницу.
    })
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) {
      return
    }
    const result = computeMoveResult(flat, String(active.id), String(over.id))
    if (!result) {
      return
    }
    commitMove(String(active.id), result.newParentId, result.orderedSiblingIds)
  }

  function handleMoveTo(item: T, newParentId: string | null) {
    if (newParentId === (item.parentId ?? null)) {
      return
    }
    const siblings = nodes.filter((n) => (n.parentId ?? null) === newParentId && n.id !== item.id)
    commitMove(item.id, newParentId, [...siblings.map((s) => s.id), item.id])
  }

  function handleReorder(item: T, direction: -1 | 1) {
    const siblings = nodes
      .filter((n) => (n.parentId ?? null) === (item.parentId ?? null))
      .sort((a, b) => a.order - b.order)
    const index = siblings.findIndex((s) => s.id === item.id)
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= siblings.length) {
      return
    }
    const reordered = siblings.slice()
    ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
    commitMove(
      item.id,
      item.parentId ?? null,
      reordered.map((s) => s.id),
    )
  }

  function toggleCollapsed(id: string) {
    setCollapsedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (flat.length === 0) {
    return (
      <Text color="fg.muted" fontSize="sm">
        {emptyLabel}
      </Text>
    )
  }

  return (
    <Box>
      {error && (
        <Text color="fg.error" fontSize="sm" mb={3}>
          {error}
        </Text>
      )}
      <DndContext
        id={dndContextId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={flat.map((n) => n.item.id)}
          strategy={verticalListSortingStrategy}
        >
          {flat.map((flatNode) => (
            <SortableTreeRow
              key={flatNode.item.id}
              flatNode={flatNode}
              nodes={nodes}
              maxDepth={maxDepth}
              indentationWidth={indentationWidth}
              collapsed={collapsedIds.has(flatNode.item.id)}
              onToggleCollapsed={() => toggleCollapsed(flatNode.item.id)}
              onMoveTo={(newParentId) => handleMoveTo(flatNode.item, newParentId)}
              onReorder={(direction) => handleReorder(flatNode.item, direction)}
              renderLabel={renderLabel}
              renderMeta={renderMeta}
              renderActions={renderActions}
              getOptionLabel={getOptionLabel}
            />
          ))}
        </SortableContext>
      </DndContext>
    </Box>
  )
}

function violationMessage(code: 'SELF' | 'CYCLE' | 'DEPTH_EXCEEDED', maxDepth: number): string {
  switch (code) {
    case 'SELF':
      return 'Категория не может стать сама себе родителем'
    case 'CYCLE':
      return 'Нельзя перенести категорию в собственного потомка'
    case 'DEPTH_EXCEEDED':
      return `Превышена максимальная глубина дерева (${maxDepth} уровня)`
  }
}

interface SortableTreeRowProps<T extends OrderedTreeItem> {
  flatNode: FlattenedTreeNode<T>
  nodes: T[]
  maxDepth: number
  indentationWidth: number
  collapsed: boolean
  onToggleCollapsed: () => void
  onMoveTo: (newParentId: string | null) => void
  onReorder: (direction: -1 | 1) => void
  renderLabel: (item: T) => React.ReactNode
  renderMeta?: (item: T) => React.ReactNode
  renderActions?: (item: T) => React.ReactNode
  getOptionLabel: (item: T) => string
}

function SortableTreeRow<T extends OrderedTreeItem>({
  flatNode,
  nodes,
  maxDepth,
  indentationWidth,
  collapsed,
  onToggleCollapsed,
  onMoveTo,
  onReorder,
  renderLabel,
  renderMeta,
  renderActions,
  getOptionLabel,
}: SortableTreeRowProps<T>) {
  const { item, depth, hasChildren } = flatNode
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Допустимые цели переноса «без мыши»: не сам узел, не его потомки, и глубина не превышена.
  const forbidden = new Set([item.id, ...getDescendantIds(nodes, item.id)])
  const targets = nodes.filter((n) => {
    if (forbidden.has(n.id)) {
      return false
    }
    return validateTreeMove(nodes, item.id, n.id, maxDepth) === null
  })
  const canMoveToRoot = validateTreeMove(nodes, item.id, null, maxDepth) === null

  return (
    <Flex
      ref={setNodeRef}
      style={style}
      align="center"
      gap={2}
      py={2}
      pl={`${depth * indentationWidth}px`}
      borderBottomWidth="1px"
      borderColor="border"
      _hover={{ bg: 'bg.subtle' }}
    >
      <Box
        {...attributes}
        {...listeners}
        cursor="grab"
        touchAction="none"
        _active={{ cursor: 'grabbing' }}
        aria-label="Перетащить для сортировки"
        role="button"
        tabIndex={0}
        color="fg.muted"
      >
        <PiDotsSixVertical size={16} />
      </Box>

      {hasChildren
        ? (
          <IconButton
            aria-label={collapsed ? 'Развернуть' : 'Свернуть'}
            size="2xs"
            variant="ghost"
            onClick={onToggleCollapsed}
          >
            {collapsed ? <PiCaretRight /> : <PiCaretDown />}
          </IconButton>
        )
        : <Box w="24px" />}

      <Flex flex="1" align="center" gap={2} minW={0}>
        {renderLabel(item)}
        {renderMeta?.(item)}
      </Flex>

      <IconButton aria-label="Переместить выше" size="2xs" variant="ghost" onClick={() => onReorder(-1)}>
        <PiArrowUp />
      </IconButton>
      <IconButton aria-label="Переместить ниже" size="2xs" variant="ghost" onClick={() => onReorder(1)}>
        <PiArrowDown />
      </IconButton>

      <NativeSelect.Root size="xs" maxW="180px">
        <NativeSelect.Field
          aria-label="Переместить в категорию"
          value={item.parentId ?? ROOT_OPTION_VALUE}
          onChange={(e) => onMoveTo(e.target.value === ROOT_OPTION_VALUE ? null : e.target.value)}
        >
          {canMoveToRoot && <option value={ROOT_OPTION_VALUE}>— Корень —</option>}
          {targets.map((target) => (
            <option key={target.id} value={target.id}>
              {'—'.repeat(getChildDepth(nodes, target.parentId ?? null))} {getOptionLabel(target)}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>

      {renderActions?.(item)}
    </Flex>
  )
}
