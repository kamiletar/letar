# Form-level компоненты

Компоненты для управления структурой и поведением формы.

## Обзор компонентов

| Компонент                           | Описание                                             |
| ----------------------------------- | ---------------------------------------------------- |
| `Form`                              | Корневой компонент формы                             |
| `Form.Group`                        | Группа полей с dot-notation путём                    |
| `Form.Group.List`                   | Автоитерация по массиву                              |
| `Form.Group.List.Button.Add`        | Кнопка добавления элемента                           |
| `Form.Group.List.Button.Remove`     | Кнопка удаления элемента                             |
| `Form.Group.List.Button.DragHandle` | Ручка для перетаскивания (DnD)                       |
| `Form.Button.Submit`                | Кнопка отправки с автоматическим loading             |
| `Form.Button.Reset`                 | Кнопка сброса формы                                  |
| `Form.Watch`                        | Отслеживание изменений поля (побочные эффекты)       |
| `Form.When`                         | Условный рендеринг полей                             |
| `Form.DirtyGuard`                   | Предупреждение при уходе с несохранённой формой      |
| `Form.Errors`                       | Сводка всех ошибок валидации                         |
| `Form.DebugValues`                  | Интерактивный JSON-инспектор значений формы          |
| `Form.InfoBlock`                    | Информационный блок (info/warning/error/success/tip) |
| `Form.Divider`                      | Разделитель секций с опциональной меткой             |
| `Form.Field.Hidden`                 | Скрытое поле (не рендерится, только в state)         |
| `Form.Field.Calculated`             | Вычисляемое поле с автопересчётом                    |
| `Form.Steps`                        | Контейнер для мультистеп форм                        |

---

## Form.When — условный рендеринг (v0.24.0+)

Компонент для показа/скрытия полей в зависимости от значений других полей:

```tsx
<Form initialValue={data} onSubmit={handleSubmit}>
  <Form.Field.Select
    name="type"
    label="Тип клиента"
    options={[
      { label: 'Физлицо', value: 'individual' },
      { label: 'Компания', value: 'company' },
    ]}
  />

  {/* Показывать только для компаний */}
  <Form.When field="type" is="company">
    <Form.Field.String name="companyName" label="Название компании" />
    <Form.Field.String name="inn" label="ИНН" />
  </Form.When>
</Form>
```

**Условия:**

| Prop        | Описание                   | Пример                            |
| ----------- | -------------------------- | --------------------------------- |
| `is`        | Точное совпадение          | `is="company"`                    |
| `isNot`     | Не равно                   | `isNot={true}`                    |
| `in`        | Значение в массиве         | `in={['admin', 'moderator']}`     |
| `notIn`     | Значение не в массиве      | `notIn={['guest']}`               |
| `condition` | Кастомная функция          | `condition={(v) => v >= 18}`      |
| `fallback`  | Контент если условие ложно | `fallback={<Text>Upgrade</Text>}` |

```tsx
// Кастомное условие
<Form.When field="age" condition={(age) => age >= 18}>
  <Form.Field.Checkbox name="adultContent" label="Показывать 18+ контент" />
</Form.When>

// С fallback
<Form.When field="isPremium" is={true} fallback={<Text>Доступно в Premium</Text>}>
  <Form.Field.Select name="premiumTheme" options={themes} />
</Form.When>

// Внутри Form.Group (относительные пути)
<Form.Group name="settings">
  <Form.Field.Switch name="notifications" label="Уведомления" />
  <Form.When field="notifications" is={true}>
    <Form.Field.Select name="frequency" options={frequencies} />
  </Form.When>
</Form.Group>
```

---

## Form.Watch — отслеживание изменений (v0.61.0+)

Renderless компонент для реактивных побочных эффектов при изменении значения поля. Учитывает контекст `Form.Group` — пути резолвятся автоматически.

```tsx
<Form initialValue={{ name: '', slug: '' }} onSubmit={save}>
  <Form.Field.String name="name" label="Название" />
  <Form.Field.String name="slug" label="Slug" />

  <Form.Watch
    field="name"
    onChange={(value, { setFieldValue }) => {
      setFieldValue('slug', transliterate(String(value)))
    }}
  />

  <Form.Button.Submit />
</Form>
```

### Props

| Prop       | Тип                                             | Описание                       |
| ---------- | ----------------------------------------------- | ------------------------------ |
| `field`    | `string`                                        | Имя поля (относительно группы) |
| `onChange` | `(value: unknown, api: FieldChangeApi) => void` | Callback при изменении         |

