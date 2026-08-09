# Формы как state manager: фильтры, URL-синхронизация, панели настроек

> **Уровень сложности:** Средний

**TL;DR:**

- Форма — это не только «заполни и отправь». Используй `Form` без `onSubmit` как state container для фильтров, настроек и dashboard-контролов
- `Form.Subscribe` и `useTypedFormSubscribe` превращают форму в реактивный источник данных — без разрозненных `useState`
- `useUrlPrefill` + ручная запись в URL дают персистентные фильтры, которые переживают перезагрузку и шерятся по ссылке

**Кому полезно:**

- Junior: научиться использовать форму без кнопки «Отправить» и понять, когда это оправдано
- Middle: освоить паттерны фильтров с URL-синхронизацией, debounce и внешним сбросом
- Senior: оценить архитектуру «форма как единственный источник истины для UI-стейта» и сравнить с альтернативами

---

> Четырнадцатая статья из цикла «@letar/forms — от боли к декларативным формам». Формы решают не только задачу сбора данных — они отлично подходят для управления состоянием интерфейса.

---

## Проблема: state management своими руками

Страница каталога товаров. Фильтры: поиск, категория, ценовой диапазон, статус. Стандартный подход:

```tsx
// Типичный код управления фильтрами
const [search, setSearch] = useState('')
const [category, setCategory] = useState('all')
const [minPrice, setMinPrice] = useState(0)
const [maxPrice, setMaxPrice] = useState(100000)
const [status, setStatus] = useState<string[]>([])

// URL-синхронизация — ещё 30 строк
useEffect(() => {
  const params = new URLSearchParams()
  if (search) { params.set('search', search) }
  if (category !== 'all') { params.set('category', category) }
  // ...
  router.replace(`?${params}`)
}, [search, category, minPrice, maxPrice, status])

// Инициализация из URL — ещё 20 строк
useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  setSearch(params.get('search') ?? '')
  setCategory(params.get('category') ?? 'all')
  // ...
}, [])

// Сброс — ещё 10 строк
function resetFilters() {
  setSearch('')
  setCategory('all')
  setMinPrice(0)
  setMaxPrice(100000)
  setStatus([])
}
```

80 строк на логику, которая не относится к бизнесу. И это без валидации и типизации.

---

## Решение: форма без submit

TanStack Form (ядро `@letar/forms`) — это subscription-based state machine. Форма не обязана заканчиваться кнопкой «Отправить». Она может просто хранить состояние и позволять подписываться на него.

```tsx
import { FilterSchema } from './_schemas/filter.schema'

const defaultFilters = {
  search: '',
  category: 'all',
  minPrice: 0,
  maxPrice: 100000,
  status: [] as string[],
}

function CatalogPage() {
  return (
    <Form
      schema={FilterSchema}
      initialValue={defaultFilters}
      onSubmit={async () => {}} // форма без реального submit
    >
      <HStack mb={4}>
        <Form.Field.String name="search" placeholder="Поиск..." />
        <Form.Select.Category name="category" />
        <Form.Field.RangeSlider name="minPrice" min={0} max={100000} />
        <Form.Field.MultiSelect name="status" options={statusOptions} />
        <Form.Button.Reset>Сбросить</Form.Button.Reset>
      </HStack>

      {/* ProductList получает актуальные фильтры при каждом изменении */}
      <Form.Subscribe>{(filters) => <ProductList filters={filters} />}</Form.Subscribe>
    </Form>
  )
}
```

Что изменилось: нет `useState`, нет `useEffect`, нет разрозненных обработчиков. Форма — единственный источник истины.

---

## Form.Subscribe: реактивная подписка

`Form.Subscribe` — render prop, который перерендеривается при **любом** изменении формы:

```tsx
<Form.Subscribe>
  {(values) => (
    <Text>
      Найдено товаров в категории «{values.category}»: {/* запрос к API */}
    </Text>
  )}
</Form.Subscribe>
```

Для подписки на **отдельные поля** — `useTypedFormSubscribe`. Компонент перерендерится только при изменении указанных полей:

```tsx
function ActiveFiltersBar() {
  const { value } = useTypedFormSubscribe(['search', 'category', 'status'])

  const activeCount = [value.search !== '', value.category !== 'all', value.status.length > 0].filter(Boolean).length

  if (activeCount === 0) { return null }

  return <Badge colorScheme="blue">Фильтры активны: {activeCount}</Badge>
}
```

