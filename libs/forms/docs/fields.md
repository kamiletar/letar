# Field компоненты

58 типов полей для декларативных форм.

## Текстовые поля

| Компонент                     | Описание                                          |
| ----------------------------- | ------------------------------------------------- |
| `Form.Field.String`           | Текстовое поле                                    |
| `Form.Field.Textarea`         | Многострочный текст                               |
| `Form.Field.Password`         | Пароль с toggle visibility                        |
| `Form.Field.PasswordStrength` | Пароль с индикатором силы                         |
| `Form.Field.Editable`         | Inline редактирование                             |
| `Form.Field.RichText`         | WYSIWYG редактор (Tiptap)                         |
| `Form.Field.Slug`             | URL-слаг, зеркалит соседнее поле до ручной правки |

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

### Async-поиск в `Form.Field.Combobox`

`useQuery`-проп ждёт хук вида `(search: string) => { data?, isLoading?, error? }`, вызываемый на
каждый ре-рендер (debounce и `minChars` уже внутри `useAsyncSearch`, менять их не нужно).

- **Источник уже отдаёт данные синхронно** (ZenStack `useFindManyX` и подобные) — подключай
  напрямую: `useQuery={(search) => useFindManyUser({ where: { name: { contains: search } } })}`.
- **Источник — плоская async-функция** (server action, `@fuzzy`/`@fullText` full-text search) —
  оборачивай через `createAsyncActionQuery`, не пиши свой `useState`/`useEffect`/cancel-flag:
  ```tsx
  import { createAsyncActionQuery } from '@letar/forms'

  <Form.Field.Combobox name="materialId" useQuery={createAsyncActionQuery(searchMaterialsAction)} />
  ```
  Гонка устаревших ответов при быстром наборе текста обрабатывается внутри хука.

### Свой рендер опций: `renderOption`, `renderValue`, `textValue`, `data` (v2.19.0+)

Опция несёт типизированные данные приложения (`data`), а рисовать её можно любым узлом. Chakra-скин
(`@letar/forms`) и shadcn-скин (`@letar/forms-shadcn`), `Form.Field.Select` и `Form.Field.Combobox`.

| Проп / поле опции | Где              | Описание                                                                                                    |
| ----------------- | ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `data`            | опция            | Данные приложения. `TData` выводится из `options` и попадает в render-функции                               |
| `textValue`       | опция            | Строковая форма: поиск, typeahead, подпись в триггере. Нужна, если `label` — не строка                      |
| `renderOption`    | Select, Combobox | `(option, { selected, disabled }) => ReactNode` — содержимое пункта; рамку (подсветка, галочка) рисует скин |
| `renderValue`     | только Select    | `(option) => ReactNode` — подпись выбранного в триггере; `null`/`''` — откат к тексту опции                 |
| `getTextValue`    | только Combobox  | `(item) => string` — строковая форма элемента `useQuery`; у `renderOption` `option.data` — сам элемент      |

```tsx
<Form.Field.Select
  name="cityId"
  options={cities.map((c) => ({ value: c.id, label: c.name, data: c }))}
  renderOption={(o) => (
    <span>
      {o.label} <small>{o.data?.region}</small>
    </span>
  )}
  renderValue={(o) => <b>{o.data?.name}</b>}
/>
```

- Нестроковый `label` больше **не сплющивается в строку**: пункт рисует узел как есть. Без
  `textValue` поиск, typeahead и подпись в триггере идут по `value` — в dev-режиме поле один раз
  предупредит в консоли.
- `renderValue` рисуется внутри `<button>` (триггер): только фразовое содержимое, без кнопок и ссылок.
  Пока ничего не выбрано, виден `placeholder`.
- Служебный пункт «+ Добавить…» через `renderOption` не проходит; `onCreate` может вернуть `data`.
- У Combobox `renderValue` нет: в инпуте — обычный текст (`textValue`/`getTextValue`/строковый `label`).
- Подсветку (`highlighted`) в `state` не передаём — оба скина ставят `[data-highlighted]`, стилизуйте CSS.
- ⚠️ **Изменение поведения:** пункты с `label`-узлом раньше показывали `value`, теперь — узел.