### FieldChangeApi

| Метод           | Описание                        |
| --------------- | ------------------------------- |
| `setFieldValue` | Установить значение любого поля |
| `getFieldValue` | Получить значение поля          |
| `getValues`     | Все текущие значения формы      |

### Альтернатива: onFieldChange prop

Тот же функционал доступен как prop на `<Form>` — удобнее для простых случаев:

```tsx
<Form
  initialValue={{ name: '', slug: '' }}
  onSubmit={save}
  onFieldChange={{
    name: (value, { setFieldValue }) => {
      setFieldValue('slug', transliterate(String(value)))
    },
  }}
>
  <Form.Field.String name="name" />
  <Form.Field.String name="slug" />
</Form>
```

---

## Smart Autofill — автоматический autocomplete (v0.62.0+)

Поля автоматически получают HTML `autocomplete` атрибуты по имени — +30% конверсии (Google), WCAG 1.3.5.

```tsx
<Form.Field.String name="email" />      // → autocomplete="email"
<Form.Field.String name="firstName" />   // → autocomplete="given-name"
<Form.Field.String name="city" />        // → autocomplete="address-level2"
<Form.Field.Password name="password" />  // → autocomplete="current-password"
```

### Приоритет

1. Prop `autoComplete` (наивысший)
2. `.meta({ ui: { autocomplete: '...' } })` из Zod схемы
3. Авто-определение по имени поля

### Override через meta

```tsx
z.string().meta({ ui: { autocomplete: 'street-address' } }) // Явное значение
z.string().meta({ ui: { autocomplete: 'off' } }) // Отключить
```

### Поддерживаемые маппинги

`email`, `phone`/`tel`, `firstName`/`lastName`, `name`, `password`/`newPassword`, `address`/`street`, `city`, `zip`/`postalCode`, `country`, `company`/`organization`, `username` — и другие (30+ маппингов).

---

## Form.InfoBlock — информационный блок (v0.63.0+)

Компонент для отображения info/warning/error/success/tip сообщений внутри формы. На базе Chakra UI Alert.

```tsx
<Form.InfoBlock variant="info" title="Важно">
  Заполните все поля для получения скидки 10%.
</Form.InfoBlock>
```

**Варианты:**

| Variant   | Цвет    | Назначение         |
| --------- | ------- | ------------------ |
| `info`    | Синий   | Общая информация   |
| `warning` | Оранж   | Предупреждения     |
| `error`   | Красный | Критические ошибки |
| `success` | Зелёный | Подтверждения      |
| `tip`     | Бирюза  | Полезные советы    |

**Props:**

| Prop         | Тип         | Default    | Описание                |
| ------------ | ----------- | ---------- | ----------------------- |
| `variant`    | `string`    | `'info'`   | Вариант отображения     |
| `title`      | `ReactNode` | —          | Заголовок блока         |
| `children`   | `ReactNode` | —          | Содержимое              |
| `appearance` | `string`    | `'subtle'` | Визуальный стиль Chakra |
| `size`       | `string`    | `'md'`     | Размер                  |

```tsx
// Условное отображение
<Form.When field="type" is="company">
  <Form.InfoBlock variant="warning">Для компаний требуется ИНН и юридический адрес.</Form.InfoBlock>
</Form.When>
```

---

## Form.Divider — разделитель секций (v0.63.0+)

Горизонтальная линия с опциональной текстовой меткой и иконкой. На базе Chakra UI Separator.

```tsx
<Form.Divider label="Контактная информация" />
```

**Props:**

| Prop           | Тип         | Default   | Описание                |
| -------------- | ----------- | --------- | ----------------------- |
| `label`        | `ReactNode` | —         | Текст на разделителе    |
| `icon`         | `ReactNode` | —         | Иконка перед текстом    |
| `variant`      | `string`    | `'solid'` | solid / dashed / dotted |
| `size`         | `string`    | `'xs'`    | Толщина линии           |
| `colorPalette` | `string`    | `'gray'`  | Цветовая палитра        |

```tsx
// С иконкой
import { LuPhone } from 'react-icons/lu'
<Form.Divider label="Телефоны" icon={<LuPhone />} />

// Пунктирный
<Form.Divider variant="dashed" />
```

---

## Form.Field.Hidden — скрытое поле (v0.63.0+)

