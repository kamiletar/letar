import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Добавить элемент в Form.Group.List.
 *
 * Ищет кнопку "Добавить" / "Add" внутри контейнера списка.
 *
 * @param listName — имя группы-списка (опционально, если на странице один список)
 *
 * @example
 * ```tsx
 * await addItem('phones')
 * await addItem() // если список один
 * ```
 */
export async function addItem(listName?: string): Promise<void> {
  const user = userEvent.setup()
  const addButton = findAddButton(listName)

  if (!addButton) {
    throw new Error(
      `addItem: кнопка добавления не найдена${listName ? ` для списка "${listName}"` : ''}`,
    )
  }

  await user.click(addButton)
  await waitFor(() => {})
}

/**
 * Удалить элемент из Form.Group.List по индексу.
 *
 * @param index — индекс элемента (0-based)
 * @param listName — имя группы-списка (опционально)
 *
 * @example
 * ```tsx
 * await removeItem(0, 'phones')
 * await removeItem(2)
 * ```
 */
export async function removeItem(index: number, listName?: string): Promise<void> {
  const user = userEvent.setup()
  const container = findListContainer(listName)

  if (!container) {
    throw new Error(
      `removeItem: контейнер списка не найден${listName ? ` ("${listName}")` : ''}`,
    )
  }

  // Ищем все кнопки удаления внутри контейнера
  const removeButtons = within(container).queryAllByRole('button', { name: /удалить|remove|delete|×|✕/i })

  if (index >= removeButtons.length) {
    throw new Error(
      `removeItem: индекс ${index} вне диапазона (найдено ${removeButtons.length} элементов)`,
    )
  }

  await user.click(removeButtons[index])
  await waitFor(() => {})
}

/**
 * Проверить количество элементов в Form.Group.List.
 *
 * @param listName — имя группы-списка
 * @param count — ожидаемое количество
 *
 * @example
 * ```tsx
 * expectItemCount('phones', 3)
 * ```
 */
export function expectItemCount(listName: string, count: number): void {
  const container = findListContainer(listName)

  if (!container) {
    if (count === 0) return
    throw new Error(`expectItemCount: контейнер списка "${listName}" не найден`)
  }

  // Считаем элементы по data-list-item или по кнопкам удаления
  const items = container.querySelectorAll('[data-list-item], [data-list-index]')
  const removeButtons = within(container).queryAllByRole('button', { name: /удалить|remove|delete|×|✕/i })

  const actual = items.length > 0 ? items.length : removeButtons.length

  if (actual !== count) {
    throw new Error(
      `expectItemCount: в списке "${listName}" ${actual} элементов, ожидалось ${count}`,
    )
  }
}

/** Найти кнопку добавления */
function findAddButton(listName?: string): HTMLElement | null {
  if (listName) {
    const container = findListContainer(listName)
    if (container) {
      return within(container).queryByRole('button', { name: /добавить|add|\+/i })
    }
  }

  // Глобальный поиск
  try {
    return screen.getByRole('button', { name: /добавить|add/i })
  } catch {
    return null
  }
}

/** Найти контейнер списка по имени */
function findListContainer(listName?: string): HTMLElement | null {
  if (!listName) {
    return document.querySelector<HTMLElement>('[data-list-name]')
  }
  return document.querySelector<HTMLElement>(`[data-list-name="${listName}"]`)
}