### Правка записи из поля: `onUpdate`, `Select.EditButton`, `Select.CreateButton` (v2.20.0+)

Карандаш у каждого пункта списка и у выбранного значения: приложение открывает своё окно правки
(server action — на его стороне) и возвращает сохранённую запись. Chakra-скин и shadcn-скин,
`Form.Field.Select` и `Form.Field.Combobox`.

| Проп / поле                                      | Где              | Описание                                                                                                         |
| ------------------------------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| `onUpdate`                                       | Select, Combobox | `(option) => Promise<{ label, value, data? } \| null>`; `null` — пользователь отказался                          |
| `editable: false`                                | опция            | Прячет карандаш у системной записи. У Combobox с `useQuery` — `getEditable={(item) => boolean}`                  |
| `createItem={false}`                             | Select, Combobox | Убирает служебный пункт «+ Добавить…» — кнопку ставят сами (`listFooter`, `renderOption`, `renderEmpty`)         |
| `listFooter`                                     | Select, Combobox | Свой низ списка после пунктов; в Chakra «прилипает» к нижнему краю                                               |
| `renderEmpty`                                    | только Combobox  | `({ search }) => ReactNode` — содержимое состояния «ничего не найдено»; с `onCreate` пункт создания идёт под ним |
| `Form.Field.Select.EditButton` / `.CreateButton` | Select           | Кнопки для своего `renderOption`/`listFooter`. Те же слоты — `Form.Field.Combobox.*`; принимают `asChild`        |

```tsx
<Form.Field.Select
  name="workTypeId"
  options={workTypes.map((w) => ({ value: w.id, label: w.name, data: w, editable: !w.system }))}
  onUpdate={async (option) => {
    const saved = await openWorkTypeDialog(option.data) // окно приложения + его server action
    return saved ? { label: saved.name, value: saved.id, data: saved } : null
  }}
/>
```

- **Тот же `value`** — правка подписи: подпись обновляется сразу, форма **не** становится dirty.
  **Другой `value`** — запись заменена (copy-on-write): выбранное значение переезжает на новое.
- Правка лежит поверх `options` приложения, пока оно не перезапросит список (пришла свежая подпись —
  наложение снимается). Пока `options = []` (идёт загрузка), наложение не сбрасывается.
- Список закрывается до окна приложения; из пункта фокус возвращается на триггер. Пока действие идёт,
  карандаши `disabled`, повторные запуски игнорируются. `reject` не глотается (unhandled rejection → GlitchTip).
- **F2** (на ноутбуках — Fn+F2) на подсвеченном пункте или на выбранном значении правит запись. В shadcn
  у Combobox клавиатурной навигации по списку нет — там F2 не работает, карандаш только мышью.
- Карандаш в пункте — вне Tab-порядка и скрыт от скринридеров (иначе Enter выберет пункт, а фокус прыгнет на
  кнопку); у значения — обычная кнопка в Tab-порядке, соседом триггера (в `<button>` вложенная кнопка невалидна).
  На устройствах без hover карандаш виден всегда.
- ⚠️ **Свой `renderOption` — свои кнопки:** карандаш по умолчанию рисуется только когда `renderOption` не задан.
  Внутри своего рендера поставь `<Form.Field.Select.EditButton />`. Внутри `renderValue` слоты не рисуются
  (там `<button>`) — dev-предупреждение.
- ⚠️ `EditButton`/`CreateButton` вне поля, без `onUpdate`/`onCreate` — рисуют `null` и один раз пишут в консоль в dev.
- ⚠️ Окно приложения не должно содержать вложенный `<form>` внутри формы поля — нативный `<form>` в `<form>`
  невалиден; окно живёт в портале приложения.
- Обёртки из `createForm()` (`extraSelects`/`extraComboboxes`) должны пробрасывать `onUpdate`/`createItem`/`listFooter`.
- У Combobox с `useQuery` карандаш у значения виден, пока выбранный элемент есть в загруженной странице.

### `onCreate` — создать запись справочника, не уходя из формы (v2.17.0+)

Проп `onCreate` есть у `Form.Field.Select` и `Form.Field.Combobox` (Chakra-скин и shadcn-скин).
Обёртки из `createForm()` (`extraSelects`/`extraComboboxes`) должны пробрасывать его дальше.

