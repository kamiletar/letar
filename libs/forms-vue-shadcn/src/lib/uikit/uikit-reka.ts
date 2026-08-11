import type { UIKitCorePrimitives, UIKitExtendedPrimitives } from '@letar/forms-core/uikit'
import { Checkbox } from './primitives/checkbox'
import { Combobox } from './primitives/combobox'
import { ErrorFallback } from './primitives/error-fallback'
import { FieldError } from './primitives/field-error'
import { FieldLabel } from './primitives/field-label'
import { FieldRoot } from './primitives/field-root'
import { Input } from './primitives/input'
import { NumberInput } from './primitives/number-input'
import { Select } from './primitives/select'
import type { UINode } from './ui-node'

/**
 * Reka UI-реализация `UIKit`-контракта из `forms-core` (Фаза 7.8 → Поток 1, письмо #61).
 *
 * Каждый примитив — обычная функция `(props) => VNode`, не Vue-компонент: контракт
 * `UIKitCorePrimitives<TNode>` описывает `(props: X) => TNode`, и в Vue `TNode = UINode`
 * (`VNode | string | null`, см. `./ui-node.ts`) этому соответствует буквально, без обёртки
 * `defineComponent`. Композиционный слой (`createFieldPrimitives`,
 * `./field/create-field-primitives.ts`) вызывает эти функции напрямую внутри чужого
 * render-контекста — реактивность приходит от родителя, а не от отдельного инстанса компонента
 * на каждый примитив.
 *
 * Реализованы core-примитивы + минимум extended, нужный 6 полям (Поток 1): `NumberInput` для
 * `FieldNumber`, `Combobox` для `FieldCombobox`, `ErrorFallback` для error-boundary
 * композиционного слоя. Остальные extended-примитивы (`RadioGroup`/`PinInput`/...) не
 * реализованы — не входят в скоуп 6 демонстрационных полей.
 */
type ImplementedExtendedPrimitives = 'ErrorFallback' | 'NumberInput' | 'Combobox'

export type RekaUIKit =
  & UIKitCorePrimitives<UINode>
  & Required<Pick<UIKitExtendedPrimitives<UINode>, ImplementedExtendedPrimitives>>

export const rekaUIKit: RekaUIKit = {
  FieldRoot,
  FieldLabel,
  FieldError,
  Input,
  Checkbox,
  Select,
  NumberInput,
  Combobox,
  ErrorFallback,
}