Не рендерится в DOM, но участвует в form state. Значение синхронизируется реактивно при изменении `value` prop.

```tsx
<Form.Field.Hidden name="utm_source" value={searchParams.get('utm_source')} />
<Form.Field.Hidden name="referralCode" value="PARTNER2026" />
```

**Props:**

| Prop    | Тип       | Описание                                  |
| ------- | --------- | ----------------------------------------- |
| `name`  | `string`  | Имя поля в форме                          |
| `value` | `unknown` | Значение (синхронизируется при изменении) |

```tsx
// Динамическое значение
const [geo, setGeo] = useState(null)
useEffect(() => { detectLocation().then(setGeo) }, [])
<Form.Field.Hidden name="location" value={geo} />
```

---

## Form.Steps с анимациями (v0.27.0+)

Мультистеп формы с slide анимациями между шагами:

```tsx
<Form initialValue={data} onSubmit={handleSubmit}>
  <Form.Steps animated animationDuration={0.3} validateOnNext linear>
    <Form.Steps.Indicator />

    <Form.Steps.Step title="Personal" description="Your details">
      <Form.Field.String name="firstName" />
      <Form.Field.String name="lastName" />
    </Form.Steps.Step>

    <Form.Steps.Step title="Contact">
      <Form.Field.String name="email" />
    </Form.Steps.Step>

    <Form.Steps.Navigation />
  </Form.Steps>
</Form>
```

**Props:**

- `animated` — включить slide анимации
- `animationDuration` — длительность анимации в секундах (по умолчанию 0.3)
- `validateOnNext` — валидировать поля текущего шага перед переходом
- `linear` — запретить пропуск шагов

### Условные шаги (when)

```tsx
<Form.Steps.Step title="Company Info" when={{ field: 'type', is: 'company' }}>
  <Form.Field.String name="companyName" />
</Form.Steps.Step>
```

### Callbacks между шагами

```tsx
<Form.Steps.Step
  title="Profile"
  onEnter={() => console.log('Вошли на шаг')}
  onLeave={async (direction) => {
    const canLeave = await validateAsync()
    return canLeave  // false отменяет переход
  }}
>
```

### Segment (сегментирование данных)

```tsx
<Form.Steps.Step title="Profile" segment="profile">
  <Form.Field.String name="firstName" /> // → profile.firstName
  <Form.Field.String name="lastName" /> // → profile.lastName
</Form.Steps.Step>
```

### Persistence прогресса шагов

```tsx
<Form.Steps
  stepPersistence={{
    key: 'onboarding',
    debounceMs: 500,
  }}
>
```

### Skip и программный submit

```tsx
<Form.Steps.Navigation
  showSkip
  skipLabel="Пропустить"
  onSkip={async () => {
    await skipOnboardingAction()
    return true
  }}
/>
```

### useFormStepsContext (v0.32.0+)

Хук для программного управления шагами:

```tsx
function CustomNavigation() {
  const { goToNext, goToPrev, skipToEnd, triggerSubmit, clearStepPersistence } = useFormStepsContext()

  return <Button onClick={() => skipToEnd()}>Пропустить всё</Button>
}
```

---

## Form.Errors — сводка ошибок (v0.35.0+)

Компонент для отображения всех ошибок валидации в одном месте:

```tsx
<Form initialValue={data} onSubmit={handleSubmit}>
  <Form.Field.String name="title" />
  <Form.Field.Number name="price" />

  <Form.Errors title="Исправьте ошибки:" />

  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```

**Props:**

| Prop    | Тип         | Default                              | Описание               |
| ------- | ----------- | ------------------------------------ | ---------------------- |
| `title` | `ReactNode` | `"Please fix the following errors:"` | Заголовок блока ошибок |

Компонент скрывается когда ошибок нет.

---

## Form.DebugValues — JSON-инспектор значений (v0.55.0+)

Интерактивное дерево текущих значений формы. По умолчанию скрыт в production.

```tsx
<Form initialValue={data} onSubmit={handleSubmit}>
  <Form.Field.String name="title" />
  <Form.Field.Number name="price" />
  <Form.Button.Submit />

  <Form.DebugValues />
</Form>
```

**Props:**

| Prop               | Тип       | Default       | Описание                              |
| ------------------ | --------- | ------------- | ------------------------------------- |
| `title`            | `string`  | `Form Values` | Заголовок блока                       |
| `collapsed`        | `number`  | `2`           | Глубина раскрытия дерева              |
| `showInProduction` | `boolean` | `false`       | Показывать в production (для отладки) |

