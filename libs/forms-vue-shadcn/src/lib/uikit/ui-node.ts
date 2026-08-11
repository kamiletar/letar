import type { VNode } from 'vue'

/**
 * `TNode` контракта `forms-core/uikit` для Vue: строка проходит как обычный текстовый узел
 * (Vue, в отличие от React, не типизирует `VNode` как надмножество строк), `null` — то, что
 * возвращают `FieldLabel`/`FieldError`, когда рендерить нечего (эквивалент `null` в ReactNode).
 */
export type UINode = VNode | string | null
