# ТЗ: Новые компоненты и возможности @letar/forms

> Сформировано на основе исследования болей пользователей форм (2025-2026).
> Текущая версия: 0.84.2 | 56 полей | 11 категорий

---

> **ОЧЕНЬ ВАЖНО:** При реализации КАЖДОЙ фазы ОБЯЗАТЕЛЬНО обновлять:
>
> 1. **form-develop-app** (`apps/form-develop-app`) — демо-страница + ссылка на главной
> 2. **form-docs** (`apps/form-docs`) — guide MDX + demo страница + API reference + meta.json
> 3. **form-example** (`apps/form-example`) — example страница + навигация (nav.tsx)
> 4. **libs/forms** — CHANGELOG.md, README.md, docs/form-level.md, package.json (версия)
> 5. **apps/form-develop-app** — PLAN.md, CHANGELOG.md
> 6. **NEW_COMPONENTS.md** — отметить фазу как done
>
> Без полного цикла документации фаза НЕ считается завершённой.

---

## Фаза 16: TableEditor — редактор табличных данных

**Приоритет:** P0 | **Сложность:** XL | **Статус:** Этап 1 done (v0.68.0)

### Проблема

Ни одна React form-библиотека не предоставляет табличный ввод данных.
`Form.Group.List` решает задачу массива, но UX карточный — не подходит для:

- Ввода товаров в заказе (10-50 строк)
- Складских операций (100+ позиций)
- Импорта данных из Excel
- Массового создания записей (HR, CRM)

### Решение: Form.Field.TableEditor

4 режима работы, реализуемые поэтапно.

#### Этап 1: Inline Table Editor (основной)

Таблица с редактируемыми ячейками внутри формы. Колонки определяются из Zod-схемы.

**API:**

```tsx
const OrderItemSchema = z.object({
  product: z.string().min(1).meta({ title: 'Товар' }),
  qty: z.number().min(1).meta({ title: 'Кол-во' }),
  price: z.number().min(0).meta({ title: 'Цена' }),
})

const OrderSchema = z.object({
  customer: z.string(),
  items: z.array(OrderItemSchema).min(1).max(50),
})

// Вариант 1: автоматические колонки из схемы
<Form schema={OrderSchema}>
  <Form.Field.String name="customer" />
  <Form.Field.TableEditor name="items" />
</Form>

// Вариант 2: кастомные колонки
<Form.Field.TableEditor
  name="items"
  columns={[
    { name: 'product', width: '40%' },
    { name: 'qty', width: '15%', align: 'right' },
    { name: 'price', width: '15%', align: 'right' },
    { name: 'total', computed: (row) => row.qty * row.price, label: 'Итого' },
  ]}
  addLabel="Добавить товар"
  sortable={true}
  footer={[
    { column: 'total', aggregate: 'sum', label: 'Итого:' }
  ]}
/>
```

**Возможности:**

- [x] Клик по ячейке → inline editing
- [x] Tab навигация: ячейка → ячейка → следующая строка
- [x] Enter в последней ячейке → новая строка
- [x] Добавление/удаление строк (кнопки + клавиши)
- [x] Drag & drop сортировка строк (@dnd-kit) — SortableWrapper + DragHandle компонент (v0.83.0)
- [x] Computed columns (вычисляемые колонки, readonly)
- [x] Footer: SUM, AVG, COUNT, MIN, MAX по колонке
- [x] Колонка-чекбокс для массового удаления
- [x] Copy-paste из Excel/Sheets (парсинг TSV через Clipboard API)
- [x] Валидация на уровне ячейки (ошибка прямо в ячейке)
- [x] Авт��матические колонки из Zod `.meta()` (title, fieldType)
- [x] Responsive: на мобильных — переключение на карточный вид (table-mobile-view.tsx)

**Значение поля:** `Array<Record<string, unknown>>` — как у Group.List

**Зависимости:** @dnd-kit (уже есть), Clipboard API (браузер)

#### Этап 2: Editable DataGrid (TanStack Table) — done (v0.75.0)

Для работы с большими объёмами существующих данных — добавляет пагинацию, фильтрацию, inline editing.

**API:**

```tsx
<Form.Field.DataGrid
  name="employees"
  columns={[
    { name: 'name', editable: true, filter: 'text' },
    { name: 'salary', editable: true, filter: 'range' },
    { name: 'department', editable: true, filter: 'select' },
    { name: 'hireDate', editable: false },
  ]}
  pageSize={20}
  virtualized={true}
  onRowSave={async (row, index) => await api.updateEmployee(row)}
  rowSelection={true}
/>
```

**Возможности:**

