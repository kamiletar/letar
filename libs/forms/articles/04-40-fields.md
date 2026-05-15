# 50+ готовых полей для React-форм: от String до CreditCard

> **Уровень сложности:** Простой

**TL;DR:**

- Библиотека содержит 50+ готовых field-компонентов по категориям: текстовые, числовые, дата/время, выбор, специальные, опросные, табличные, платёжные и документы РФ
- Каждое поле автоматически читает метаданные из Zod `.meta()`, показывает ошибки валидации и извлекает constraints из схемы
- Создать кастомное поле — 20 строк через `useFieldContext()` и регистрацию в `createForm()`

**Кому полезно:**

- Junior: познакомиться с каталогом готовых полей и понять, что не нужно писать свой DatePicker или FileUpload
- Middle: узнать про продвинутые поля (TableEditor, MatrixChoice, CreditCard) и паттерн автоматического выбора компонента по Zod-типу
- Senior: оценить архитектуру расширения через `extraFields` и маппинг Zod type -> компонент

---

> Четвёртая статья из цикла «@letar/forms — от боли к декларативным формам». Подробный обзор всех field-компонентов библиотеки — от базовых текстовых до платёжных форм и опросников.

---

## Зачем 50+ полей?

Когда мы начинали, думали: «хватит 10 — текст, число, чекбокс, селект, дата». Потом пришла задача на форму товара — понадобился `Currency`. Потом PWA для автошколы — нужен `Schedule` для расписания занятий. Потом e-commerce — `Rating`, `ColorPicker`, `FileUpload`. Потом платёжные формы — `CreditCard`, опросники — `MatrixChoice`, `Likert`.

За два года продакшн-использования в 10+ приложениях набралось 50+ компонентов. И каждый из них:

- Читает метаданные из Zod `.meta()`
- Автоматически показывает ошибки валидации
- Извлекает constraints (min, max, minLength) из Zod-схемы
- Работает внутри `<Form.Group>` (вложенные пути)
- Поддерживает `<Form.Group.List>` (массивы)

---

## Каталог по категориям

### Текстовые поля (7)

```tsx
// Обычный текст
<Form.Field.String name="title" />

// Многострочный текст (autoResize из Zod max > 200)
<Form.Field.Textarea name="description" rows={4} />

// Пароль с кнопкой показать/скрыть
<Form.Field.Password name="password" />

// Пароль + индикатор силы (weak/medium/strong)
<Form.Field.PasswordStrength name="password" />

// Маскированный ввод (ИНН, СНИЛС, серия паспорта)
<Form.Field.MaskedInput name="inn" mask="____ ______ __" />

// Inline-редактирование (клик → поле → Enter)
<Form.Field.Editable name="title" showControls />

// WYSIWYG редактор на Tiptap
<Form.Field.RichText name="content" />
```

`String` — самый частый. Но обратите внимание: `Textarea` подключается автоматически, если в Zod `.max()` превышает 200 символов (настраиваемый порог). `PasswordStrength` показывает индикатор прямо под полем, проверяя длину, наличие цифр и спецсимволов.

### Числовые поля (6)

```tsx
// Простое числовое (нативный input type="number")
<Form.Field.Number name="age" />

// Со стрелками вверх/вниз (Chakra NumberInput)
<Form.Field.NumberInput name="quantity" step={1} />

// Ползунок
<Form.Field.Slider name="rating" min={0} max={10} step={0.5} />

// Звёзды (1-5, кликабельные)
<Form.Field.Rating name="score" max={5} />

// Денежное поле (разделители тысяч, символ валюты)
<Form.Field.Currency name="price" currency="RUB" />

// Процентное поле (0-100, суффикс %)
<Form.Field.Percentage name="discount" />
```

`Currency` — не просто `<input type="number">`. Он форматирует «1234567» как «1 234 567 ₽» при потере фокуса и парсит обратно в число при редактировании. `Rating` рендерит кликабельные звёзды с половинками, поддерживает readonly-режим.

### Дата и время (6)

```tsx
// Дата (календарь-попап)
<Form.Field.Date name="birthday" />

// Диапазон дат (два календаря)
<Form.Field.DateRange name="period" />

// Дата + время
<Form.Field.DateTimePicker name="eventStart" />

// Только время (часы:минуты)
<Form.Field.Time name="startTime" />

// Длительность (часы + минуты, как таймер)
<Form.Field.Duration name="lessonLength" />

// Недельное расписание (7 дней × таймслоты)
<Form.Field.Schedule name="workingHours" />
```

