# @letar/forms-vue-shadcn

Reka UI-скин `@letar/forms-vue` — реализация `UIKit`-контракта из `@letar/forms-core` на
[Reka UI](https://reka-ui.com) (бывший Radix Vue) + Tailwind + cva. Vue-эквивалент
`@letar/forms-shadcn` (Фаза 7.3, React): та же архитектура (`createFieldPrimitives(uikit)`),
тот же стек примитивов (Radix-семейство), перенесённый на Vue.

⚠️ **Не полный порт `@letar/forms-shadcn`** — 6 демонстрационных полей (Input/Number/Checkbox/
Textarea/Select/Combobox), не 56/47. Задача (письмо координатора форм #61, Поток 1) — показать,
как выглядит полноценный дизайн-скин с UIKit-контрактом на другом фреймворке, не догнать паритет
полей. См. «Что не входит в скоуп» ниже.

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

`AppForm`/`useAppFormContext` — из `@letar/forms-vue` (headless-слой, Фаза 7.8), не отсюда: этот
пакет несёт только UIKit-скин и поля поверх него, не форму целиком.

## API

### `rekaUIKit`

Реализация `UIKit`-контракта (`@letar/forms-core/uikit`) на Reka UI: `FieldRoot`/`FieldLabel`/
`FieldError` (core) + `Input`/`Checkbox`/`Select` (core) + `NumberInput`/`Combobox`/`ErrorFallback`
(extended, минимум под 6 полей). Каждый примитив — обычная функция `(props) => VNode`, не
Vue-компонент (см. `createFieldPrimitives` ниже — почему это осознанный выбор, не упрощение).

### `createFieldPrimitives(uikit)` → `{ createField, FieldWrapper }`

Vue-версия `createFieldPrimitives` из `@letar/forms-react` (Фаза 7.3) — фабрика композиционного
слоя, привязанная к конкретному UIKit. `libs/forms-vue-shadcn/src/lib/uikit/primitives.ts` вызывает
её один раз со своим `rekaUIKit`; экспортируемые `createField`/`FieldWrapper` из этого пакета —
готовый результат, для написания нового Reka-поля обычно не нужно вызывать фабрику самому.

Отличия от React-версии не косметические:

- Ошибку рендера внутри поля React ловит классовым `ErrorBoundary`
  (`getDerivedStateFromError`/`componentDidCatch`) — в Vue такого паттерна нет. Здесь та же задача
  решена хуком `onErrorCaptured` прямо в `setup()` компонента поля.
- Нет `useResolvedFieldProps`/`useFieldState` — минимальный набор аргументов рендера
  (`FieldRenderArgs`), достаточный для 6 простых полей; не абстракция под будущий рост.

### Поля (6 штук)

| Компонент       | Пропсы                                      | Значение схемы |
| --------------- | ------------------------------------------- | -------------- |
| `FieldString`   | `name`, `label?`, `placeholder?`            | `string`       |
| `FieldNumber`   | `name`, `label?`                            | `number`       |
| `FieldCheckbox` | `name`, `label?`                            | `boolean`      |
| `FieldTextarea` | `name`, `label?`, `placeholder?`            | `string`       |
| `FieldSelect`   | `name`, `label?`, `placeholder?`, `options` | `string`       |
| `FieldCombobox` | `name`, `label?`, `placeholder?`, `options` | `string`       |

`FieldSelect`/`FieldCombobox` собраны не через `createField` (нужен доп. проп `options`, которого
нет в контракте фабрики) — напрямую по `useAppFormContext`, тем же паттерном, что и в headless
`@letar/forms-vue`.

### `cn()`

`clsx` + `tailwind-merge` — стандартный shadcn-хелпер объединения классов.

## Что не входит в скоуп

- **Не 56/47 полей** — только 6. Остальные поля React-скинов (`RichText`/`FileUpload`/`Address`/…)
  в этом пакете не появятся без отдельного решения расширить скоуп.
- **RadioGroup/PinInput/NativeSelect и другой extended UIKit** — не реализованы, не нужны 6 полям.
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