- [x] TanStack Table v8 под капотом
- [x] Виртуализация для 1000+ строк (@tanstack/react-virtual)
- [x] Column resizing (drag границы колонок)
- [x] Column reordering (drag заголовки)
- [x] Фильтры: text (range, select, date — через кастомные filterFn)
- [x] Сортировка по клику на заголовок
- [x] Пагинация (кнопки + номер страницы, отключается при virtualized)
- [x] Row-level save (onRowSave callback)
- [x] Diff highlighting (изменённые ячейки подсвечиваются жёлтым)
- [x] Bulk actions: удалить выделенные + экспорт CSV

**Зависимости:** @tanstack/react-table ✅, @tanstack/react-virtual ✅

#### ~~Этап 3: Spreadsheet Field~~ — ОТМЕНЁН

> Решение от 2026-04-03: мини-Excel в форме — слишком нишевый кейс, тяжёлый dependency (hyperformula ~100KB). Не реализуется.

#### ~~Этап 4: Bulk Entry Mode~~ — ОТМЕНЁН

> Решение от 2026-04-03: реализуется обычной формой с `onSubmit → reset → focus`. Отдельный компонент избыточен.

### Критерии приёмки TableEditor

1. Демо-страница в form-develop-app с каждым режимом
2. Юнит-тесты: навигация, add/remove, computed, paste
3. E2E тест: полный сценарий заказа с товарами
4. Документация в form-docs
5. Пример в form-example (showcase)

---

## Фаза 17: Signature — поле цифровой подписи ✅

**Приоритет:** P0 | **Сложность:** M | **Статус:** done (v0.66.0)

### Проблема

Юридические формы (договора, акты, согласия) требуют подпись. Jotform, WPForms, Adobe Sign имеют такое поле. Ни одна React form-библиотека — нет.

### API

```tsx
<Form.Field.Signature
  name="signature"
  width={400}
  height={150}
  strokeColor="black"
  strokeWidth={2}
  backgroundColor="white"
  clearLabel="Очистить"
  placeholder="Подпишите здесь"
/>
```

### Возможности

- [x] Canvas-рисование мышью и пальцем (touch)
- [x] Кнопка "Очистить"
- [x] Режим "Typed signature" — ввод имени шрифтом-курсивом (как альтернатива)
- [x] Экспорт в PNG (base64 data URI)
- [x] Экспорт в SVG (вектор, для печати) — `exportFormat: 'svg'` проп (v0.83.0)
- [x] Placeholder текст поверх canvas (исчезает при начале рисования)
- [x] Responsive: адаптация размера под контейнер
- [x] Валидация: required → проверка что canvas не пустой
- [x] Dark mode: инверсия цветов

**Значение поля:** `string` — data URI (image/png) или SVG-строка

**Зависимости:** нет (Canvas API браузера)

### Критерии приёмки

1. Демо-страница с двумя режимами (draw + typed)
2. Тест: рисование → submit → проверка что base64 непустой
3. Mobile: работает на touch-экранах
4. Accessibility: aria-label, keyboard fallback (typed mode)

---

## Фаза 18: CalculatedField — вычисляемые поля ✅

**Приоритет:** P0 | **Сложность:** S | **Статус:** done (v0.64.0)

### Проблема

Сейчас для `итого = цена × количество` нужен `Form.Watch` + императивный `setValue`. Для простых формул это избыточно.

### API

```tsx
// Вариант 1: через JSX
<Form.Field.Calculated
  name="total"
  label="Итого"
  compute={(values) => values.price * values.qty}
  format={(value) => `${value.toLocaleString()} ₽`}
/>

// Вариант 2: через Zod .meta()
const Schema = z.object({
  price: z.number(),
  qty: z.number(),
  total: z.number().meta({
    computed: (values) => values.price * values.qty,
    readonly: true,
  }),
})
```

### Возможности

- [x] Автоматическое вычисление при изменении зависимых полей (useComputedValue + useSyncExternalStore)
- [x] `format` — форматирование отображаемого значения
- [x] Readonly по умолчанию (нельзя редактировать вручную)
- [x] Поддержка вложенных путей: `address.total` (getNestedValue)
- [x] Циклическая защита: если A зависит от B, а B от A — ошибка (computingFields Set)
- [x] Дебаунс вычислений (для тяжёлых формул) — debounce prop
- [x] Работает с TableEditor (computed columns)

**Значение поля:** результат функции `compute`

**Зависимости:** нет

### Критерии приёмки

1. Демо: калькулятор стоимости заказа (цена × кол-во × скидка)
2. Тест: изменение зависимого поля → пересчёт
3. Тест: циклическая зависимость → ошибка в dev mode

---

## Фаза 19: MatrixChoice — матричный выбор

**Приоритет:** P0 | **Сложность:** M | **Статус:** done (v0.69.0)

### Проблема

