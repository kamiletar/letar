# @letar/forms-vue

Vue-адаптер `@letar/forms` поверх `@tanstack/vue-form`. Начинался как архитектурный пруф границы
(`forms-core` не потребовал ни одного изменения под Vue), сейчас — полный паритет с React-скином.

✅ **Полный порт — 61/61 поле React-скина.**

## Установка

```bash
npm i @letar/forms-vue@beta @letar/forms-core vue @tanstack/vue-form @tanstack/vue-table zod
```

Требуется peer `@letar/forms-core` (>=0.28.0 <1). Для `FieldRichText` (Tiptap) дополнительно:

```bash
npm i @tiptap/vue-3 @tiptap/starter-kit @tiptap/extension-placeholder
```

## Быстрый старт

```vue
<script setup lang="ts">
import { AppForm, FieldCheckbox, FieldInput, FieldNumber, FieldSelect } from '@letar/forms-vue'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(2).meta({ ui: { title: 'Название', placeholder: 'Введите...' } }),
  rating: z.number().min(0).max(10).meta({ ui: { title: 'Рейтинг' } }),
  agree: z.boolean().meta({ ui: { title: 'Согласен с условиями' } }),
})

function handleSubmit(value: Record<string, unknown>) {
  console.log(value)
}
</script>

<template>
  <AppForm :schema="schema" :initial-value="{ title: '', rating: 5, agree: false }" :on-submit="handleSubmit">
    <FieldInput name="title" />
    <FieldNumber name="rating" />
    <FieldCheckbox name="agree" />
    <button type="submit">Сохранить</button>
  </AppForm>
</template>
```

Метки/плейсхолдеры читаются из той же `.meta({ ui: {...} })` Zod-схемы, что использует React-скин
— это и есть демонстрация общей границы: `@letar/forms-core/schema` не знает, кто её вызывает.

## API

### `<AppForm :schema :initial-value :on-submit>`

Корневой компонент. Заводит `@tanstack/vue-form` через `useForm`, отдаёт `form`+`schema` полям
через `provide`/`inject`. Сабмит — обычный `<form @submit>` с `preventDefault`.

### Поля

Основные поля; полный список — в экспортах пакета.

