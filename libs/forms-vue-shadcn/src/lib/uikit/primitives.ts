import { createFieldPrimitives } from '../field/create-field-primitives'
import { rekaUIKit } from './uikit-reka'

/**
 * Точка сборки Reka UI-скина (Фаза 7.8 → Поток 1, письмо #61) — Vue-аналог
 * `libs/forms-shadcn/src/lib/uikit/primitives.ts`: композиционный слой вызывается один раз со
 * своей реализацией UIKit на уровне модуля, не внутри рендера — компоненты стабильны по ссылке.
 */
export const { createField, FieldWrapper } = createFieldPrimitives(rekaUIKit)