Опросники, NPS-формы, оценки качества — таблица "вопрос × вариант ответа". Стандарт в Google Forms и SurveyMonkey. Нет ни в одной React form-библиотеке.

### API

```tsx
<Form.Field.MatrixChoice
  name="satisfaction"
  rows={[
    { value: 'speed', label: 'Скорость доставки' },
    { value: 'quality', label: 'Качество товара' },
    { value: 'support', label: 'Поддержка' },
  ]}
  columns={[
    { value: '1', label: 'Ужасно' },
    { value: '2', label: 'Плохо' },
    { value: '3', label: 'Нормально' },
    { value: '4', label: 'Хорошо' },
    { value: '5', label: 'Отлично' },
  ]}
  required={true}
  variant="radio" // 'radio' | 'checkbox' | 'rating'
/>
```

### Возможности

- [x] Radio-вариант: одна ячейка на строку (single choice)
- [x] Checkbox-вариант: несколько ячеек на строку (multi choice)
- [x] Rating-вариант: звёзды в каждой строке
- [x] Responsive: на мобильных — вертикальная карточка вместо таблицы
- [x] Валидация: незаполненные строки подсвечиваются красным при required + ошибке
- [x] Highlight: подсветка строки при hover
- [x] Keyboard: стрелки для навигации между ячейками

**Значение поля:** `Record<string, string | string[]>` — `{ speed: '4', quality: '5', support: '3' }`

### Критерии приёмки

1. Демо: NPS-опросник с 5 вопросами
2. Тест: заполнение всех строк → submit
3. Mobile: корректный responsive-вид
4. Accessibility: роль `radiogroup`, `aria-label` для ячеек

---

## Фаза 20: Smart Autofill (autocomplete атрибуты) ✅

**Приоритет:** P0 | **Сложность:** XS | **Статус:** done (v0.62.0)

### Проблема

Google: правильные `autocomplete` атрибуты дают +30% конверсии. WCAG 1.3.5 требует `autocomplete` для personal data полей. Сейчас @letar/forms не проставляет их автоматически.

### Решение

Автоматическое проставление `autocomplete` на основе `name` поля или явного указания в `.meta()`.

```tsx
// Автоматическое определение по имени поля
<Form.Field.String name="email" />     // → autocomplete="email"
<Form.Field.String name="firstName" /> // → autocomplete="given-name"
<Form.Field.Phone name="phone" />      // → autocomplete="tel"

// Явное указание через .meta()
z.string().meta({ autocomplete: 'street-address' })

// Отключение
z.string().meta({ autocomplete: 'off' })
```

### Маппинг name → autocomplete

| Паттерн name                       | autocomplete       |
| ---------------------------------- | ------------------ |
| `email`, `e-mail`                  | `email`            |
| `phone`, `tel`, `mobile`           | `tel`              |
| `firstName`, `first_name`, `name`  | `given-name`       |
| `lastName`, `last_name`, `surname` | `family-name`      |
| `password`                         | `current-password` |
| `newPassword`, `new_password`      | `new-password`     |
| `address`, `street`                | `street-address`   |
| `city`                             | `address-level2`   |
| `zip`, `postal`, `postalCode`      | `postal-code`      |
| `country`                          | `country-name`     |
| `company`, `organization`          | `organization`     |
| `card`, `cardNumber`               | `cc-number`        |

### Возможности

- [x] Автоматический маппинг name → autocomplete (AUTOCOMPLETE_MAP, 50+ маппингов)
- [x] Override через `.meta({ autocomplete: '...' })` (resolveAutoComplete priority)
- [x] Отключение: `.meta({ autocomplete: 'off' })`
- [x] Работает со всеми текстовыми полями (String, Phone, Email) — через useResolvedFieldProps

### Критерии приёмки

1. Тест: поле `email` → DOM-элемент имеет `autocomplete="email"`
2. Тест: `.meta({ autocomplete: 'off' })` → `autocomplete="off"`
3. Проверка: Chrome autofill корректно заполняет форму с 5 полями

---

## Фаза 21: Поля для опросов (ImageChoice, Likert, YesNo)

**Приоритет:** P1 | **Сложность:** S | **Статус:** done (v0.70.0)

### ImageChoice — выбор из картинок

```tsx
<Form.Field.ImageChoice
  name="style"
  options={[
    { value: 'modern', label: 'Современный', image: '/styles/modern.jpg' },
    { value: 'classic', label: 'Классический', image: '/styles/classic.jpg' },
    { value: 'minimal', label: 'Минималистичный', image: '/styles/minimal.jpg' },
  ]}
  columns={3}
  multiple={false}
/>
```

- [x] Grid картинок с overlay-лейблами
- [x] Hover: увеличение / highlight
- [x] Selected: обводка + галочка
- [x] Multiple: multi-select режим
- [x] Responsive: 3 → 2 → 1 колонка