Использует `@uiw/react-json-view` для рендеринга. Обновляется в реальном времени при вводе.
Автоматически переключается между тёмной и светлой темой вместе с color mode приложения.

### Проп `debug` на Form (v0.56.0+)

Вместо ручного добавления `<Form.DebugValues />` можно использовать проп `debug`:

```tsx
// Dev only (скрыт в production)
<Form debug initialValue={data} onSubmit={save}>
  <Form.Field.String name="title" />
  <Form.Button.Submit />
</Form>

// Принудительно и на production
<Form debug="force" initialValue={data} onSubmit={save}>...</Form>
```

Работает с `Form`, `Form.FromSchema` и `createForm()`.

---

## Form Middleware (v0.41.0+)

Перехватчики для обработки событий формы:

```tsx
<Form
  initialValue={data}
  onSubmit={handleSubmit}
  middleware={{
    beforeSubmit: async (data) => {
      if (!(await validateWithServer(data))) { return undefined // отмена
       }
      return { ...data, timestamp: Date.now() }
    },

    afterSuccess: (data) => {
      toaster.success({ title: 'Сохранено!' })
      router.push('/list')
    },

    onError: (error) => {
      toaster.error({ title: error.message })
      logError(error)
    },
  }}
>
  ...
</Form>
```

---

## Режимы валидации (v0.27.0+)

Настраиваемые режимы валидации формы:

```tsx
// Валидация при потере фокуса
<Form validateOn="blur" ...>

// Комбинация режимов
<Form validateOn={['blur', 'submit']} ...>

// Доступные режимы: 'change' | 'blur' | 'submit' | 'mount'
```

---

## Глобальное disabled/readOnly (v0.27.0+)

Отключение или режим только для чтения для всей формы:

```tsx
// Все поля отключены
<Form disabled ...>
  <Form.Field.String name="name" />
</Form>

// Все поля только для чтения
<Form readOnly ...>
  <Form.Field.String name="name" />
</Form>
```

Локальный prop поля имеет приоритет над глобальным:

```tsx
<Form disabled>
  <Form.Field.String name="name" /> {/* disabled */}
  <Form.Field.String name="email" disabled={false} /> {/* НЕ disabled */}
</Form>
```

---

## localStorage Persistence (v0.16.0+)