| Проп          | Тип                                                     | Описание                                                                          |
| ------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `onCreate`    | `(search: string) => Promise<{ label; value } \| null>` | Приложение открывает своё окно создания и возвращает новую опцию или `null`       |
| `createLabel` | `string`                                                | Глагол пункта создания («Добавить» по умолчанию, локализуется `FormI18nProvider`) |

- **Select** — в конец списка добавляется пункт «+ Добавить…»; `onCreate` вызывается с `''`.
- **Combobox** — пока поисковый текст непустой и точного совпадения с подписью нет, список
  заканчивается пунктом «+ Добавить "<текст>"»; `onCreate` получает этот текст. Работает и со
  статичными `options`, и с `useQuery`.
- Вернули `{ label, value }` — опция добавляется в список и выбирается. Вернули `null` — значение
  не меняется (Combobox сохраняет текст поиска).
- Служебный пункт в данные формы не попадает. Повторный выбор, пока `onCreate` не завершился,
  игнорируется. Ошибка `onCreate` не глотается — всплывает как unhandled rejection.
- Созданная опция живёт, пока поле смонтировано. Когда `options` приложения уже содержат то же
  значение (справочник перезагрузили), побеждает опция приложения — дубля нет.

```tsx
<Form.Field.Combobox
  name="categoryId"
  options={categories}
  onCreate={async (name) => {
    const created = await openCategoryDialog({ name })
    return created ? { label: created.name, value: created.id } : null
  }}
/>
```

Скины Vue, Vue-shadcn и Angular пока без `onCreate`.

**Своя обёртка над Select/Combobox должна пробрасывать `onCreate` (и `createLabel`).** Обёртка,
которая собирает `options` сама (`useQuery`, async-Combobox) и принимает узкий набор пропсов,
молча теряет `onCreate` — поле рендерится без пункта «+ Добавить…», ошибки нет. Пробрасывайте
остаток пропсов и не перезаписывайте `options`, полученные из запроса:

```tsx
function CategoryCombobox({ name, ...rest }: CategoryComboboxProps) {
  const { data = [] } = useQuery(categoriesQuery)
  const options = data.map((c) => ({ label: c.name, value: c.id }))
  // ...rest содержит onCreate/createLabel; после создания приложение инвалидирует запрос,
  // и в списке остаётся одна запись — опция приложения побеждает созданную локально
  return <Form.Field.Combobox name={name} options={options} {...rest} />
}
```

Для фабрики async-Combobox (`createActionCombobox` и подобные) правило то же: пропсы поля,
которых фабрика не знает, идут в поле без изменений.

## Множественный выбор

| Компонент                 | Описание                   |
| ------------------------- | -------------------------- |
| `Form.Field.Checkbox`     | Чекбокс                    |
| `Form.Field.CheckboxCard` | Card-based multi selection |
| `Form.Field.Switch`       | Переключатель              |
| `Form.Field.Tags`         | Ввод тегов                 |
| `Form.Field.YesNo`        | Бинарный выбор Да/Нет      |

## Специализированные

| Компонент                | Описание                                                     |
| ------------------------ | ------------------------------------------------------------ |
| `Form.Field.Auto`        | Автоопределение типа из Zod схемы                            |
| `Form.Field.PinInput`    | Ввод PIN/OTP кода                                            |
| `Form.Field.OTPInput`    | OTP код с таймером resend                                    |
| `Form.Field.ColorPicker` | Выбор цвета                                                  |
| `Form.Field.FileUpload`  | Загрузка файлов                                              |
| `Form.Field.Phone`       | Телефон с маской                                             |
| `Form.Field.MaskedInput` | Универсальная маска                                          |
| `Form.Field.Address`     | Адрес с автодополнением (DaData)                             |
| `Form.Field.City`        | Город с автодополнением (DaData)                             |
| `Form.Field.Signature`   | Цифровая подпись (canvas draw + typed)                       |
| `Form.Field.CreditCard`  | Данные банковской карты                                      |
| `Form.Field.EditIntent`  | Замена значения без передачи старого (API key/Client Secret) |

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

## Form.Field.Select — группировка опций (v2.14.7+)

`getGroup` группирует статичные `options` по ключу — симметрично `getGroup` у
`Form.Field.Combobox`, но без async-обёртки:

