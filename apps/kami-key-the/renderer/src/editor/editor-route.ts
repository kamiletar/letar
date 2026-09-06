/**
 * Адресуемое состояние экрана редактора (клавиша + активная категория пикера)
 *
 * Синхронизируется с location.hash, чтобы «назад» сворачивал уровни по одному
 * (сначала пикер, потом саму клавишу), а не уводил из редактора целиком.
 */

export interface EditorRoute {
  /** VK выбранной клавиши, null — показана клавиатура */
  keyVk: number | null
  /** id активной категории пикера символов, null — категория не выбрана ("Все") */
  category: string | null
}

const EMPTY_ROUTE: EditorRoute = { keyVk: null, category: null }

/** Разобрать route из location.hash (`#key=44&picker=arrows`) */
export function parseRoute(hash: string): EditorRoute {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const keyParam = params.get('key')
  return {
    keyVk: keyParam ? parseInt(keyParam, 16) : null,
    category: params.get('picker'),
  }
}

/** Собрать hash-строку из route (пусто, если route пуст) */
function buildHash(route: EditorRoute): string {
  const params = new URLSearchParams()
  if (route.keyVk != null) {
    params.set('key', route.keyVk.toString(16))
  }
  if (route.category) {
    params.set('picker', route.category)
  }
  const qs = params.toString()
  return qs ? `#${qs}` : ''
}

/** Записать route в адресную строку (замена текущей записи, без истории браузера) */
export function syncRouteToLocation(route: EditorRoute): void {
  const hash = buildHash(route)
  const url = hash || window.location.pathname + window.location.search
  window.history.replaceState(null, '', url)
}

/** Один шаг «назад»: сначала закрыть категорию пикера, потом — саму клавишу */
export function stepBack(route: EditorRoute): EditorRoute {
  if (route.category != null) {
    return { ...route, category: null }
  }
  if (route.keyVk != null) {
    return EMPTY_ROUTE
  }
  return route
}
