/**
 * Общее состояние переключателей осей Framework × Skin (P7, PLAN.md).
 *
 * Framework — React ↔ Vue ↔ Angular (Этап 2/3). Skin (Chakra ↔ shadcn) виден только внутри
 * React — у Vue/Angular-пруфов нет деления на скины (headless по конструкции).
 *
 * Хранение: URL query-параметр → localStorage → дефолт (решение 1, P7 PLAN.md).
 * ⛔ Cookie намеренно не используется — убивает индексацию не-дефолтных вариантов
 * (см. обоснование решения 1 в PLAN.md).
 */

export const SKIN_VALUES = ['chakra', 'shadcn'] as const
export type Skin = (typeof SKIN_VALUES)[number]
export const DEFAULT_SKIN: Skin = 'chakra'

export const FRAMEWORK_VALUES = ['react', 'vue', 'angular'] as const
export type Framework = (typeof FRAMEWORK_VALUES)[number]
export const DEFAULT_FRAMEWORK: Framework = 'react'

export const SKIN_QUERY_PARAM = 'skin'
export const FRAMEWORK_QUERY_PARAM = 'fw'

export const SKIN_STORAGE_KEY = 'letar-forms-docs-skin'
export const FRAMEWORK_STORAGE_KEY = 'letar-forms-docs-framework'

export function isSkin(value: unknown): value is Skin {
  return typeof value === 'string' && (SKIN_VALUES as readonly string[]).includes(value)
}

export function isFramework(value: unknown): value is Framework {
  return typeof value === 'string' && (FRAMEWORK_VALUES as readonly string[]).includes(value)
}

/**
 * Безопасное чтение localStorage — try/catch на случай quota/privacy-mode
 * (решение 3, P7 PLAN.md). Вызывать только из useEffect, никогда из инициализатора стора.
 */
export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // quota/privacy-mode — не критично, выбор всё равно попадёт в URL этой сессии
  }
}
