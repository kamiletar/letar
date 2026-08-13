import type { UIKitCorePrimitives, UIKitExtendedPrimitives } from '@letar/forms-core/uikit'
import { Checkbox } from './primitives/checkbox'
import { Combobox } from './primitives/combobox'
import { ErrorFallback } from './primitives/error-fallback'
import { FieldError } from './primitives/field-error'
import { FieldLabel } from './primitives/field-label'
import { FieldRoot } from './primitives/field-root'
import { Input } from './primitives/input'
import { NativeSelect } from './primitives/native-select'
import { NumberInput } from './primitives/number-input'
import { RadioGroup } from './primitives/radio-group'
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
 * Реализованы core-примитивы + extended, нужный полям Потока 1 и Этапа 2 (Фаза 9):
 * `NumberInput` для `FieldNumberInput`/`FieldCurrency`/`FieldPercentage`, `Combobox` для
 * `FieldCombobox`, `RadioGroup` для `FieldRadioGroup`, `NativeSelect` для `FieldNativeSelect`,
 * `ErrorFallback` для error-boundary композиционного слоя. `Switch` в контракт не входит
 * (`UIKitExtendedPrimitives` его не описывает) — `FieldSwitch` рисуется напрямую на
 * `reka-ui`/`SwitchRoot`, как и в React-скине (`forms-shadcn/field-switch.tsx`). Остальные
 * extended-примитивы (`PinInput`/`SegmentGroup`/...) не реализованы — следующие этапы плана
 * Фазы 9 (`libs/forms/PLAN.md`).
 */
type ImplementedExtendedPrimitives = 'ErrorFallback' | 'NumberInput' | 'Combobox' | 'RadioGroup' | 'NativeSelect'

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
  RadioGroup,
  NativeSelect,
  ErrorFallback,
}