`Schedule` — наша гордость. Визуальная сетка 7 дней недели, где можно задать рабочие часы для каждого дня. Используется в driving-school для расписания инструкторов.

### Булевы поля (3)

```tsx
// Чекбокс
<Form.Field.Checkbox name="agree" label="Согласен с условиями" />

// Переключатель (toggle)
<Form.Field.Switch name="isActive" label="Активен" />

// Checkbox-карточки (multi-select карточками)
<Form.Field.CheckboxCard name="features" options={featureOptions} />
```

### Поля выбора (10)

```tsx
// Стилизованный select (Chakra)
<Form.Field.Select name="category" options={categoryOptions} />

// Нативный select (быстрее на мобилках)
<Form.Field.NativeSelect name="country" options={countryOptions} />

// Каскадный select (страна → город → район)
<Form.Field.CascadingSelect name="region" levels={regionLevels} />

// Searchable select (ввод + фильтрация + группы)
<Form.Field.Combobox name="city" options={cityOptions} />

// Автокомплит (подсказки при вводе)
<Form.Field.Autocomplete name="tag" suggestions={tagSuggestions} />

// Listbox (single или multi select с клавиатурной навигацией)
<Form.Field.Listbox name="roles" options={roleOptions} multiple />

// Radio-группа (кнопки в ряд)
<Form.Field.RadioGroup name="size" options={sizeOptions} />

// Radio-карточки (большие кликабельные карточки)
<Form.Field.RadioCard name="plan" options={planOptions} />

// Segmented control (как табы, но для выбора)
<Form.Field.SegmentedGroup name="billing" options={billingOptions} />

// Теги (ввод + Enter = тег, крестик = удаление)
<Form.Field.Tags name="skills" />
```

`Combobox` — один из самых сложных компонентов. Поддерживает группы опций, асинхронную загрузку, кастомный рендер элементов, клавиатурную навигацию, и автоматический fallback на `NativeSelect` если опций меньше 5.

`RadioCard` — отличный UX для выбора тарифа или плана. Каждая опция — карточка с иконкой, заголовком и описанием.

### Специальные поля (7)

```tsx
// Телефон с маской и флагом страны
<Form.Field.Phone name="phone" />

// Адрес с автоподсказками (DaData)
<Form.Field.Address name="address" />

// Город с поиском (DaData)
<Form.Field.City name="city" />

// PIN-код (4-6 отдельных цифр)
<Form.Field.PinInput name="code" length={6} />

// OTP-код (одноразовый, с таймером)
<Form.Field.OTPInput name="otp" length={4} />

// Выбор цвета (палитра + hex input)
<Form.Field.ColorPicker name="brandColor" />

// Загрузка файлов (drag & drop + preview)
<Form.Field.FileUpload name="avatar" accept="image/*" maxSize={5_000_000} />
```

### Опросные поля (4)

```tsx
// Матричный выбор (вопросы × варианты ответов)
<Form.Field.MatrixChoice
  name="satisfaction"
  questions={['Качество', 'Цена', 'Сервис']}
  answers={['Плохо', 'Средне', 'Хорошо', 'Отлично']}
/>

// Выбор по картинкам (сетка с изображениями)
<Form.Field.ImageChoice name="style" options={styleOptions} columns={3} />

// Шкала Лайкерта (5-7 баллов)
<Form.Field.Likert name="agreement" scale={5} labels={['Не согласен', 'Согласен']} />

// Да/Нет (кнопки, палец вверх/вниз или эмодзи)
<Form.Field.YesNo name="recommend" variant="thumbs" />
```

`MatrixChoice` — незаменим для опросов удовлетворённости. Рендерит таблицу с вопросами по строкам и вариантами ответов по столбцам. Поддерживает клавиатурную навигацию (стрелки, Enter/Space).

### Табличные поля (2)

```tsx
// Редактируемая таблица (inline-редактирование, DnD сортировка)
<Form.Field.TableEditor
  name="items"
  columns={[
    { name: 'product', width: '40%' },
    { name: 'qty', width: '15%', align: 'right' },
    { name: 'price', width: '15%', align: 'right' },
    { name: 'total', computed: (row) => row.qty * row.price, label: 'Итого' },
  ]}
  addLabel="Добавить товар"
  footer={[{ column: 'total', aggregate: 'sum', label: 'Итого:' }]}
/>

// Продвинутая таблица данных (сортировка, фильтрация, виртуализация)
<Form.Field.DataGrid
  name="products"
  columns={productColumns}
  enableSorting
  enableFiltering
  enableColumnResizing
  virtualizeRows
/>
```