Этот компонент живёт **вне** дерева `<Form>` и подписывается через контекст — поэтому его можно разместить в хедере страницы.

---

## Debounce для поиска

Текстовый поиск не должен стрелять запросом на каждую букву. Паттерн с `Form.Watch`:

```tsx
function CatalogPage() {
  const [debouncedSearch, setDebouncedSearch] = useState('')

  return (
    <Form schema={FilterSchema} initialValue={defaultFilters} onSubmit={async () => {}}>
      <Form.Field.String name="search" placeholder="Поиск..." />

      {/* Дебаунс через Form.Watch */}
      <Form.Watch
        field="search"
        onChange={(value) => {
          clearTimeout((window as any).__searchTimer)
          ;(window as any).__searchTimer = setTimeout(() => {
            setDebouncedSearch(String(value))
          }, 300)
        }}
      />

      <Form.Subscribe>{(filters) => <ProductList filters={{ ...filters, search: debouncedSearch }} />}</Form.Subscribe>
    </Form>
  )
}
```

> **Планируется:** `<Form.Subscribe debounce={300}>` — встроенный debounce без лишнего кода. Следите за обновлениями.

---

## URL-синхронизация: персистентные фильтры

Фильтры должны сохраняться в URL — чтобы страница пережила перезагрузку и пользователь мог поделиться ссылкой.

### Инициализация из URL

`useUrlPrefill` считывает параметры при маунте:

```tsx
import { useUrlPrefill } from '@letar/forms'

function CatalogPage() {
  const prefilled = useUrlPrefill({
    fields: ['search', 'category', 'minPrice', 'maxPrice', 'status'],
    schema: FilterSchema, // валидация значений из URL
  })

  return (
    <Form schema={FilterSchema} initialValue={{ ...defaultFilters, ...prefilled }} onSubmit={async () => {}}>
      {/* ... */}
    </Form>
  )
}
```

### Запись в URL при изменении

Сейчас запись в URL делается вручную через `Form.Subscribe`:

```tsx
import { useRouter } from 'next/navigation'

function FilterUrlSync() {
  const router = useRouter()

  return (
    <Form.Subscribe>
      {(values) => {
        // Синхронизируем URL при изменении фильтров
        const params = new URLSearchParams()
        if (values.search) { params.set('search', String(values.search)) }
        if (values.category !== 'all') { params.set('category', String(values.category)) }
        if (values.minPrice !== 0) { params.set('minPrice', String(values.minPrice)) }
        if (values.status?.length) {
          ;(values.status as string[]).forEach((s) => params.append('status', s))
        }

        // Используем useEffect через render trick
        useEffect(() => {
          router.replace(`?${params}`, { scroll: false })
        }, [params.toString()])

        return null
      }}
    </Form.Subscribe>
  )
} // Использование:

<Form schema={FilterSchema} initialValue={{ ...defaultFilters, ...prefilled }} onSubmit={async () => {}}>
  <FilterUrlSync />
  {/* поля */}
</Form>
```

> **Планируется:** `useFormUrlSync(schema, { debounce: 300, fields: [...] })` — хук с двусторонней синхронизацией из коробки.

---

## Панель настроек с Apply/Cancel

Другой паттерн: пользователь меняет настройки, нажимает «Применить» — изменения вступают в силу. «Отмена» — всё откатывается к предыдущему состоянию.

```tsx
interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  language: 'ru' | 'en'
  notifications: boolean
  itemsPerPage: number
}

function SettingsPanel({ settings, onSave }: { settings: AppSettings; onSave: (s: AppSettings) => void }) {
  return (
    <Form
      schema={SettingsSchema}
      initialValue={settings}
      onSubmit={async (values) => {
        // Здесь submit нужен — применяем настройки
        await onSave(values)
        toast.success('Настройки сохранены')
      }}
    >
      <Form.Field.NativeSelect
        name="theme"
        label="Тема"
        options={[
          { value: 'light', label: 'Светлая' },
          { value: 'dark', label: 'Тёмная' },
          { value: 'system', label: 'Системная' },
        ]}
      />
      <Form.Field.NativeSelect
        name="language"
        label="Язык"
        options={[
          { value: 'ru', label: 'Русский' },
          { value: 'en', label: 'English' },
        ]}
      />
      <Form.Field.Switch name="notifications" label="Уведомления" />
      <Form.Field.Number name="itemsPerPage" label="Элементов на странице" min={10} max={100} step={10} />

      {/* isDirty показывает, есть ли несохранённые изменения */}
      <Form.Subscribe>
        {(_, formState) => (
          <HStack mt={4}>
            <Form.Button.Submit isDisabled={!formState.isDirty}>Применить</Form.Button.Submit>
            <Form.Button.Reset isDisabled={!formState.isDirty}>Отмена</Form.Button.Reset>
          </HStack>
        )}
      </Form.Subscribe>
    </Form>
  )
}
```