```tsx
<Form.Field.Select
  name="category"
  options={categories}
  getGroup={(opt) => opt.parentLabel}
/>
```

Опции без группы (или без `getGroup` вовсе) рендерятся плоским списком — поведение по умолчанию
не меняется. Реализовано на уровне `UIKit`-контракта (`@letar/forms-core/uikit`), доступно
только Chakra-скину (`@letar/forms`).

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

## Form.Field.EditIntent — Замена значения без передачи старого (v2.8.0+)

Для секретов, которые сервер не может (или не должен) вернуть клиенту повторно — API-ключ,
Client Secret и т.п. View mode показывает только безопасный `displayValue` (маска вида
`************P9x4`) и кнопку «Заменить». Клик атомарно переводит поле в edit mode и монтирует
дочернее поле; «Отмена» атомарно возвращает view mode, дочерний ввод размонтируется вместе со
своим значением.

```tsx
const ApiKeyEditSchema = z.object({
  apiKey: editIntentValueSchema(z.string().min(20)),
}).strip()

<Form.Field.EditIntent name="apiKey" displayValue="************P9x4" emptyValue="">
  <Form.Field.Password name="apiKey.value" autoComplete="new-password" />
</Form.Field.EditIntent>
```

Значение в форме — `EditIntentValue<T>` из `@letar/forms-core/edit-intent`:
`{ isEdited: false; value: null } | { isEdited: true; value: T }`. `isEdited` — пользовательский
intent, а не производная от `isDirty`: старый secret намеренно неизвестен клиенту, сравнивать
значения не с чем. Server action обновляет значение только при `isEdited: true`.

**Props:** `displayValue` (обязательно), `emptyValue` (обязательно — старт дочернего поля),
`editLabel` (по умолчанию «Заменить»), `cancelLabel` (по умолчанию «Оставить текущее»),
`sensitive` (по умолчанию `true` — потребитель обязан вручную исключить `${name}.value` из
`useFormPersistence({ excludeFields })`/`Form.UrlSync`/аналитики, общего автоматического
redaction-слоя на всю форму пока нет), `children` (обязательно — дочернее поле для edit mode).

**FromSchema/AutoFields:** через meta `fieldType: 'editIntent'` с обязательным
`fieldProps.innerField` (`'Password'` | `'String'`) и `fieldProps.displayValue` — без обоих полей
рендерится предупреждение в dev-консоли и `Form.Field.String`-фоллбек, автоугадывание типа
намеренно не поддерживается (составное значение секрета не должно определяться эвристикой).

---

## Form.Field.Slug — URL-слаг из соседнего поля (v2.12.0+)

Текстовое поле-«зеркало»: пока пользователь не отредактировал его руками, значение — это
`slugify(values[source])`, пересчитываемый на каждое изменение поля-источника (обычно
«Название»). Первая же ручная правка самого слага выключает зеркалирование навсегда для этой
формы — иначе правку затирало бы следующей буквой в названии. Кнопка «↺» рядом с полем
(появляется, когда зеркалирование выключено) включает его обратно и сразу пересчитывает значение.

```tsx
<Form.Field.String name="name" label="Название" />
<Form.Field.Slug name="slug" source="name" label="URL" />
```

**На форме редактирования** (слаг уже непустой при монтировании — у записи опубликованный адрес)
зеркалирование по умолчанию **выключено**: молча менять уже используемый внешними ссылками URL
при правке названия нельзя. Включить — `syncOnEdit`:

```tsx
<Form.Field.Slug name="slug" source="name" label="URL" syncOnEdit={!isPublished} />
```

**Props:** `source` (обязательно — имя соседнего поля в той же группе), `syncOnEdit` (по
умолчанию `false`), `slugify` (кастомная функция, по умолчанию `slugify()` из
`@letar/format-utils`, транслитерация кириллицы по ГОСТ 7.79-2000), `maxLength`, `autoComplete`.

---

## Связанные документы

- [README.md](../README.md) — обзор библиотеки
- [form-level.md](./form-level.md) — Form-level компоненты
- [analytics.md](./analytics.md) — Аналитика форм

---

**Последнее обновление:** 2026-04-04