`TableEditor` — полноценный inline-редактор таблиц с поддержкой computed-колонок, footer-агрегаций (SUM, AVG, COUNT), drag & drop сортировкой строк, и адаптивным мобильным видом (карточки вместо таблицы). Подробнее — в [статье 6: массивы и группы](06-arrays-groups.md).

`DataGrid` — построен на TanStack Table v8. Поддерживает виртуализацию для 1000+ строк, ресайз колонок, diff-подсветку изменённых ячеек.

### Платёжные поля (1)

```tsx
// Кредитная карта (номер + срок + CVC)
<Form.Field.CreditCard name="card" />
```

`CreditCard` — Stripe-style ввод карты в одном компоненте:

- **Автоформатирование** — 4-4-4-4 для Visa/MC, 4-6-5 для Amex
- **Определение бренда** по BIN (Visa, MC, Amex, МИР, JCB, Discover, UnionPay, Maestro)
- **SVG иконки** брендов (инлайновые, без внешних зависимостей)
- **Luhn-валидация** номера карты
- **MM/YY** — автоматический формат срока действия
- **Готовая Zod-схема:** `creditCardSchema()` для серверной валидации

### Защитные поля (3)

```tsx
// 1. Honeypot — невидимая ловушка для ботов
<HoneypotField />

// 2. Rate Limiting — троттлинг повторных сабмитов
const { isBlocked, remaining, secondsLeft } = useRateLimit({
  maxSubmits: 3,
  windowMs: 60_000,
})

// 3. CAPTCHA (Cloudflare Turnstile / Google reCAPTCHA / hCaptcha)
<Form.Captcha />
```

Три уровня защиты, от пассивного к активному:

- **`HoneypotField`** — рендерит скрытое поле, которое пользователь не видит, а бот заполняет. `useHoneypotCheck()` возвращает `isBot()` для блокировки сабмита. Ноль friction для пользователя.
- **`useRateLimit`** — клиентский троттлинг: не больше N сабмитов за период. Возвращает `isBlocked`, `remaining`, `secondsLeft` для отображения таймера. Состояние хранится в sessionStorage.
- **`Captcha`** — провайдер-абстракция для CAPTCHA. Lazy-загрузка скрипта, серверная верификация через `verifyCaptcha()`. Подключается через `createForm({ captcha: { provider: 'turnstile', siteKey: '...' } })`.

### Утилитарные поля (3)

```tsx
// Скрытое поле (не рендерится в DOM, только состояние)
<Form.Field.Hidden name="utm_source" value="landing" />

// Вычисляемое поле (read-only, авто-пересчёт)
<Form.Field.Calculated
  name="total"
  compute={(v) => v.price * v.qty}
  format={(v) => `${v.toLocaleString()} ₽`}
  deps={['price', 'qty']}
/>

// Автоматический выбор компонента по Zod-схеме
<Form.Field.Auto name="anyField" />
```

`Calculated` — автоматически обновляется при изменении зависимых полей. Отображает отформатированное значение, но хранит числовое. `Hidden` — для UTM-меток, referral-кодов, и прочих скрытых данных.

### Сравнение и аудит (1)

```tsx
import { FormComparison } from '@letar/forms'

<FormComparison
  original={{ name: 'Иванов И.И.', email: 'old@test.com', role: 'user' }}
  current={{ name: 'Иванов И.И.', email: 'new@test.com', role: 'admin' }}
  onlyChanged
/>
```

`FormComparison` показывает diff между двумя состояниями данных: изменённые поля подсвечиваются, старое значение перечёркнуто, новое — выделено. Кейсы: модерация изменений профиля, аудит перед сохранением, approval flow. Поддерживает `labels` (ручные или автоматические из Zod `.meta()`), `exclude` для скрытия полей.

### Режим чтения (1)

```tsx
import { FormReadOnlyView } from '@letar/forms'

<FormReadOnlyView
  data={{ name: 'Иванов', email: 'ivan@test.com', role: 'Администратор' }}
  schema={UserSchema}
  compact
/>
```

`FormReadOnlyView` рендерит данные формы в read-only режиме — без инпутов, красиво отформатировано. Та же Zod-схема, что и для формы, но вместо полей — текстовое отображение. Кейсы: квитанция после заказа, карточка клиента, подтверждение перед отправкой. Пропы: `compact` для однострочного формата, `formatters` для кастомного отображения значений, `include`/`exclude` для выбора полей.

### Российские документы (9)

Отдельный namespace `Form.Document.*` для реквизитов и документов РФ:

