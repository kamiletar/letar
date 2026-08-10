'use client'

import type { UIKitCorePrimitives, UIKitExtendedPrimitives } from '@letar/forms-core/uikit'
import type { ReactNode } from 'react'
import { Checkbox } from './primitives/checkbox'
import { Combobox } from './primitives/combobox'
import { ErrorFallback } from './primitives/error-fallback'
import { FieldError } from './primitives/field-error'
import { FieldLabel } from './primitives/field-label'
import { FieldRoot } from './primitives/field-root'
import { Input } from './primitives/input'
import { NativeSelect } from './primitives/native-select'
import { NumberInput } from './primitives/number-input'
import { PinInput } from './primitives/pin-input'
import { RadioGroup } from './primitives/radio-group'
import { SegmentGroup } from './primitives/segment-group'
import { Select } from './primitives/select'

/**
 * shadcn-реализация `UIKit`-контракта из `forms-core` (Фаза 7.3, Шаг 5).
 *
 * Прямые Radix-примитивы + `cva`/`tailwind-merge`, не `shadcn` CLI — решение задокументировано
 * в `libs/forms/PLAN.md` (§7.3, Шаг 5). Композиционный слой (`createField`, `FieldWrapper`,
 * `FieldErrorBoundary`) не отличает, откуда пришёл UIKit — `@letar/forms-react`.
 *
 * Реализованы только core-примитивы + минимум extended, нужный `createFieldPrimitives`
 * (`ErrorFallback`) — beta покрывает 3 поля (String/Checkbox/Select), не весь контракт.
 *
 * Каждый примитив реализован в своём файле под `./primitives/` — этот модуль только собирает
 * их в объект `shadcnUIKit`, удовлетворяющий контракту `ShadcnUIKit`.
 */
type ImplementedExtendedPrimitives =
  | 'ErrorFallback'
  | 'NumberInput'
  | 'RadioGroup'
  | 'SegmentGroup'
  | 'NativeSelect'
  | 'Combobox'
  | 'PinInput'

export type ShadcnUIKit =
  & UIKitCorePrimitives<ReactNode>
  & Required<Pick<UIKitExtendedPrimitives<ReactNode>, ImplementedExtendedPrimitives>>

export const shadcnUIKit: ShadcnUIKit = {
  FieldRoot,
  FieldLabel,
  FieldError,
  Input,
  Checkbox,
  Select,
  NumberInput,
  RadioGroup,
  SegmentGroup,
  NativeSelect,
  Combobox,
  PinInput,
  ErrorFallback,
}