Автоматическое сохранение данных формы с диалогом восстановления. Принцип —
[Ководство §188](https://www.artlebedev.ru/kovodstvo/sections/188/): пользовательский ввод
священен, закрытие вкладки/краш/перезагрузка не должны его стирать. Для любой нетривиальной
формы (создание/редактирование сущности, длинная форма — не одноразовый auth-экран) подключай
`persistence` по умолчанию, не только по напоминанию.

```tsx
<Form
  initialValue={data}
  onSubmit={handleSubmit}
  persistence={{
    key: 'unique-form-key',
    debounceMs: 500,
    dialogTitle: 'Восстановить?',
    dialogDescription: 'Найдены сохранённые данные',
    restoreButtonText: 'Восстановить',
    discardButtonText: 'Начать заново',
  }}
>
  ...
</Form>
```

### ⛔ `excludeFields` — чувствительные поля никогда не попадают в снимок (v2.4.0+)

Пароль, номер карты, CVV, срок действия и другие auth/платёжные данные **не должны** сохраняться
в localStorage, даже если остальная форма персистится. `excludeFields` вычищает их из объекта
перед сериализацией — исключённые поля просто отсутствуют в `savedData` при восстановлении,
форма их не перезаписывает и оставляет как есть в `initialValue`:

```tsx
<Form
  initialValue={data}
  onSubmit={handleSubmit}
  persistence={{
    key: 'payment-form',
    excludeFields: ['cardNumber', 'cvv', 'expiryDate'],
  }}
>
  ...
</Form>
```

Тот же параметр доступен и на низкоуровневом хуке `useFormPersistence` напрямую (если форма не
использует компонент `<Form>`, а собирает persistence вручную).

---

## useFieldActions (v0.32.0+)

Хук для императивных действий с полями:

```tsx
function CityField() {
  const { value, onChange, setError, clearError } = useFieldActions('city')

  const handleDetect = async () => {
    const location = await detectLocation()
    if (location.error) {
      setError(location.error)
    } else {
      onChange(location.city)
    }
  }

  return (
    <HStack>
      <Form.Field.String name="city" />
      <Button onClick={handleDetect}>
        <LuMapPin />
      </Button>
    </HStack>
  )
}
```

---

## Form.Captcha — Защита от ботов (v0.77.0+)

CAPTCHA интеграция (Cloudflare Turnstile, reCAPTCHA, hCaptcha, Yandex SmartCaptcha):

```tsx
<Form.Captcha provider="turnstile" siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
```

Значение токена автоматически добавляется в form state. Серверная верификация через `verifyCaptchaToken()`.

### Yandex SmartCaptcha (v1.4.4+)

Для приложений, где данные не должны покидать РФ (152-ФЗ) — Turnstile/reCAPTCHA/hCaptcha
передают IP и телеметрию браузера на зарубежные серверы, SmartCaptcha хранит их в РФ:

```tsx
<Form.Captcha provider="smartcaptcha" siteKey={process.env.NEXT_PUBLIC_SMARTCAPTCHA_SITE_KEY} />
```

```typescript
// Server Action
import { verifyCaptcha } from '@letar/forms/captcha/server'

const result = await verifyCaptcha(token, {
  provider: 'smartcaptcha',
  secretKey: process.env.SMARTCAPTCHA_SECRET_KEY!,
})
```

⚠️ У SmartCaptcha другой формат ответа сервера верификации (`{ status: 'ok' | 'failed', message,
host }` вместо `{ success, 'error-codes', hostname }`) и другие имена полей запроса (`secret` +
`token` + `ip` вместо `secret` + `response` + `remoteip`) — `verifyCaptcha()` нормализует это
прозрачно, возвращаемый `CaptchaVerifyResult` одинаковый для всех провайдеров. Тема виджета
(`theme`) SmartCaptcha не поддерживает — параметр принимается, но игнорируется.

---

## Form.Analytics.Panel — Dev-панель аналитики (v0.80.0+)

Live-панель с метриками заполнения формы (только для development):

```tsx
import { useFormAnalytics, AnalyticsPanel } from '@letar/forms/analytics'

const analytics = useFormAnalytics({ formId: 'my-form', adapters: [umamiAdapter] })

<AnalyticsPanel analytics={analytics} position="bottom-right" />
```

Подробнее: [analytics.md](./analytics.md)

---

## Form.History.Controls — Undo/Redo (v0.80.0+)

Кнопки отмены/повтора для длинных форм (Ctrl+Z / Ctrl+Shift+Z):

```tsx
import { useFormHistory } from '@letar/forms'

const { undo, redo, canUndo, canRedo } = useFormHistory(form)

<Form.History.Controls />
```

---

## Form.Comparison — Diff-view (v0.80.0+)

Сравнение двух версий данных формы (было → стало):

```tsx
<Form.Comparison
  original={oldData}
  current={newData}
  schema={UserSchema}
  onlyChanged // показать только изменённые поля
/>
```

---

## Form.ReadOnlyView — Режим просмотра (v0.80.0+)

Отображение данных формы в режиме только чтение:

```tsx
<Form.ReadOnlyView data={user} schema={UserSchema} compact />
```

Автоматически выбирает правильное отображение для каждого типа поля (даты форматируются, boolean → чекбоксы, enum → labels).

---

## Form.Skeleton — Loading state (v0.80.0+)

Автоматический skeleton из Zod-схемы:

```tsx
// Вариант 1: отдельный компонент
<Form.Skeleton schema={UserSchema} showSubmit />

// Вариант 2: внутри формы
<Form schema={UserSchema} loading={true} initialValue={data} onSubmit={save}>
  ...
</Form>
```

---

## Form.DependsOn — Каскадный рендеринг (v0.80.0+)

Рендеринг разных наборов полей в зависимости от значения другого поля:

```tsx
<Form.DependsOn
  field="type"
  cases={{
    person: <PersonFields />,
    company: <CompanyFields />,
  }}
/>
```

Более декларативная альтернатива `Form.When` для паттерна "одно из многих".

---

## Связанные документы

- [README.md](../README.md) — обзор библиотеки
- [fields.md](./fields.md) — Field компоненты
- [analytics.md](./analytics.md) — Аналитика форм
- [schema-generation.md](./schema-generation.md) — генерация из схемы

---

**Последнее обновление:** 2026-04-04