```tsx
<Form.Document.INN name="inn" />         // ИНН (10/12 цифр, контрольная сумма)
<Form.Document.KPP name="kpp" />         // КПП (9 цифр)
<Form.Document.OGRN name="ogrn" />       // ОГРН (13 цифр, контрольная сумма)
<Form.Document.OGRNIP name="ogrnip" />   // ОГРНИП (15 цифр)
<Form.Document.BIK name="bik" />         // БИК (9 цифр)
<Form.Document.BankAccount name="account" />    // Расчётный счёт (20 цифр)
<Form.Document.CorrAccount name="corr" />       // Корр. счёт (20 цифр)
<Form.Document.SNILS name="snils" />     // СНИЛС (11 цифр, маска ___-___-___ __)
<Form.Document.Passport name="passport" /> // Паспорт (серия + номер)
```

Каждый компонент включает маску ввода, алгоритмическую валидацию контрольных сумм (где применимо) и форматированный вывод.

`Phone` использует `use-mask-input` для форматирования и автоматически определяет страну по первым цифрам. `Address` и `City` работают через подключаемый `AddressProvider` — по умолчанию DaData, но можно подключить любой сервис геокодинга.

`FileUpload` — один из самых функциональных компонентов:

```tsx
// Одиночный файл с превью
<Form.Field.FileUpload name="avatar" accept="image/*" maxSize={5_000_000} />

// Множественная загрузка
<Form.Field.FileUpload name="photos" accept="image/*" multiple maxFiles={10} />

// Документы (без превью)
<Form.Field.FileUpload name="contract" accept=".pdf,.docx" maxSize={10_000_000} />
```

Возможности:

- **Drag & drop** зона с анимацией при перетаскивании
- **Preview** для изображений (thumbnail до загрузки)
- **Прогресс** загрузки для каждого файла
- **Валидация** через Zod: `accept` фильтрует типы, `maxSize` ограничивает размер
- **Удаление** загруженных файлов по крестику
- **Offline-поддержка** — файлы сохраняются в IndexedDB при оффлайн-отправке (подробнее — в [статье 9: offline](09-offline-first.md))

