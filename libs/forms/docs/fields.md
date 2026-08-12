# Field компоненты

57 типов полей для декларативных форм.

## Текстовые поля

| Компонент                     | Описание                   |
| ----------------------------- | -------------------------- |
| `Form.Field.String`           | Текстовое поле             |
| `Form.Field.Textarea`         | Многострочный текст        |
| `Form.Field.Password`         | Пароль с toggle visibility |
| `Form.Field.PasswordStrength` | Пароль с индикатором силы  |
| `Form.Field.Editable`         | Inline редактирование      |
| `Form.Field.RichText`         | WYSIWYG редактор (Tiptap)  |

## Числовые поля

| Компонент                | Описание                        |
| ------------------------ | ------------------------------- |
| `Form.Field.Number`      | Простое числовое поле           |
| `Form.Field.NumberInput` | Числовое поле со стрелками      |
| `Form.Field.Slider`      | Ползунок для диапазонов         |
| `Form.Field.Rating`      | Рейтинг звёздами                |
| `Form.Field.Currency`    | Денежное поле с форматированием |
| `Form.Field.Percentage`  | Процентное поле                 |

## Дата и время

| Компонент                   | Описание                       |
| --------------------------- | ------------------------------ |
| `Form.Field.Date`           | Поле даты                      |
| `Form.Field.Time`           | Поле времени                   |
| `Form.Field.DateRange`      | Диапазон дат с пресетами       |
| `Form.Field.DateTimePicker` | Дата и время вместе            |
| `Form.Field.Duration`       | Длительность (HH:MM)           |
| `Form.Field.Schedule`       | Редактор недельного расписания |

## Выбор из списка

| Компонент                    | Описание                                     |
| ---------------------------- | -------------------------------------------- |
| `Form.Field.Select`          | Стилизованный Select                         |
| `Form.Field.NativeSelect`    | Нативный браузерный Select                   |
| `Form.Field.CascadingSelect` | Каскадный select (страна → город)            |
| `Form.Field.Combobox`        | Searchable select с группами                 |
| `Form.Field.Autocomplete`    | Текстовое поле с подсказками                 |
| `Form.Field.Listbox`         | Listbox single/multi selection               |
| `Form.Field.RadioGroup`      | Группа радиокнопок                           |
| `Form.Field.RadioCard`       | Card-based radio selection                   |
| `Form.Field.SegmentedGroup`  | Segmented control                            |
| `Form.Field.ImageChoice`     | Визуальный выбор из карточек с изображениями |

## Множественный выбор

| Компонент                 | Описание                   |
| ------------------------- | -------------------------- |
| `Form.Field.Checkbox`     | Чекбокс                    |
| `Form.Field.CheckboxCard` | Card-based multi selection |
| `Form.Field.Switch`       | Переключатель              |
| `Form.Field.Tags`         | Ввод тегов                 |
| `Form.Field.YesNo`        | Бинарный выбор Да/Нет      |

## Специализированные

| Компонент                | Описание                               |
| ------------------------ | -------------------------------------- |
| `Form.Field.Auto`        | Автоопределение типа из Zod схемы      |
| `Form.Field.PinInput`    | Ввод PIN/OTP кода                      |
| `Form.Field.OTPInput`    | OTP код с таймером resend              |
| `Form.Field.ColorPicker` | Выбор цвета                            |
| `Form.Field.FileUpload`  | Загрузка файлов                        |
| `Form.Field.Phone`       | Телефон с маской                       |
| `Form.Field.MaskedInput` | Универсальная маска                    |
| `Form.Field.Address`     | Адрес с автодополнением (DaData)       |
| `Form.Field.City`        | Город с автодополнением (DaData)       |
| `Form.Field.Signature`   | Цифровая подпись (canvas draw + typed) |
| `Form.Field.CreditCard`  | Данные банковской карты                |

## Опросные поля

| Компонент                 | Описание                                            |
| ------------------------- | --------------------------------------------------- |
| `Form.Field.Likert`       | Шкала Лайкерта (согласие, 5-7 пунктов)              |
| `Form.Field.MatrixChoice` | Матричный выбор для опросов (radio/checkbox/rating) |

## Табличные поля

| Компонент                | Описание                                              |
| ------------------------ | ----------------------------------------------------- |
| `Form.Field.TableEditor` | Инлайн-редактируемая таблица с Excel-paste            |
| `Form.Field.DataGrid`    | Большая таблица с TanStack Table (пагинация, фильтры) |