### Likert — шкала согласия

```tsx
<Form.Field.Likert
  name="experience"
  anchors={['Совершенно не согласен', 'Не согласен', 'Нейтрально', 'Согласен', 'Полностью согласен']}
  showNumbers={true}
/>
```

- [x] 5 или 7 точек шкалы
- [x] Текстовые якоря по краям и/или на каждой точке
- [x] Визуальная индикация выбора (цветная шкала)
- [x] Responsive: на мобильных — вертикальная шкала

### YesNo — большие кнопки

```tsx
<Form.Field.YesNo
  name="agree"
  yesLabel="Да, согласен"
  noLabel="Нет, отказываюсь"
  variant="buttons" // 'buttons' | 'thumbs' | 'emoji'
/>
```

- [x] Два больших кликабельных блока
- [x] Варианты: текст, иконки 👍👎, эмодзи
- [x] Анимация выбора
- [x] Значение: `boolean`

---

## Фаза 22: Утилитарные элементы (InfoBlock, Divider, Hidden)

**Приоритет:** P2 | **Сложность:** XS | **Статус:** done (v0.63.0)

### InfoBlock — информационный блок

```tsx
<Form.InfoBlock variant="info" title="Важно">
  Заполните все поля для получения скидки 10%.
</Form.InfoBlock>
```

- [x] Варианты: `info`, `warning`, `error`, `success`, `tip`
- [x] Иконка + заголовок + текст
- [x] На базе Chakra `Alert` компонента
- [x] Условное отображение через Form.When

### Divider — разделитель

```tsx
<Form.Divider label="Контактная информация" />
```

- [x] Горизонтальная линия с опциональным текстом
- [x] На базе Chakra `Separator`
- [x] С иконкой: `<Form.Divider icon={<FiPhone />} />`

### Hidden — скрытое поле

```tsx
<Form.Field.Hidden name="utm_source" value={searchParams.get('utm_source')} />
<Form.Field.Hidden name="referralCode" />
```

- [x] Не рендерится в DOM (только в form state)
- [x] Принимает начальное значение
- [x] Обновляется через form API

---

## Фаза 23: Conversational Mode

**Приоритет:** P2 | **Сложность:** L | **Статус:** done (v0.74.0)

### Проблема

Typeform создал целую индустрию "conversational forms" — одно поле за раз с анимацией. Лучшая конверсия для маркетинговых форм и опросников. Ни одна React form-библиотека не предлагает этот режим.

### API

```tsx
<Form schema={SurveySchema} mode="conversational">
  <Form.Field.String name="name" />
  <Form.Field.Email name="email" />
  <Form.Field.YesNo name="subscribe" />
  <Form.Field.Likert name="satisfaction" />
  <Form.Field.Textarea name="feedback" />
</Form>
```

### Возможности

- [x] Одно поле на экране (full viewport)
- [x] Анимация перехода (slide up / fade)
- [x] Progress bar сверху
- [x] Enter → следующее поле
- [x] Стрелки вверх/вниз для навигации (Alt+Arrow)
- [x] Валидация поля при переходе
- [x] Номер вопроса: "Вопрос 3 из 7"
- [x] Welcome screen + Thank you screen
- [x] Keyboard-first UX (мышь не нужна)

---

## Фаза 24: Autosave to server

**Приоритет:** P1 | **Сложность:** M | **Статус:** done (v0.73.0)

### Проблема

`persistence` сохраняет в localStorage — если пользователь закрыл вкладку на другом устройстве, данные потеряны. Длинные формы (заявки, анкеты) нуждаются в серверном автосохранении.

### API

```tsx
<Form
  schema={ApplicationSchema}
  autosave={{
    endpoint: '/api/drafts',
    interval: 5000,
    debounce: 1000,
    draftId: 'application-123',
  }}
/>
```

### Возможности

- [x] Периодическое сохранение на сервер (POST/PUT) — useFormAutosave + setInterval
- [x] Debounce: не чаще 1 раза в N мс
- [x] Индикатор: "Сохранено", "Сохраняю...", "Ошибка сохранения" — AutosaveIndicator
- [x] Восстановление из серверного черновика при открытии — loadDraft()
- [x] Conflict resolution: если черновик изменён в другой вкладке
- [x] Fallback на localStorage при отсутствии сети (+ sync при восстановлении)

---

## Фаза 25: Russian Documents — российские документы ✅

**Приоритет:** P0 | **Сложность:** M | **Статус:** done (v0.67.0)

### Проблема

Каждая B2B-форма в России требует ИНН, ОГРН, БИК, расчётный счёт. Все эти поля имеют **контрольные суммы** — простая маска бесполезна без валидации. Ни одна React form-библиотека не предоставляет российские документы из коробки.

