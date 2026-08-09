'use client'

import { createFieldPrimitives } from '@letar/forms-react'
import { chakraUIKit } from './uikit-chakra'

/**
 * Точка сборки Chakra-скина (Фаза 7.3).
 *
 * Композиционный слой (`createField`, `FieldWrapper`, `FieldErrorBoundary`) живёт в
 * UI-library-free `@letar/forms-react` и ничего не знает про Chakra — здесь он один раз
 * связывается с конкретной реализацией UIKit-контракта. `@letar/forms-shadcn` делает
 * ровно то же самое со своим `shadcnUIKit`, не дублируя ни строчки сборки поля.
 *
 * Вызов на уровне модуля, а не внутри рендера: компоненты должны быть стабильными по
 * ссылке, иначе React размонтировал бы поддерево поля на каждую перерисовку формы.
 */
export const { createField, FieldErrorBoundary, FieldWrapper } = createFieldPrimitives(chakraUIKit)
