'use client'

import { createFieldPrimitives } from '@letar/forms-react'
import { shadcnUIKit } from './uikit-shadcn'

/**
 * Точка сборки shadcn-скина (Фаза 7.3, Шаг 5) — то же место, что `libs/forms/.../base/primitives.ts`
 * у Chakra-скина: композиционный слой (`createField`, `FieldWrapper`, `FieldErrorBoundary`) живёт
 * в UI-library-free `@letar/forms-react` и вызывается здесь один раз со своей реализацией UIKit.
 *
 * Вызов на уровне модуля, а не внутри рендера — компоненты должны быть стабильными по ссылке.
 */
export const { createField, FieldErrorBoundary, FieldWrapper } = createFieldPrimitives(shadcnUIKit)