### Архитектура: 2 слоя

#### Слой 1: Zod-валидаторы (ядро, без UI)

Отдельный экспорт `@letar/forms/validators/ru` — можно использовать без UI-компонентов.

```typescript
import { zRu } from '@letar/forms/validators/ru'

const CompanySchema = z.object({
  inn: zRu.inn(), // 10 или 12 цифр + контрольная сумма
  kpp: zRu.kpp(), // 9 цифр, формат NNNNPPXXX
  ogrn: zRu.ogrn(), // 13 цифр + контрольная сумма
  ogrnip: zRu.ogrnip(), // 15 цифр + контрольная сумма
  bik: zRu.bik(), // 9 цифр, начинается с 04
  account: zRu.bankAccount(), // 20 цифр + контрольный ключ (с учётом БИК)
  corrAccount: zRu.corrAccount(), // 20 цифр, начинается с 301
  snils: zRu.snils(), // ___-___-___ __ + контрольная сумма
  passport: zRu.passport(), // серия (4 цифры) + номер (6 цифр)
})

// Варианты ИНН
zRu.inn() // любой (10 или 12 цифр)
zRu.inn.legal() // только юрлицо (10 цифр)
zRu.inn.individual() // только физлицо (12 цифр)
```

**Алгоритмы валидации:**

| Поле           | Алгоритм                                                             |
| -------------- | -------------------------------------------------------------------- |
| **ИНН 10**     | Контрольная 10-я цифра: взвешенная сумма (2,4,10,3,5,9,4,6,8) mod 11 |
| **ИНН 12**     | 11-я и 12-я цифры: два раунда с разными весами                       |
| **СНИЛС**      | Модуль 101: сумма (digit[i] × (9-i)) для i=0..8, mod 101             |
| **ОГРН**       | Первые 12 цифр mod 11, младший разряд = 13-я цифра                   |
| **ОГРНИП**     | Первые 14 цифр mod 13, младший разряд = 15-я цифра                   |
| **БИК**        | 9 цифр, первые 2 = "04"                                              |
| **Расч. счёт** | Контрольный ключ (3-я цифра) с учётом последних 3 цифр БИК           |
| **Корр. счёт** | Начинается с "301", контрольный ключ с "0" + первые 2 цифры БИК      |
| **Паспорт**    | Серия: 2 цифры региона + 2 цифры года, номер: 6 цифр                 |

#### Слой 2: Form.Document.\* — UI-компоненты

Готовые поля с маской, иконкой, валидацией и опциональным lookup.

```tsx
// Отдельные поля
<Form.Document.INN name="inn" variant="legal" />
<Form.Document.SNILS name="snils" />
<Form.Document.Passport name="passport" />
<Form.Document.OGRN name="ogrn" />
<Form.Document.BIK name="bik" />
<Form.Document.BankAccount name="account" bikField="bik" />
<Form.Document.CorrAccount name="corrAccount" bikField="bik" />
<Form.Document.KPP name="kpp" />

// Готовые группы
<Form.Document.CompanyRequisites
  prefix="company"
  fields={['inn', 'kpp', 'ogrn', 'bik', 'account', 'corrAccount']}
  lookup={true}
/>

<Form.Document.PassportData
  prefix="passport"
  fields={['series', 'number', 'issuedBy', 'issuedDate', 'divisionCode']}
/>
```

**Каждое поле включает:**

- [x] Маска ввода (автоформат при вводе)
- [x] Иконка слева (документ, банк, щит)
- [x] Валидация контрольной суммы в реальном времени
- [x] Подсказка формата (placeholder с примером)
- [x] Сообщения об ошибках на русском
- [x] Dark mode
- [x] Responsive

### Lookup Provider (pluggable)

Абстрактный провайдер для автозаполнения реквизитов по номеру.

```typescript
// Интерфейс провайдера
interface DocumentLookupProvider {
  searchByInn(inn: string): Promise<CompanyInfo | null>
  searchByBik(bik: string): Promise<BankInfo | null>
  searchByOgrn(ogrn: string): Promise<CompanyInfo | null>
}

interface CompanyInfo {
  name: string
  fullName: string
  inn: string
  kpp: string
  ogrn: string
  address: string
  director: string
  status: 'active' | 'liquidated' | 'reorganizing'
}

interface BankInfo {
  name: string
  bik: string
  corrAccount: string
  swift?: string
}
```