## Документные поля (Россия)

| Компонент                        | Описание                                                   | Маска            |
| -------------------------------- | ---------------------------------------------------------- | ---------------- |
| `Form.Document.INN`              | ИНН (10 или 12 цифр с контрольной суммой)                  | `999999999999`   |
| `Form.Document.BIK`              | БИК (9 цифр, начинается с "04")                            | `999999999`      |
| `Form.Document.OGRN`             | ОГРН (13 цифр с контрольной суммой)                        | `9999999999999`  |
| `Form.Document.SNILS`            | СНИЛС (11 цифр, формат XXX-XXX-XXX YY)                     | `999-999-999 99` |
| `Form.Document.KPP`              | КПП (9 символов)                                           | `*********`      |
| `Form.Document.Passport`         | Паспорт РФ (серия + номер)                                 | `99 99 999999`   |
| `Form.Document.BankAccount`      | Расчётный счёт (20 цифр)                                   | 20 цифр          |
| `Form.Document.CorrAccount`      | Корр. счёт (20 цифр, начинается с "301")                   | 20 цифр          |
| `Form.Document.ForeignPassport`  | Загранпаспорт (серия 2 + номер 7)                          | `99 9999999`     |
| `Form.Document.DepartmentCode`   | Код подразделения (6 цифр)                                 | `999-999`        |
| `Form.Document.BirthCertificate` | Свидетельство о рождении (без маски, нормализация на blur) | —                |

## Утилитарные поля

| Компонент               | Описание                                          |
| ----------------------- | ------------------------------------------------- |
| `Form.Field.Hidden`     | Скрытое поле (UTM, referral, ID)                  |
| `Form.Field.Calculated` | Вычисляемое поле с автопересчётом из зависимостей |

---

## Form.Field.RichText — WYSIWYG редактор (v0.51.0+)

WYSIWYG редактор на базе Tiptap с опциональной загрузкой изображений:

```tsx
// Базовое использование (без изображений)
<Form.Field.RichText name="content" label="Контент" />

// С загрузкой изображений
<Form.Field.RichText
  name="content"
  label="Контент"
  imageUpload={{
    endpoint: '/api/upload',      // URL endpoint для загрузки
    category: 'CONTENT',          // Категория изображения (опционально)
    maxSize: 10 * 1024 * 1024,    // Максимум 10MB (по умолчанию)
  }}
  toolbarButtons={['bold', 'italic', 'link', 'image']}
/>
```

**Props:**

| Prop             | Тип                 | Default         | Описание                          |
| ---------------- | ------------------- | --------------- | --------------------------------- |
| `minHeight`      | `string \| number`  | `'150px'`       | Минимальная высота редактора      |
| `maxHeight`      | `string \| number`  | -               | Максимальная высота (со скроллом) |
| `showToolbar`    | `boolean`           | `true`          | Показывать панель инструментов    |
| `toolbarButtons` | `ToolbarButton[]`   | все кроме image | Кнопки в панели                   |
| `outputFormat`   | `'html' \| 'json'`  | `'html'`        | Формат вывода                     |
| `imageUpload`    | `ImageUploadConfig` | -               | Конфигурация загрузки изображений |

**ImageUploadConfig:**

```typescript
interface ImageUploadConfig {
  endpoint: string // URL endpoint для загрузки (обязателен)
  category?: string // Категория изображения
  maxSize?: number // Максимальный размер в байтах (по умолчанию 10MB)
  acceptTypes?: string[] // Разрешённые типы (по умолчанию ['image/*'])
}
```

**Доступные кнопки тулбара:**

`bold`, `italic`, `underline`, `strike`, `code`, `heading1`, `heading2`, `heading3`, `bulletList`, `orderedList`, `blockquote`, `link`, `image`, `undo`, `redo`

---

## Form.Field.Auto — Автоопределение типа (v0.43.0+)

Автоматически выбирает компонент поля на основе типа в Zod схеме:

```tsx
const Schema = z.object({
  firstName: z.string(),      // → FieldString
  age: z.number(),            // → FieldNumber
  isActive: z.boolean(),      // → FieldCheckbox
  role: z.enum(['user', 'admin']), // → FieldNativeSelect
  createdAt: z.date(),        // → FieldDate
})

<Form schema={Schema} initialValue={data} onSubmit={save}>
  <Form.Field.Auto name="firstName" />
  <Form.Field.Auto name="age" />
  <Form.Field.Auto name="isActive" />
  <Form.Field.Auto name="role" />
  <Form.Field.Auto name="createdAt" />
</Form>
```

