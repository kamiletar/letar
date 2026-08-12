'use client'

import { useState, useTransition } from 'react'

export interface UseInlineCrudListOptions<TItem, TFormData> {
  /** Начальный список элементов (из серверных пропсов страницы) */
  initialItems: TItem[]
  /** Извлечь id элемента — ключ сравнения при update/delete и React key */
  getId: (item: TItem) => string
  /** Ключ сортировки после create/update; без него порядок списка не пересчитывается */
  sortBy?: (item: TItem) => number
  /** Текст подтверждения удаления (по умолчанию — общая формулировка) */
  confirmDeleteMessage?: string
  /** Server Action создания — возвращает элемент в форме, готовой для отображения в списке */
  onCreate: (data: TFormData) => Promise<TItem>
  /** Server Action обновления — возвращает элемент в форме, готовой для отображения в списке */
  onUpdate: (id: string, data: TFormData) => Promise<TItem>
  /** Server Action удаления */
  onDelete: (id: string) => Promise<void>
  /** Вызывается после каждой успешной мутации — например, router.refresh(), если серверные пропсы страницы зависят от этого списка */
  afterMutate?: () => void
}

const DEFAULT_CONFIRM_MESSAGE = 'Удалить? Это действие необратимо.'

/**
 * Состояние и обработчики инлайн-CRUD секции админки: локальный список,
 * id редактируемой/создаваемой строки, create/update/delete с записью
 * ответа Server Action обратно в state. Разметку (таблицу, форму, кнопки)
 * строит вызывающий компонент — сам хук с JSX не связан, см. `InlineEditableTable`
 * для готового каркаса таблицы поверх этого хука.
 */
export function useInlineCrudList<TItem, TFormData>({
  initialItems,
  getId,
  sortBy,
  confirmDeleteMessage,
  onCreate,
  onUpdate,
  onDelete,
  afterMutate,
}: UseInlineCrudListOptions<TItem, TFormData>) {
  const [items, setItems] = useState(initialItems)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [, startTransition] = useTransition()

  function sortItems(list: TItem[]) {
    return sortBy ? [...list].sort((a, b) => sortBy(a) - sortBy(b)) : list
  }

  function handleDelete(id: string) {
    if (!confirm(confirmDeleteMessage ?? DEFAULT_CONFIRM_MESSAGE)) {
      return
    }
    startTransition(async () => {
      await onDelete(id)
      setItems((prev) => prev.filter((item) => getId(item) !== id))
      afterMutate?.()
    })
  }

  async function handleCreate(data: TFormData) {
    const created = await onCreate(data)
    setItems((prev) => sortItems([...prev, created]))
    setEditingId(null)
    afterMutate?.()
  }

  async function handleUpdate(id: string, data: TFormData) {
    const updated = await onUpdate(id, data)
    setItems((prev) => sortItems(prev.map((item) => (getId(item) === id ? updated : item))))
    setEditingId(null)
    afterMutate?.()
  }

  return {
    items,
    editingId,
    setEditingId,
    handleCreate,
    handleUpdate,
    handleDelete,
  }
}