```tsx
// DaData реализация (встроенная)
import { createDaDataDocumentProvider } from '@letar/forms/providers/dadata'

const provider = createDaDataDocumentProvider({ token: 'xxx' })

<Form.Document.INN
  name="inn"
  lookup={provider}
  onLookup={(company) => {
    form.setFieldValue('name', company.name)
    form.setFieldValue('kpp', company.kpp)
    form.setFieldValue('ogrn', company.ogrn)
    form.setFieldValue('address', company.address)
  }}
/>

// Или через контекст — lookup для всей группы
<Form.DocumentProvider provider={provider}>
  <Form.Document.CompanyRequisites prefix="company" lookup={true} />
</Form.DocumentProvider>
```

### Готовые группы реквизитов

```tsx
// Реквизиты компании — одна строка
<Form.Document.CompanyRequisites
  prefix="company"
  lookup={true}
  layout="compact"    // 'compact' | 'full' | 'inline'
/>
// → ИНН, КПП, ОГРН, Название, Адрес, БИК, Р/с, К/с

// Паспортные данные
<Form.Document.PassportData prefix="person" />
// → Серия, Номер, Кем выдан, Дата выдачи, Код подразделения

// Банковские реквизиты
<Form.Document.BankRequisites prefix="bank" lookup={true} />
// → БИК, Банк (авто), К/с (авто), Р/с
```

### Критерии приёмки

1. Все 10 валидаторов с unit-тестами (правильные + неправильные номера)
2. Демо: "Регистрация контрагента" с полным набором реквизитов
3. Lookup: ввёл ИНН → автозаполнились название, КПП, ОГРН, адрес
4. Все поля работают с Form.FromSchema
5. Zod-валидаторы работают отдельно от UI (headless)

---

## Фаза 26: Async Validation — асинхронная валидация

**Приоритет:** P1 | **Сложность:** M | **Статус:** done (v0.71.0)

### Проблема

Проверка уникальности email, существования ИНН в ФНС, доступности username — нужны серверные запросы во время ввода. Нет декларативного API.

### API

```tsx
// Через Zod .meta()
const Schema = z.object({
  email: z.email().meta({
    asyncValidate: async (value) => {
      const exists = await fetch(`/api/check-email?email=${value}`)
      if (exists) return 'Email уже зарегистрирован'
    },
    asyncDebounce: 500,
  }),
  username: z.string().min(3).meta({
    asyncValidate: async (value) => {
      const taken = await fetch(`/api/check-username?name=${value}`)
      if (taken) return 'Username занят'
    },
    asyncDebounce: 300,
  }),
})

// Через пропс поля
<Form.Field.String
  name="email"
  asyncValidate={checkEmailAvailability}
  asyncDebounce={500}
/>
```

### Возможности

- [x] Декларативная async-валидация через `.meta()` и через пропс
- [x] Debounce: не отправлять запрос пока пользователь печатает
- [x] Loading indicator: Chakra Spinner + синяя рамка при isValidating (v0.83.0)
- [x] Cancel: отмена предыдущего запроса (AbortController)
- [x] Cache: не перепроверять уже проверенные значения
- [x] Trigger: `onBlur` (по умолчанию) или `onChange`
- [x] Состояния: idle → validating → valid / invalid / error — Spinner UI + data-validating + синяя рамка (v0.83.0)
- [x] Совместимость с offline: пропускает async-валидацию в офлайне

### Критерии приёмки

1. Демо: регистрация с проверкой email + username
2. Тест: debounce — 5 быстрых нажатий = 1 запрос
3. Тест: cancel — новый ввод отменяет предыдущий fetch
4. Тест: offline — async-валидация пропускается

---

## Фаза 27: Form Templates — готовые шаблоны форм

**Приоритет:** P1 | **Сложность:** M | **Статус:** done (v0.72.0)

### Проблема

Разработчики копируют одни и те же паттерны: регистрация, логин, контакт, заказ. Готовые шаблоны ускоряют старт в 10 раз.

### API

```tsx
import { templates } from '@letar/forms/templates'

// Использование шаблона как есть
<Form.FromTemplate template={templates.contactForm} onSubmit={handleSubmit} />

// Кастомизация
<Form.FromTemplate
  template={templates.companyRegistration}
  override={{
    exclude: ['middleName'],
    fields: { email: { label: 'Рабочий email' } },
  }}
  onSubmit={handleSubmit}
/>

// Headless — только схема
const schema = templates.contactForm.schema
const defaultValues = templates.contactForm.defaultValues
```

### Встроенные шаблоны

| Шаблон                | Поля                                            | Категория  |
| --------------------- | ----------------------------------------------- | ---------- |
| `loginForm`           | email, password                                 | Auth       |
| `registerForm`        | name, email, password, confirmPassword          | Auth       |
| `forgotPasswordForm`  | email                                           | Auth       |
| `contactForm`         | name, email, phone, message                     | Feedback   |
| `feedbackForm`        | rating, category, message, email                | Feedback   |
| `npsForm`             | score (0-10), reason, email                     | Survey     |
| `companyRegistration` | ИНН, КПП, ОГРН, название, адрес, БИК, р/с       | Business   |
| `orderForm`           | items[], customer, address, payment             | E-commerce |
| `profileForm`         | firstName, lastName, email, phone, avatar       | Profile    |
| `addressForm`         | country, city, street, building, apartment, zip | Address    |

