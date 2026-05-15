/**
 * Константы для api-logs
 */

/** Количество записей на страницу */
export const ITEMS_PER_PAGE = 50

/** Типы фильтров по статусу */
export type StatusFilter = 'all' | 'success' | 'error'

/** Получить цвет для HTTP метода */
export function getMethodColor(method: string): string {
  switch (method) {
    case 'GET':
      return 'blue'
    case 'POST':
      return 'green'
    case 'PUT':
    case 'PATCH':
      return 'orange'
    case 'DELETE':
      return 'red'
    default:
      return 'gray'
  }
}

/** Получить цвет для HTTP статуса */
export function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) {
    return 'green'
  }
  if (status >= 400 && status < 500) {
    return 'orange'
  }
  if (status >= 500) {
    return 'red'
  }
  return 'gray'
}