| Компонент             | Пропсы                                                                                                                                                   | Значение схемы                |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `FieldInput`          | `name`, `label?`, `placeholder?`                                                                                                                         | `string`                      |
| `FieldTextarea`       | `name`, `label?`, `placeholder?`                                                                                                                         | `string`                      |
| `FieldNumber`         | `name`, `label?`, `placeholder?`                                                                                                                         | `number`                      |
| `FieldNumberInput`    | `name`, `label?`, `placeholder?`, `min?/max?/step?`                                                                                                      | `number`                      |
| `FieldCheckbox`       | `name`, `label?`                                                                                                                                         | `boolean`                     |
| `FieldSwitch`         | `name`, `label?`                                                                                                                                         | `boolean`                     |
| `FieldSelect`         | `name`, `label?`, `placeholder?`, `options`                                                                                                              | `string`                      |
| `FieldNativeSelect`   | `name`, `label?`, `placeholder?`, `options`                                                                                                              | `string`                      |
| `FieldRadioGroup`     | `name`, `label?`, `options`, `orientation?`                                                                                                              | `string`                      |
| `FieldPassword`       | `name`, `label?`, `placeholder?`, `defaultVisible?`                                                                                                      | `string`                      |
| `FieldHidden`         | `name`, `value?`                                                                                                                                         | любое                         |
| `FieldYesNo`          | `name`, `label?`, `yesLabel?`, `noLabel?`                                                                                                                | `boolean`                     |
| `FieldDate`           | `name`, `label?`, `placeholder?`, `min?/max?`                                                                                                            | `string`                      |
| `FieldTime`           | `name`, `label?`, `placeholder?`, `min?/max?/step?`                                                                                                      | `string`                      |
| `FieldCurrency`       | `name`, `label?`, `placeholder?`, `currency?`                                                                                                            | `number`                      |
| `FieldPercentage`     | `name`, `label?`, `placeholder?`, `min?/max?/step?`                                                                                                      | `number`                      |
| `FieldMaskedInput`    | `name`, `label?`, `mask`, `formatMode?`, `formatDescription`                                                                                             | `string`                      |
| `FieldPassport`       | `name`, `label?`                                                                                                                                         | `string`                      |
| `FieldINN`            | `name`, `label?`                                                                                                                                         | `string`                      |
| `FieldKPP`            | `name`, `label?`                                                                                                                                         | `string`                      |
| `FieldOGRN`           | `name`, `label?`                                                                                                                                         | `string`                      |
| `FieldSNILS`          | `name`, `label?`                                                                                                                                         | `string`                      |
| `FieldBIK`            | `name`, `label?`                                                                                                                                         | `string`                      |
| `FieldBankAccount`    | `name`, `label?`                                                                                                                                         | `string`                      |
| `FieldCorrAccount`    | `name`, `label?`                                                                                                                                         | `string`                      |
| `FieldPhone`          | `name`, `label?`, `country?`, `autoUnmask?`                                                                                                              | `string`                      |
| `FieldDateRange`      | `name`, `label?`, `startLabel?/endLabel?`, `min?/max?`, `presets?`, `orientation?`                                                                       | `{start,end}`                 |
| `FieldDateTimePicker` | `name`, `label?`, `minDateTime?/maxDateTime?`, `timeStep?`                                                                                               | `string`                      |
| `FieldDuration`       | `name`, `label?`, `format?`, `min?/max?/step?`                                                                                                           | `number`                      |
| `FieldSlider`         | `name`, `label?`, `min?/max?/step?`, `showValue?`                                                                                                        | `number`                      |
| `FieldRating`         | `name`, `label?`, `count?`                                                                                                                               | `number`                      |
| `FieldCreditCard`     | `name?`, `label?`, `brands?`, `showBrandIcon?`, `layout?`, `disabled?`, `readOnly?`                                                                      | `{number,expiry,cvc}`         |
| `FieldPinInput`       | `name`, `label?`, `count?`, `mask?`, `otp?`, `type?`, `onComplete?`                                                                                      | `string`                      |
| `FieldOTPInput`       | `name`, `label?`, `length?`, `type?`, `mask?`, `autoSubmit?`, `resendTimeout?`, `onResend?`                                                              | `string`                      |
| `FieldColorPicker`    | `name`, `label?`, `swatches?`                                                                                                                            | `string`                      |
| `FieldFileUpload`     | `name`, `label?`, `accept?`, `maxFiles?`, `security?`                                                                                                    | `File[]`                      |
| `FieldSignature`      | `name`, `label?`, `width?`, `height?`, `strokeColor?`, `strokeWidth?`, `backgroundColor?`, `clearLabel?`, `placeholder?`, `allowTyped?`, `exportFormat?` | `string` (data URI)           |
| `FieldAddress`        | `name`, `label?`, `placeholder?`, `provider?`, `token?`, `minChars?`, `debounceMs?`, `valueOnly?`                                                        | `{value,data?}` либо `string` |
| `FieldCity`           | `name`, `label?`, `placeholder?`, `provider?`, `token?`, `minChars?`, `debounceMs?`                                                                      | `string`                      |

`FieldColorPicker` — Vue-идиоматичное упрощение относительно Chakra `ColorPicker.Root` (Ark UI
compound-компонент с area/hue/alpha слайдерами): нативный `<input type="color">` (браузерный
пикер уже даёт то же самое бесплатно) + hex-инпут + палитра свотчей. `FieldPinInput`/
`FieldOTPInput` — N ячеек `<input maxlength="1">` вместо Ark UI `PinInput.Root`, общая логика
клавиатуры/paste — в composable `usePinInputField` (`@letar/forms-vue/core`).