### Критерии приёмки

1. 10 шаблонов из таблицы
2. Демо-страница с галереей шаблонов
3. MCP tool: `get_template(name)` — возвращает шаблон для AI
4. Каждый шаблон работает с `Form.FromTemplate` и headless

---

## Фаза 28: Security Patterns — безопасность форм ✅

**Приоритет:** P1 | **Сложность:** S | **Статус:** done (v0.65.0)

### Проблема

Формы — главная точка входа для атак: спам-боты, CSRF, XSS через file upload, brute force.

### Компоненты

#### Honeypot — ловушка для ботов

```tsx
<Form schema={Schema} honeypot={true}>
  {/* Скрытое поле, невидимое для людей, заполняемое ботами */}
</Form>
```

- [x] Скрытое поле (CSS `display:none` + `aria-hidden`)
- [x] Блокировка submit если заполнено
- [x] Рандомное имя поля (затрудняет обход)

#### Rate Limiting (клиентский)

```tsx
<Form schema={Schema} rateLimit={{ maxSubmits: 3, windowMs: 60000 }} />
```

- [x] Счётчик попыток submit
- [x] Таймер блокировки с обратным отсчётом
- [x] Persist в sessionStorage

#### Secure File Upload

```tsx
<Form.Field.FileUpload
  name="document"
  security={{
    maxSize: '10MB',
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    stripMetadata: true,
    renameFile: true,
  }}
/>
```

- [x] Проверка MIME-type (не только расширения)
- [x] Удаление EXIF-метаданных
- [x] Переименование файла (защита от path traversal)

### Критерии приёмки

1. Тест: honeypot заполнен → submit заблокирован
2. Тест: 4-й submit за минуту → rate limit message
3. Тест: загрузка .exe → отклонена

---

## Фаза 29: Captcha — CAPTCHA интеграция ✅

**Приоритет:** P1 | **Сложность:** M | **Статус:** done (v0.78.0)

### Проблема

Формы без CAPTCHA уязвимы к спам-ботам. Honeypot (Фаза 28) — базовый уровень, но профессиональные боты обходят его. Нужна интеграция с настоящими CAPTCHA-провайдерами.

### Решение: Form.Captcha

Провайдер-абстракция с lazy loading для трёх CAPTCHA сервисов.

**API:**

```tsx
// Конфигурация в createForm (один раз для приложения)
const AppForm = createForm({
  captcha: {
    provider: 'turnstile',
    siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
    theme: 'auto',
  },
})

// Использование в форме
<AppForm onSubmit={handleSubmit}>
  <AppForm.Field.String name="email" label="Email" />
  <AppForm.Captcha />
  <AppForm.Button.Submit>Отправить</AppForm.Button.Submit>
</AppForm>

// Серверная верификация
import { verifyCaptcha } from '@letar/forms/captcha'

const result = await verifyCaptcha(token, {
  provider: 'turnstile',
  secretKey: process.env.TURNSTILE_SECRET_KEY!,
})
```

**Возможности:**

- [x] Cloudflare Turnstile (рекомендуемый, бесплатный)
- [x] Google reCAPTCHA v2/v3
- [x] hCaptcha
- [x] Lazy loading скриптов провайдера
- [x] Серверная верификация `verifyCaptcha()`
- [x] Конфигурация через `createForm({ captcha: {...} })`
- [x] Токен автоматически добавляется в form data как `__captchaToken`
- [x] Props: theme, size, language, onSuccess, onError, onExpire

**Зависимости:** `@marsidev/react-turnstile` (peer dependency)

### Критерии приёмки

1. Turnstile виджет рендерится с тестовым siteKey
2. Токен передаётся при submit
3. `verifyCaptcha()` работает на сервере
4. Lazy loading — скрипт грузится только когда CAPTCHA нужна

---

## Фаза 30: CreditCard — ввод данных банковской карты ✅

**Приоритет:** P1 | **Сложность:** M | **Статус:** done (v0.78.0)

### Проблема

Ввод номера карты — частый сценарий (подписки, донаты, внутренние системы). Без авто-форматирования и определения бренда UX страдает. Для PCI DSS production лучше Stripe Elements, но для прототипов, внутренних систем и тестирования нужен собственный компонент.

### Решение: Form.Field.CreditCard

Составное поле: номер карты + срок действия (MM/YY) + CVC.

**API:**

