# @letar/forms-vue-shadcn

Reka UI-скин `@letar/forms-vue` — реализация `UIKit`-контракта из `@letar/forms-core` на
[Reka UI](https://reka-ui.com) (бывший Radix Vue) + Tailwind + cva. Vue-эквивалент
`@letar/forms-shadcn` (Фаза 7.3, React): та же архитектура (`createFieldPrimitives(uikit)`),
тот же стек примитивов (Radix-семейство), перенесённый на Vue.

⚠️ **Не полный порт `@letar/forms-shadcn`** — 32 из 61 поля (Фаза 9, Этап 4 завершён, план —
`libs/forms/PLAN.md`). До Фазы 9 (2026-08-13) пакет был архитектурным пруфом на 6 полей (письмо
координатора форм #61); решение координатора расширило скоуп до полного паритета. См. «Что не
входит в скоуп» ниже — там актуальный список недостающего.

## Установка

Библиотека уже включена в монорепозиторий. Внешние зависимости (`reka-ui`, `vue`,
`@tanstack/vue-form`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-vue-next`) —
peer dependencies, устанавливаются потребителем отдельно.

## Быстрый старт

```ts
import { AppForm } from '@letar/forms-vue'
import { FieldCheckbox, FieldNumber, FieldSelect, FieldString } from '@letar/forms-vue-shadcn'
import { defineComponent, h } from 'vue'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(2).meta({ ui: { title: 'Название' } }),
  rating: z.number().min(1).max(10).meta({ ui: { title: 'Рейтинг' } }),
  category: z.string().meta({ ui: { title: 'Категория' } }),
  agree: z.boolean().meta({ ui: { title: 'Согласен' } }),
})

export default defineComponent({
  setup() {
    return () =>
      h(
        AppForm,
        { schema, initialValue: { title: '', rating: 5, category: '', agree: false }, onSubmit: console.log },
        {
          default: () => [
            h(FieldString, { name: 'title' }),
            h(FieldNumber, { name: 'rating' }),
            h(FieldSelect, { name: 'category', options: [{ value: 'a', label: 'A' }] }),
            h(FieldCheckbox, { name: 'agree' }),
          ],
        },
      )
  },
})
```

`AppForm`/`useAppFormContext` — из `@letar/forms-vue/core` (композиционный слой, Фаза 9; до неё —
корневой `@letar/forms-vue`, см. CHANGELOG 0.2.0), не отсюда: этот пакет несёт только UIKit-скин и
поля поверх него, не форму целиком. Импорт именно подпути `/core`, не корневого `.` —
`forms-vue-shadcn` не должен тянуть референсные HTML-поля headless-пакета.

## API

### `rekaUIKit`

Реализация `UIKit`-контракта (`@letar/forms-core/uikit`) на Reka UI: `FieldRoot`/`FieldLabel`/
`FieldError` (core) + `Input`/`Checkbox`/`Select` (core) + `NumberInput`/`Combobox`/`RadioGroup`/
`NativeSelect`/`ErrorFallback` (extended, 32 поля на 2026-08-13). `Switch`/`Slider`/`Rating` в контракт
не входят (см. таблицу полей ниже) — рисуются в обход UIKit напрямую на `reka-ui`/`lucide-vue-next`,
тот же принцип для всех трёх. Каждый примитив — обычная функция
`(props) => VNode`, не Vue-компонент (см. `createFieldPrimitives` ниже — почему это осознанный
выбор, не упрощение).

### `createFieldPrimitives(uikit)` → `{ createField, FieldWrapper }`

Vue-версия `createFieldPrimitives` из `@letar/forms-react` (Фаза 7.3) — фабрика композиционного
слоя, привязанная к конкретному UIKit. `libs/forms-vue-shadcn/src/lib/uikit/primitives.ts` вызывает
её один раз со своим `rekaUIKit`; экспортируемые `createField`/`FieldWrapper` из этого пакета —
готовый результат, для написания нового Reka-поля обычно не нужно вызывать фабрику самому.

Разбор Zod-меты и обёртку `form.Field` (`resolveFieldMeta`/`withFieldValidation`) фабрика берёт из
`@letar/forms-vue/core` (Фаза 9) — не дублирует: та же логика нужна простым полям headless-пакета.
Сверх неё здесь только специфика скина — `onErrorCaptured`-обвязка и вызов `uikit.ErrorFallback`.

Отличия от React-версии не косметические:

- Ошибку рендера внутри поля React ловит классовым `ErrorBoundary`
  (`getDerivedStateFromError`/`componentDidCatch`) — в Vue такого паттерна нет. Здесь та же задача
  решена хуком `onErrorCaptured` прямо в `setup()` компонента поля.
- Нет `useResolvedFieldProps`/`useFieldState` — минимальный набор аргументов рендера
  (`FieldRenderArgs`), достаточный для 6 простых полей; не абстракция под будущий рост.

### Поля (32 штуки)

| Компонент             | Пропсы                                                                             | Значение схемы |
| --------------------- | ---------------------------------------------------------------------------------- | -------------- |
| `FieldString`         | `name`, `label?`, `placeholder?`                                                   | `string`       |
| `FieldNumber`         | `name`, `label?`                                                                   | `number`       |
| `FieldNumberInput`    | `name`, `label?`, `min?/max?/step?`                                                | `number`       |
| `FieldCheckbox`       | `name`, `label?`                                                                   | `boolean`      |
| `FieldSwitch`         | `name`, `label?`                                                                   | `boolean`      |
| `FieldTextarea`       | `name`, `label?`, `placeholder?`                                                   | `string`       |
| `FieldSelect`         | `name`, `label?`, `placeholder?`, `options`                                        | `string`       |
| `FieldNativeSelect`   | `name`, `label?`, `placeholder?`, `options`                                        | `string`       |
| `FieldCombobox`       | `name`, `label?`, `placeholder?`, `options`                                        | `string`       |
| `FieldRadioGroup`     | `name`, `label?`, `options`                                                        | `string`       |
| `FieldPassword`       | `name`, `label?`, `placeholder?`                                                   | `string`       |
| `FieldHidden`         | `name`, `value?`                                                                   | любое          |
| `FieldYesNo`          | `name`, `label?`, `yesLabel?`, `noLabel?`                                          | `boolean`      |
| `FieldDate`           | `name`, `label?`, `placeholder?`                                                   | `string`       |
| `FieldTime`           | `name`, `label?`, `placeholder?`                                                   | `string`       |
| `FieldCurrency`       | `name`, `label?`, `placeholder?`                                                   | `number`       |
| `FieldPercentage`     | `name`, `label?`, `placeholder?`                                                   | `number`       |
| `FieldMaskedInput`    | `name`, `label?`, `mask`, `formatMode?`, `formatDescription`                       | `string`       |
| `FieldPassport`       | `name`, `label?`                                                                   | `string`       |
| `FieldINN`            | `name`, `label?`                                                                   | `string`       |
| `FieldKPP`            | `name`, `label?`                                                                   | `string`       |
| `FieldOGRN`           | `name`, `label?`                                                                   | `string`       |
| `FieldSNILS`          | `name`, `label?`                                                                   | `string`       |
| `FieldBIK`            | `name`, `label?`                                                                   | `string`       |
| `FieldBankAccount`    | `name`, `label?`                                                                   | `string`       |
| `FieldCorrAccount`    | `name`, `label?`                                                                   | `string`       |
| `FieldPhone`          | `name`, `label?`, `country?`, `autoUnmask?`                                        | `string`       |
| `FieldDateRange`      | `name`, `label?`, `startLabel?/endLabel?`, `min?/max?`, `presets?`, `orientation?` | `{start,end}`  |
| `FieldDateTimePicker` | `name`, `label?`, `minDateTime?/maxDateTime?`, `timeStep?`                         | `string`       |
| `FieldDuration`       | `name`, `label?`, `format?`, `min?/max?/step?`                                     | `number`       |
| `FieldSlider`         | `name`, `label?`, `min?/max?/step?`, `showValue?`                                  | `number`       |
| `FieldRating`         | `name`, `label?`, `count?`                                                         | `number`       |

`FieldSelect`/`FieldCombobox`/`FieldRadioGroup`/`FieldNativeSelect`/`FieldNumberInput`/
`FieldPassword`/`FieldHidden`/`FieldYesNo`/`FieldDateRange`/`FieldDateTimePicker`/`FieldDuration`
собраны не через `createField` (нужен доп. проп сверх `name`/`label`/`placeholder`, либо
локальное состояние, которого нет в контракте фабрики) — напрямую по
`useAppFormContext`/`resolveFieldMeta`/`withFieldValidation`, тем же паттерном, что и в headless
`@letar/forms-vue`. `FieldSwitch`/`FieldSlider`/`FieldRating` рисуют свой контрол вне
UIKit-контракта (см. выше «Поля») — тот же выбор, что у React `forms-shadcn`.

Документные поля (`FieldMaskedInput`…`FieldCorrAccount`, кроме `FieldPhone`) — Reka-версия
`createDocumentField` (`src/lib/fields/document-field-base.ts`) поверх `useMaskField`
(`@letar/forms-vue/core`), рисуют сырой `<input>` в обход `rekaUIKit.Input` (`'live'`-режим
неконтролируемый, `UIKitInputProps` требует `value`/`onChange`) — тот же приём, что у
`FieldPassword`. `FieldPhone` — контролируемое поле через `rekaUIKit.Input`, форматтер
`@letar/forms-core/phone`, не `useMaskField`.

### `cn()`

`clsx` + `tailwind-merge` — стандартный shadcn-хелпер объединения классов.

## Что не входит в скоуп

- **Не все 61 поле React-скина** — 32 (Фаза 9, Этапы 1–4 закрыты). Остальные — следующие этапы
  плана Фазы 9 (`libs/forms/PLAN.md`): тяжёлые peer-dep поля, survey/table.
- **`FieldCreditCard`** сознательно отложен из Этапа 3 (компаунд-поле, без `useMaskField`) —
  следующий заход.
- **`PinInput`/`SegmentGroup` и другой extended UIKit** — не реализованы, ждут своих этапов.
- **Нет `Form.Group`/`Form.Steps`/табличных полей** — только плоские top-level поля.

## Demo

Минимальный dev-харнесс (не Nx-приложение — в монорепо нет Vue+Vite приложений, заводить одно ради
6 полей непропорционально задаче):

```bash
nx run @letar/forms-vue-shadcn:demo
```

## Команды

```bash
nx test forms-vue-shadcn
nx lint forms-vue-shadcn
nx typecheck:tsgo forms-vue-shadcn
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/forms-vue-shadcn` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/forms-vue-shadcn` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).

## Связанные документы

- [libs/forms/PLAN.md](../forms/PLAN.md) — Поток 1 письма координатора #61, стратегический контекст
- [libs/forms-vue/README.md](../forms-vue/README.md) — headless-слой (`AppForm`, `useAppFormContext`),
  на котором построен этот скин
- [libs/forms-shadcn/README.md](../forms-shadcn/README.md) — React-эквивалент того же контракта
- [libs/forms-core/README.md](../forms-core/README.md) — framework-agnostic ядро (`UIKit`-контракт)
