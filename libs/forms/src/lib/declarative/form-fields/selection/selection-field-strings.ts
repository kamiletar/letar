'use client'

/**
 * Словарь встроенных строк полей выбора живёт в `@letar/forms-react` — его делят Chakra- и shadcn-скин
 * (раньше здесь была копия, а у shadcn — вторая, с расхождениями в английских текстах). Файл оставлен
 * ради существующих импортов внутри скина.
 */
export { resolveSelectionString, useSelectionString } from '@letar/forms-react'
export type { SelectionStringKey } from '@letar/forms-react'