`Form.Button.Reset` сбрасывает форму к `initialValue` — то есть к тем настройкам, что были при открытии панели.

---

## Dashboard-контролы

Форма хорошо подходит для управления dashboard: выбор периода, группировки, метрик.

```tsx
const DashboardControls = z.object({
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']),
  groupBy: z.enum(['day', 'week', 'month']),
  metrics: z.array(z.enum(['revenue', 'orders', 'users', 'conversion'])),
  compareWith: z.enum(['previous_period', 'previous_year', 'none']),
})

function DashboardPage() {
  const prefilled = useUrlPrefill({
    fields: ['period', 'groupBy', 'metrics', 'compareWith'],
    schema: DashboardControls,
  })

  return (
    <Form
      schema={DashboardControls}
      initialValue={{ period: 'month', groupBy: 'day', metrics: ['revenue'], compareWith: 'none', ...prefilled }}
      onSubmit={async () => {}}
    >
      <HStack wrap="wrap" mb={6}>
        <Form.Field.SegmentedControl name="period" options={periodOptions} />
        <Form.Field.NativeSelect name="groupBy" label="Группировать по" options={groupByOptions} />
        <Form.Field.CheckboxGroup name="metrics" options={metricOptions} />
        <Form.Field.NativeSelect name="compareWith" label="Сравнить с" options={compareOptions} />
      </HStack>

      <Form.Subscribe>{(controls) => <DashboardCharts controls={controls} />}</Form.Subscribe>
    </Form>
  )
}
```

Все контролы dashboard в одном стейте, URL сериализуется автоматически, можно передавать ссылку с конкретным видом.

---

## Форма vs useState: когда что выбрать

| Сценарий                        | Рекомендация                                              |
| ------------------------------- | --------------------------------------------------------- |
| 1-2 независимых фильтра         | `useState` — проще                                        |
| 3+ взаимосвязанных фильтра      | `Form` — единый стейт, сброс кнопкой                      |
| Фильтры + URL-синхронизация     | `Form` + `useUrlPrefill`                                  |
| Настройки с Apply/Cancel        | `Form` — `isDirty` + `reset()` из коробки                 |
| Dashboard-контролы              | `Form` — валидация + URL + единый источник                |
| Поисковая строка (только текст) | `useState` + debounce — не нужна вся инфраструктура формы |

Ключевой вопрос: **нужна ли валидация, сброс к дефолту или URL-синхронизация?** Если хотя бы одно — форма оправдана.

---

## Что появится в следующих версиях

Мы описали несколько паттернов, которые сейчас требуют ручного кода. Они войдут в ближайшие релизы:

- **`useFormUrlSync`** — двусторонняя URL-синхронизация с debounce из коробки
- **`Form.Subscribe debounce`** — встроенный debounce для подписки
- **`onSubmit` опциональный** — для no-submit форм не нужен `onSubmit={async () => {}}`
- **`useFormRef`** — доступ к инстансу формы снаружи дерева (для кнопки «Сбросить» в тулбаре)
- **`useActiveFiltersCount`** — счётчик активных фильтров для бейджей

---

## Итог

Форма — это не только UI для ввода данных. Это state machine с валидацией, подпиской, сбросом и историей. Когда у вас 3+ взаимосвязанных элемента управления — рассмотрите `Form` вместо разрозненных `useState`. Вы получите:

- **Единый источник истины** — все контролы в одном стейте
- **Бесплатный сброс** — `Form.Button.Reset` возвращает к `initialValue`
- **Валидацию** — Zod-схема проверит, что из URL пришли корректные значения
- **Типизацию** — `useTypedFormSubscribe` даёт типы без кастов
- **URL-персистентность** — через `useUrlPrefill` + `router.replace`