`FieldSignature` — canvas-подпись (рисование + typed-режим), логика в `useSignatureField`
(`@letar/forms-vue/core`), 1:1 порт React `field-signature.tsx`. `FieldAddress`/`FieldCity` —
инпут с автодополнением, `createDaDataProvider`/`AddressProvider` (`@letar/forms-core/address`)
уже framework-agnostic, порт не потребовался — Vue-специфика (debounce, click-outside, клавиатура)
вынесена в `useAddressSuggestions` (`@letar/forms-vue/core`), общую для обоих полей.

Документные поля (`FieldPassport`…`FieldCorrAccount`) собраны через общую фабрику
`createDocumentField` поверх `useMaskField`
(`@letar/forms-vue/core`, движок `@letar/forms-core/mask`, контрольные суммы —
`@letar/forms-core/validators/ru`). `FieldPhone` — единственное исключение среди «масочных»
полей: форматирует через чистый JS-форматтер `@letar/forms-core/phone`, не через
`useMaskField`/`MaskController` (WebKit-safe, тот же выбор, что в React-скине).

`label`/`placeholder` необязательны — по умолчанию берутся из `schema.meta({ ui: {...} })` по
пути `name` (`getFieldMeta`, тот же вызов, что у React-скина). Валидация — `onChange` по
`schema.shape[name]`, `@tanstack/vue-form` принимает Zod-схему напрямую (Standard Schema).

Вёрстка полей — голый HTML с классами `letar-field`/`letar-field__label`/`letar-field__control`/
`letar-field__error`, без CSS и без UIKit-абстракции (см. «Что не входит в скоуп» ниже).

### `createField(displayName, render)`

Фабрика для собственных простых полей (тот же контракт, что у 5 встроенных) — Vue-эквивалент
`createField` из `@letar/forms-react`. `FieldSelect` под неё не подошёл (нужен доп. проп
`options`) и собран напрямую по тому же контексту.

### `useAppFormContext()` / `provideAppForm()`

Низкоуровневый доступ к `{ form, schema }` — для полей, которым `createField` не подходит
(как `FieldSelect`).

### `useMaskField(options)`

Composable движка масок `@letar/forms-core/mask` — Vue-аналог `useMaskField` из
`@letar/forms-react`. `'live'`-режим отдаёт неконтролируемый `<input>` (`inputRef` без
`value`/`onInput` в vnode-данных — DOM источник истины, `MaskController` пишет напрямую).
**Обязательно вызывать один раз в `setup()`** поля, не в render-замыкании — иначе `inputRef`
терял бы стабильную идентичность между ре-рендерами и `MaskController` пересоздавался бы на
каждое нажатие клавиши. Используется `createDocumentField` и `FieldMaskedInput`; экспортируется
через `@letar/forms-vue/core`.

## Что НЕ входит в скоуп

- **Нет UIKit-абстракции** (в отличие от `forms-react`+`forms`/`forms-shadcn`) — одна референсная
  реализация на голом HTML, без свопаемого дизайн-скина. Для headless-слоя этого достаточно.
- **Нет `Form.Group`/`Form.Steps`/массивов** — только плоские top-level поля.

## Подпуть `@letar/forms-vue/core`

Композиционный слой без единого конкретного поля — `AppForm`, `createField`, `provideAppForm`,
`useAppFormContext`, `resolveFieldMeta`, `withFieldValidation`. Vue-аналог роли, которую для React
играет `@letar/forms-react`: второй Vue-скин (`@letar/forms-vue-shadcn`) импортирует именно этот
подпуть, а не корневой `.` — так он не тянет референсные HTML-поля этого пакета.

```typescript
import { AppForm, createField, useAppFormContext } from '@letar/forms-vue/core'
```

Подпуть не импортирует референсные поля пакета — та же граница, что у `forms-core`/`forms-react`.

## Связанные пакеты

- `@letar/forms-core` — framework-agnostic ядро, которое этот пакет проверяет на границу
- `@letar/forms-react` — React-эквивалент того же контракта (`createField`, композиционный слой)
