# Типы полей форм (40+)

## Текстовые поля

| Компонент                     | Описание                  | Пример                                            |
| ----------------------------- | ------------------------- | ------------------------------------------------- |
| `Form.Field.String`           | Текстовое поле            | `<Form.Field.String name="title" />`              |
| `Form.Field.Textarea`         | Многострочный текст       | `<Form.Field.Textarea name="bio" />`              |
| `Form.Field.Password`         | Пароль с toggle           | `<Form.Field.Password name="password" />`         |
| `Form.Field.PasswordStrength` | Пароль с индикатором силы | `<Form.Field.PasswordStrength name="password" />` |
| `Form.Field.Editable`         | Inline редактирование     | `<Form.Field.Editable name="title" />`            |
| `Form.Field.RichText`         | WYSIWYG (Tiptap)          | `<Form.Field.RichText name="content" />`          |

## Числовые поля

| Компонент                | Описание         | Пример                                                  |
| ------------------------ | ---------------- | ------------------------------------------------------- |
| `Form.Field.Number`      | Простое числовое | `<Form.Field.Number name="price" />`                    |
| `Form.Field.NumberInput` | Со стрелками     | `<Form.Field.NumberInput name="quantity" />`            |
| `Form.Field.Slider`      | Ползунок         | `<Form.Field.Slider name="volume" min={0} max={100} />` |
| `Form.Field.Rating`      | Звёзды           | `<Form.Field.Rating name="rating" count={5} />`         |
| `Form.Field.Currency`    | Деньги           | `<Form.Field.Currency name="price" />`                  |
| `Form.Field.Percentage`  | Проценты         | `<Form.Field.Percentage name="discount" />`             |

## Дата и время

| Компонент                   | Описание             | Пример                                       |
| --------------------------- | -------------------- | -------------------------------------------- |
| `Form.Field.Date`           | Дата                 | `<Form.Field.Date name="birthDate" />`       |
| `Form.Field.Time`           | Время                | `<Form.Field.Time name="startTime" />`       |
| `Form.Field.DateRange`      | Диапазон дат         | `<Form.Field.DateRange name="period" />`     |
| `Form.Field.DateTimePicker` | Дата + время         | `<Form.Field.DateTimePicker name="event" />` |
| `Form.Field.Duration`       | Длительность         | `<Form.Field.Duration name="duration" />`    |
| `Form.Field.Schedule`       | Недельное расписание | `<Form.Field.Schedule name="workHours" />`   |

## Выбор из списка

| Компонент                    | Описание            | Пример                                                           |
| ---------------------------- | ------------------- | ---------------------------------------------------------------- |
| `Form.Field.Select`          | Стилизованный       | `<Form.Field.Select name="role" options={options} />`            |
| `Form.Field.NativeSelect`    | Нативный            | `<Form.Field.NativeSelect name="country" />`                     |
| `Form.Field.CascadingSelect` | Каскадный           | `<Form.Field.CascadingSelect name="city" dependsOn="country" />` |
| `Form.Field.Combobox`        | Поиск + группы      | `<Form.Field.Combobox name="product" />`                         |
| `Form.Field.Autocomplete`    | Текст с подсказками | `<Form.Field.Autocomplete name="query" />`                       |
| `Form.Field.Listbox`         | Single/multi        | `<Form.Field.Listbox name="features" />`                         |
| `Form.Field.RadioGroup`      | Радиокнопки         | `<Form.Field.RadioGroup name="gender" />`                        |
| `Form.Field.RadioCard`       | Card selection      | `<Form.Field.RadioCard name="plan" />`                           |
| `Form.Field.SegmentedGroup`  | Segmented control   | `<Form.Field.SegmentedGroup name="view" />`                      |

## Множественный выбор

| Компонент                 | Описание      | Пример                                        |
| ------------------------- | ------------- | --------------------------------------------- |
| `Form.Field.Checkbox`     | Чекбокс       | `<Form.Field.Checkbox name="agree" />`        |
| `Form.Field.CheckboxCard` | Card multi    | `<Form.Field.CheckboxCard name="features" />` |
| `Form.Field.Switch`       | Переключатель | `<Form.Field.Switch name="isActive" />`       |
| `Form.Field.Tags`         | Ввод тегов    | `<Form.Field.Tags name="tags" />`             |

## Специализированные

| Компонент                | Описание            | Пример                                                              |
| ------------------------ | ------------------- | ------------------------------------------------------------------- |
| `Form.Field.Auto`        | Автотип из схемы    | `<Form.Field.Auto name="field" />`                                  |
| `Form.Field.PinInput`    | PIN/OTP код         | `<Form.Field.PinInput name="pin" />`                                |
| `Form.Field.OTPInput`    | OTP с таймером      | `<Form.Field.OTPInput name="otp" />`                                |
| `Form.Field.ColorPicker` | Выбор цвета         | `<Form.Field.ColorPicker name="color" />`                           |
| `Form.Field.FileUpload`  | Загрузка файлов     | `<Form.Field.FileUpload name="avatar" />`                           |
| `Form.Field.Phone`       | Телефон с маской    | `<Form.Field.Phone name="phone" />`                                 |
| `Form.Field.MaskedInput` | Универсальная маска | `<Form.Field.MaskedInput name="card" mask="____ ____ ____ ____" />` |
| `Form.Field.Address`     | Адрес (DaData)      | `<Form.Field.Address name="address" />`                             |

## RichText с изображениями

```tsx
<Form.Field.RichText
  name="content"
  label="Контент"
  imageUpload={{
    endpoint: '/api/upload',
    category: 'CONTENT',
    maxSize: 10 * 1024 * 1024,
  }}
  toolbarButtons={['bold', 'italic', 'link', 'image']}
/>
```

## fieldType в meta

Указывай через @form.fieldType в schema.zmodel или через .meta():

```typescript
z.string().meta({ ui: { fieldType: 'richText' } })
z.number().meta({ ui: { fieldType: 'rating' } })
z.boolean().meta({ ui: { fieldType: 'switch' } })
```

| Категория   | Типы                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Текстовые   | `string`, `textarea`, `password`, `passwordStrength`, `editable`, `richText`                                                         |
| Числовые    | `number`, `numberInput`, `slider`, `rating`, `currency`, `percentage`                                                                |
| Дата/время  | `date`, `time`, `dateRange`, `dateTimePicker`, `duration`, `schedule`                                                                |
| Булевые     | `checkbox`, `switch`                                                                                                                 |
| Выбор       | `select`, `nativeSelect`, `combobox`, `autocomplete`, `listbox`, `radioGroup`, `radioCard`, `segmentedGroup`, `checkboxCard`, `tags` |
| Специальные | `phone`, `address`, `pinInput`, `otpInput`, `colorPicker`, `fileUpload`, `maskedInput`                                               |