**Маппинг типов:**

| Zod тип                  | Компонент         |
| ------------------------ | ----------------- |
| `z.string()`             | FieldString       |
| `z.number()` / `z.int()` | FieldNumber       |
| `z.boolean()`            | FieldCheckbox     |
| `z.date()`               | FieldDate         |
| `z.enum([...])`          | FieldNativeSelect |

**Auto-label:** Если label не указан, генерируется из имени поля: `"firstName"` → `"First Name"`.

---

## Form.Field.CascadingSelect — Каскадный выбор (v0.42.0+)

Загружает опции динамически на основе значения другого поля:

```tsx
<Form.Field.Select
  name="country"
  label="Страна"
  options={countries}
/>

<Form.Field.CascadingSelect
  name="city"
  label="Город"
  dependsOn="country"
  loadOptions={async (countryCode) => {
    if (!countryCode) return []
    const cities = await fetchCities(countryCode)
    return cities.map(c => ({ label: c.name, value: c.id }))
  }}
  placeholderWhenDisabled="Сначала выберите страну"
  clearOnParentChange
  disableWhenParentEmpty
/>
```

**Props:**

- `dependsOn` — имя родительского поля
- `loadOptions` — функция загрузки опций
- `clearOnParentChange` — очищать значение при изменении родителя (по умолчанию `true`)
- `disableWhenParentEmpty` — блокировать при пустом родителе (по умолчанию `true`)
- `placeholderWhenDisabled` — placeholder для заблокированного состояния
- `initialOptions` — начальные опции до загрузки

---

## RadioCard с keyboard navigation (v0.32.0+)

```tsx
<Form.Field.RadioCard
  name="role"
  keyboardNavigation // Включить стрелки с cycling
  options={[
    { value: 'student', label: 'Ученик' },
    { value: 'instructor', label: 'Инструктор' },
  ]}
/>
```

При включённом `keyboardNavigation` стрелки влево/вправо циклически переключают опции.

---

## Form.Field.ImageChoice — Визуальный выбор (v0.72.0+)

Выбор из карточек с изображениями (стили, продукты, категории):

```tsx
<Form.Field.ImageChoice
  name="style"
  options={[
    { value: 'modern', label: 'Modern', image: '/modern.jpg' },
    { value: 'classic', label: 'Classic', image: '/classic.jpg', description: 'Timeless design' },
  ]}
  columns={3}
  multiple={false}
/>
```

**Props:** `options` (обязательно), `columns` (default: 3), `multiple` (default: false).
**Значение:** `string` (single) или `string[]` (multiple).

---

## Form.Field.YesNo — Бинарный выбор (v0.72.0+)

Две большие кнопки для ответа Да/Нет:

```tsx
<Form.Field.YesNo
  name="consent"
  label="Согласны с условиями?"
  yesLabel="Согласен"
  noLabel="Отказываюсь"
  variant="emoji" // 'buttons' | 'thumbs' | 'emoji'
/>
```

**Значение:** `boolean`.

---

## Form.Field.Likert — Шкала Лайкерта (v0.72.0+)

Шкала согласия с текстовыми якорями:

```tsx
<Form.Field.Likert
  name="satisfaction"
  label="Оцените удовлетворённость"
  anchors={['Полностью не согласен', 'Не согласен', 'Нейтрально', 'Согласен', 'Полностью согласен']}
  showNumbers={true}
/>
```

**Значение:** `number` (1-based index).

---

## Form.Field.MatrixChoice — Матричный выбор (v0.73.0+)

Таблица вопросов × ответов (как в Google Forms):

```tsx
<Form.Field.MatrixChoice
  name="feedback"
  rows={[
    { value: 'speed', label: 'Скорость доставки' },
    { value: 'quality', label: 'Качество товара' },
  ]}
  columns={[
    { value: '1', label: 'Плохо' },
    { value: '3', label: 'Нормально' },
    { value: '5', label: 'Отлично' },
  ]}
  variant="radio" // 'radio' | 'checkbox' | 'rating'
/>
```

**Значение:** `Record<string, string | string[]>`.