Подробнее — в [документации File Upload](https://forms.letar.best/docs/guides/file-upload).

---

## Как создать кастомное поле

Все 50+ полей построены на одном паттерне. Создать своё — 20 строк:

```tsx
import { useFieldContext } from '@letar/forms'

function FieldColorPalette({ colors = ['#ff0000', '#00ff00', '#0000ff'] }) {
  const { value, handleChange, meta } = useFieldContext<string>()

  return (
    <HStack gap={2}>
      {colors.map((color) => (
        <Box
          key={color}
          w={8}
          h={8}
          bg={color}
          borderRadius="full"
          cursor="pointer"
          border={value === color ? '3px solid black' : '1px solid gray'}
          onClick={() => handleChange(color)}
        />
      ))}
    </HStack>
  )
}
```

`useFieldContext()` даёт:

- `value` — текущее значение поля
- `handleChange(newValue)` — обновить значение
- `handleBlur()` — тригер blur-валидации
- `meta` — UI-метаданные из Zod `.meta()`
- `errors` — ошибки валидации
- `fieldApi` — полный TanStack Form field API

Зарегистрируйте через `createForm`:

```typescript
const AppForm = createForm({
  extraFields: {
    ColorPalette: FieldColorPalette,
  },
})

// Использование
<AppForm.Field.ColorPalette name="themeColor" colors={brandColors} />
```

---

## Автоматический выбор компонента

Когда вы используете `Form.FromSchema` или `Form.AutoFields`, библиотека сама решает, какой компонент рендерить:

```typescript
// Внутренний маппинг Zod type → компонент
z.string()                    → FieldString
z.string().email()            → FieldString (type="email")
z.string().max(500)           → FieldTextarea (порог: 200)
z.number()                    → FieldNumber
z.boolean()                   → FieldCheckbox
z.date()                      → FieldDate
z.enum(['a', 'b', 'c'])      → FieldNativeSelect
z.array(z.string())           → FieldTags

// Переопределение через meta
z.number().meta({ ui: { fieldType: 'slider' } })    → FieldSlider
z.number().meta({ ui: { fieldType: 'currency' } })  → FieldCurrency
z.string().meta({ ui: { fieldType: 'richText' } })  → FieldRichText
```

Приоритет:

1. Явный `fieldType` из `.meta()` — высший
2. Эвристики по Zod-типу и constraints — автоматический
3. Fallback на `FieldString` — всегда работает

---

## Примеры из продакшена

### E-commerce: карточка товара

```tsx
const ProductSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(200)
    .meta({ ui: { title: 'Название' } }),
  description: z
    .string()
    .max(2000)
    .meta({
      ui: { title: 'Описание', fieldType: 'richText' },
    }),
  price: z
    .number()
    .min(0)
    .meta({
      ui: { title: 'Цена', fieldType: 'currency', fieldProps: { currency: 'RUB' } },
    }),
  discount: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .meta({
      ui: { title: 'Скидка', fieldType: 'percentage' },
    }),
  rating: z
    .number()
    .min(0)
    .max(5)
    .meta({
      ui: { title: 'Рейтинг', fieldType: 'rating' },
    }),
  color: z.string().meta({
    ui: { title: 'Цвет', fieldType: 'colorPicker' },
  }),
  images: z.array(z.string()).meta({
    ui: { title: 'Фотографии', fieldType: 'fileUpload', fieldProps: { accept: 'image/*', multiple: true } },
  }),
})
```

### Автошкола: расписание инструктора

```tsx
const InstructorSchema = z.object({
  name: z.string().meta({ ui: { title: 'ФИО инструктора' } }),
  phone: z.string().meta({ ui: { title: 'Телефон', fieldType: 'phone' } }),
  car: z.string().meta({ ui: { title: 'Автомобиль' } }),
  schedule: z.any().meta({
    ui: { title: 'Расписание занятий', fieldType: 'schedule' },
  }),
})
```

### Контактная форма с адресом

```tsx
const ContactSchema = z.object({
  name: z.string().meta({ ui: { title: 'Имя' } }),
  phone: z.string().meta({ ui: { title: 'Телефон', fieldType: 'phone' } }),
  email: z
    .string()
    .email()
    .meta({ ui: { title: 'Email' } }),
  city: z.string().meta({ ui: { title: 'Город', fieldType: 'city' } }),
  address: z.string().meta({ ui: { title: 'Адрес', fieldType: 'address' } }),
  message: z
    .string()
    .max(1000)
    .meta({ ui: { title: 'Сообщение' } }),
})
```

---

## Итоги

| Категория    | Кол-во | Примеры                                                      |
| ------------ | ------ | ------------------------------------------------------------ |
| Текстовые    | 7      | String, Textarea, Password, RichText, Editable, MaskedInput  |
| Числовые     | 6      | Number, Slider, Rating, Currency, Percentage, NumberInput    |
| Дата/время   | 6      | Date, DateRange, DateTimePicker, Time, Duration, Schedule    |
| Выбор        | 10     | Select, Combobox, RadioGroup, RadioCard, Tags, Listbox, ...  |
| Специальные  | 7      | Phone, Address, City, FileUpload, PinInput, ColorPicker, OTP |
| Булевы       | 3      | Checkbox, Switch, CheckboxCard                               |
| Опросные     | 4      | MatrixChoice, ImageChoice, Likert, YesNo                     |
| Табличные    | 2      | TableEditor, DataGrid                                        |
| Платёжные    | 1      | CreditCard                                                   |
| Защитные     | 3      | Honeypot, RateLimit, Captcha                                 |
| Утилитарные  | 3      | Hidden, Calculated, Auto                                     |
| Аудит/Чтение | 2      | FormComparison, FormReadOnlyView                             |
| Документы РФ | 9      | INN, KPP, OGRN, BIK, BankAccount, SNILS, Passport, ...       |

50+ компонентов покрывают ~98% наших продакшн-сценариев. Оставшиеся 2% — кастомные поля через `createForm({ extraFields })`.

---

## Попробовать

- **Все поля:** [forms-example.letar.best/examples/all-fields](https://forms-example.letar.best/examples/all-fields)
- **Продвинутые:** [forms-example.letar.best/examples/advanced-fields](https://forms-example.letar.best/examples/advanced-fields)
- **Рецепты:** [forms-example.letar.best/examples/recipes](https://forms-example.letar.best/examples/recipes)
- **Исходный код:** [all-fields](https://github.com/kamiletar/letar-forms-example/blob/main/src/app/examples/all-fields/page.tsx) | [advanced-fields](https://github.com/kamiletar/letar-forms-example/blob/main/src/app/examples/advanced-fields/page.tsx)
- **Клонировать:** `git clone https://github.com/kamiletar/letar-forms-example && cd letar-forms-example && npm install && npm run dev`

В следующей статье — мультистеп формы: `<Form.Steps>`, условный рендеринг через `<Form.When>`, валидация по шагам.

---

_Это четвёртая статья из цикла «@letar/forms — от боли к декларативным формам». [Предыдущая: Compound Components](03-compound-components.md) | [Следующая: Мультистеп и условный рендеринг](05-multistep-conditional.md)._