```tsx
import { creditCardSchema, Form } from '@letar/forms'
import { z } from 'zod/v4'

const PaymentSchema = z.object({
  name: z.string().min(2, 'Имя владельца'),
  card: creditCardSchema(),
}).strip()

<Form initialValue={{ name: '', card: { number: '', expiry: '', cvc: '' } }} schema={PaymentSchema} onSubmit={save}>
  <Form.Field.String name="name" label="Имя владельца" />
  <Form.Field.CreditCard name="card" label="Данные карты" />
  <Form.Button.Submit>Оплатить</Form.Button.Submit>
</Form>
```

**Возможности:**

- [x] Авто-форматирование номера (4-4-4-4 для Visa/MC, 4-6-5 для Amex)
- [x] Определение бренда по BIN (Visa, MasterCard, American Express, МИР, JCB, Discover, UnionPay, Maestro)
- [x] Luhn валидация номера
- [x] MM/YY expiry с валидацией будущей даты
- [x] CVC (3 или 4 цифры для Amex)
- [x] SVG иконки брендов (inline, без внешних зависимостей)
- [x] Два layout: `inline` (одна строка) и `stacked` (вертикально)
- [x] Готовая Zod-схема `creditCardSchema()`
- [x] Accessibility: role="group", aria-label, inputMode="numeric"
- [x] Ограничение принимаемых брендов (`brands` prop)

**Значение поля:** `{ number: string, expiry: string, cvc: string }`

**Зависимости:** нет (только встроенный Luhn алгоритм)

### Критерии приёмки

1. Ввод "4111111111111111" → показывает Visa, форматирует как "4111 1111 1111 1111"
2. Ввод "2200" → показывает МИР
3. Невалидный номер (не проходит Luhn) → ошибка валидации
4. Expired MM/YY → ошибка
5. `creditCardSchema()` работает с Zod v4

---

## Порядок реализации

| Фаза | Компонент                    | Сложность | Зависимости               |
| ---- | ---------------------------- | --------- | ------------------------- |
| 20   | Smart Autofill               | XS        | —                         |
| 22   | InfoBlock + Divider + Hidden | XS        | —                         |
| 28   | Security Patterns            | S         | —                         |
| 18   | CalculatedField              | S         | —                         |
| 17   | Signature                    | M         | —                         |
| 25   | **Russian Documents**        | M         | —                         |
| 16.1 | TableEditor: Inline Table    | M         | —                         |
| 19   | MatrixChoice                 | M         | —                         |
| 21   | ImageChoice + Likert + YesNo | S         | —                         |
| 26   | Async Validation             | M         | —                         |
| 27   | Form Templates               | M         | Фаза 25                   |
| 16.2 | TableEditor: DataGrid        | M         | @tanstack/react-table     |
| 24   | Autosave to server           | M         | —                         |
| 16.3 | TableEditor: Spreadsheet     | L         | hyperformula?             |
| 16.4 | TableEditor: Bulk Entry      | S         | —                         |
| 23   | Conversational Mode          | L         | —                         |
| 29   | Captcha                      | M         | @marsidev/react-turnstile |
| 30   | CreditCard                   | M         | —                         |

**Оценка по версиям:**

**Фактические версии:**

- **v0.62.0** — Smart Autofill (Фаза 20) ✅
- **v0.63.0** — InfoBlock + Divider + Hidden (Фаза 22) ✅
- **v0.64.0** — CalculatedField (Фаза 18) ✅
- **v0.65.0** — Security Patterns (Фаза 28) ✅
- **v0.66.0** — Signature (Фаза 17) ✅
- **v0.67.0** — Russian Documents (Фаза 25) ✅
- **v0.68.0** — TableEditor: Inline Table (Фаза 16.1) ✅
- **v0.69.0** — MatrixChoice (Фаза 19) ✅
- **v0.70.0** — ImageChoice + Likert + YesNo (Фаза 21) ✅
- **v0.71.0** — Async Validation (Фаза 26) ✅
- **v0.72.0** — Form Templates (Фаза 27) ✅
- **v0.73.0** — Autosave to Server (Фаза 24) ✅
- **v0.74.0** — Conversational Mode (Фаза 23) ✅
- **v0.75.0** — TableEditor: DataGrid (Фаза 16.2) ✅
- ~~v0.76.0~~ — ~~Spreadsheet (Фаза 16.3)~~ — ОТМЕНЁН
- ~~v0.77.0~~ — ~~Bulk Entry (Фаза 16.4)~~ — ОТМЕНЁН
- **v0.78.0** — Captcha + CreditCard (Фазы 29-30) ✅

---

_Создано: 2026-04-03 | Обновлено: 2026-04-03 | На основе исследования UX-болей и анализа конкурентов_