---

## Form.Field.TableEditor — Табличный редактор (v0.68.0+)

Инлайн-редактируемая таблица для массивов:

```tsx
<Form.Field.TableEditor
  name="items"
  columns={[
    { name: 'product', width: '40%' },
    { name: 'qty', width: '15%', align: 'right' },
    { name: 'price', width: '15%', align: 'right' },
    { name: 'total', computed: (row) => row.qty * row.price, label: 'Итого' },
  ]}
  sortable={true}
  footer={[{ column: 'total', aggregate: 'sum', label: 'Итого:' }]}
  addLabel="Добавить товар"
/>
```

**Возможности:** клик по ячейке → inline editing, Tab/Enter навигация, copy-paste из Excel (TSV), drag & drop сортировка, computed columns, footer aggregates (sum/avg/count/min/max), массовое удаление через чекбоксы.

---

## Form.Field.DataGrid — TanStack Table (v0.75.0+)

Большие таблицы с пагинацией, сортировкой, фильтрами:

```tsx
<Form.Field.DataGrid
  name="employees"
  columns={[
    { name: 'name', editable: true, filter: 'text' },
    { name: 'salary', editable: true, filter: 'range', align: 'right' },
    { name: 'department', editable: true, filter: 'select' },
  ]}
  pageSize={20}
  rowSelection
  virtualized={false}
/>
```

**Возможности:** пагинация или виртуализация (1000+ строк), inline filters (text/range/select/date), клик-для-редактирования, CSV export, column resize, diff highlighting.

---

## Form.Document.\* — Документные поля (v0.76.0+)

Российские документы с масками и валидацией контрольных сумм. Импорт:

```typescript
import { zRu } from '@letar/forms/validators/ru'
```

```tsx
<Form.Document.INN name="inn" label="ИНН" />
<Form.Document.BIK name="bik" label="БИК" />
<Form.Document.OGRN name="ogrn" label="ОГРН" />
<Form.Document.SNILS name="snils" label="СНИЛС" />
<Form.Document.KPP name="kpp" label="КПП" />
<Form.Document.Passport name="passport" label="Паспорт" />
<Form.Document.BankAccount name="account" label="Расчётный счёт" />
<Form.Document.CorrAccount name="corrAccount" label="Корр. счёт" />
<Form.Document.ForeignPassport name="foreignPassport" label="Загранпаспорт" />
<Form.Document.DepartmentCode name="departmentCode" label="Код подразделения" />
<Form.Document.BirthCertificate name="birthCertificate" label="Свидетельство о рождении" />
```

Каждое поле автоматически добавляет маску ввода (кроме `BirthCertificate` — переменная длина
римской части серии делает структурную маску вредной, MASK_ENGINE.md §5.3/§7.1; нормализация
гомоглифов и разделителей происходит на потере фокуса), иконку и проверку формата.

**Zod-валидаторы** (12 штук) доступны через `zRu`:

- `zRu.inn()`, `zRu.bik()`, `zRu.ogrn()`, `zRu.snils()`, `zRu.kpp()`
- `zRu.passport()`, `zRu.bankAccount()`, `zRu.corrAccount()`, `zRu.ogrnip()`
- `zRu.foreignPassport()`, `zRu.departmentCode()`, `zRu.birthCertificate()`

---

## Form.Field.Hidden — Скрытое поле (v0.74.0+)

Невидимое поле, участвующее в form state:

```tsx
<Form.Field.Hidden name="utm_source" value={searchParams.get('utm_source')} />
<Form.Field.Hidden name="referralCode" value="ABC123" />
```

Не рендерит DOM-элементы. Синхронизирует prop `value` с form state.

---

## Form.Field.Calculated — Вычисляемое поле (v0.70.0+)

Автопересчёт из зависимых полей:

```tsx
<Form.Field.Calculated
  name="total"
  compute={(values) => values.price * values.qty}
  format={(v) => `${v.toLocaleString()} ₽`}
  deps={['price', 'qty']}
/>
```

**Props:** `compute` (обязательно), `deps` (зависимости), `format` (форматирование), `hidden` (без рендера).

---

## Связанные документы

- [README.md](../README.md) — обзор библиотеки
- [form-level.md](./form-level.md) — Form-level компоненты
- [analytics.md](./analytics.md) — Аналитика форм

---

**Последнее обновление:** 2026-04-04
