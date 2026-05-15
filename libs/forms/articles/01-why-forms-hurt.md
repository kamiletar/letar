# Формы в React: 2 поля = 48 строк. Почему в 2026 это всё ещё боль?

> **Уровень сложности:** Простой

**TL;DR:**

- Логин-форма на vanilla React — 48 строк. На @letar/forms — 8. Функциональность одинаковая.
- 9 повторяющихся проблем с формами не решает ни одна из 5 популярных библиотек полностью.
- Декларативный подход (схема = источник правды) устраняет большинство из них.

**Кому полезно:**

- Junior: поймёте, почему ваши формы разрастаются и как этого избежать
- Middle: сравните подходы 5 библиотек и увидите, что у каждой есть слабое место
- Senior: оцените архитектуру Compound Components + Zod .meta() как альтернативу JSON-конфигам

---

> Первая статья из цикла «@letar/forms — от боли к декларативным формам». 13 статей о том, как мы построили form-библиотеку на 50+ компонентов, отделили вёрстку от логики и пришли к open-source.

---

## 2 поля, 48 строк: начнём честно

Вы открываете новый проект, создаёте первый компонент — и через 15 минут уже пишете форму. Email, пароль. Два поля. Казалось бы, что может пойти не так?

```tsx
function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = () => {
    const newErrors = {}
    if (!email) newErrors.email = 'Обязательное поле'
    else if (!/\S+@\S+/.test(email)) newErrors.email = 'Некорректный email'
    if (!password) newErrors.password = 'Обязательное поле'
    else if (password.length < 8) newErrors.password = 'Минимум 8 символов'
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setIsSubmitting(true)
    try {
      await api.login({ email, password })
    } catch (err) {
      setErrors({ form: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>
      <div>
        <label htmlFor="password">Пароль</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {errors.password && <span className="error">{errors.password}</span>}
      </div>
      {errors.form && <div className="error">{errors.form}</div>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Загрузка...' : 'Войти'}
      </button>
    </form>
  )
}
```

48 строк на два поля. И это без:

- Валидации на blur
- Показа/скрытия пароля
- Accessibility (aria-атрибуты)
- Типизации TypeScript
- Сброса формы после отправки
- Обработки серверных ошибок на конкретных полях

Добавьте всё это — и вы легко перешагнёте за 100 строк. На **два поля**.

А теперь представьте форму из 20 полей. С условным отображением. С массивами. С мультистепом. С оффлайн-режимом. Каждый, кто работал с формами в продакшене, знает это чувство: «Ну не может же быть, что в 2026 году нет нормального решения».

---

## Ландшафт: 5 библиотек, 5 компромиссов

React не даёт форм как first-class примитив. Это создало экосистему библиотек, каждая из которых решает проблему по-своему:

### React Hook Form — король по инерции

**44K+ звёзд на GitHub, 15M+ скачиваний в неделю.**

Подход: uncontrolled-компоненты, минимальные ре-рендеры, `register` + `ref`.

```tsx
const { register, handleSubmit, formState: { errors } } = useForm()

<input {...register('email', { required: true, pattern: /\S+@\S+/ })} />
{errors.email && <span>Некорректный email</span>}
```

**Плюсы:** Производительность, огромное сообщество, Zod-интеграция через resolver.
**Минусы:** Типобезопасность — номинальная. `register('emial')` (опечатка) — рантайм-ошибка, не компиляторная. API строковых имён полей — наследие эпохи до TypeScript-first.

### Formik — уходящая эпоха

**34K+ звёзд, но тренд на спад: 3M скачиваний vs 15M у RHF.**

Подход: controlled-компоненты, `<Field>` + `<ErrorMessage>`, Yup-валидация.

```tsx
<Formik initialValues={{ email: '' }} validationSchema={yupSchema} onSubmit={save}>
  <Form>
    <Field name="email" type="email" />
    <ErrorMessage name="email" />
  </Form>
</Formik>
```

**Плюсы:** Простой ментальный модель, хорошая документация.
**Минусы:** Ре-рендеры на каждый keypress, не обновлялся активно, Yup вместо Zod.

### TanStack Form — новая надежда

**6K+ звёзд, быстро растёт. +8 позиций год-к-году в рейтингах.**

Подход: TypeScript-first, фреймворк-агностик, полная типобезопасность путей полей.

```tsx
const form = useForm({
  defaultValues: { email: '' },
  onSubmit: async ({ value }) => { /* ... */ },
})

<form.Field
  name="email"
  children={(field) => (
    <input
      value={field.state.value}
      onChange={(e) => field.handleChange(e.target.value)}
    />
  )}
/>
```

**Плюсы:** `DeepKeys<FormValues>` — опечатка в имени поля = ошибка компиляции. Работает с React, Vue, Solid, Angular.
**Минусы:** Молодая экосистема, verbose API (каждое поле — render-prop), кривая обучения.

### Conform — серверный подход

**2.5K звёзд.** Для Remix/Next.js: progressive enhancement, работает без JavaScript.

### react-jsonschema-form — конфиг-машина

Генерирует формы из JSON Schema. Мощно, но негибко: кастомизация — боль.

### Сводная таблица: 9 проблем и кто их решает

| Проблема                  | RHF | Formik | TanStack | Conform | RJSF | @letar/forms |
| ------------------------- | --- | ------ | -------- | ------- | ---- | ------------ |
| 1. Дублирование валидации | ~   | ~      | ~        | ~       | +    | **+**        |
| 2. Бойлерплейт            | +   | +      | ~        | +       | +    | **+**        |
| 3. Ре-рендеры             | +   | -      | +        | +       | ~    | **+**        |
| 4. Типобезопасность       | ~   | -      | +        | ~       | -    | **+**        |
| 5. Расширяемость          | +   | +      | +        | ~       | ~    | **+**        |
| 6. Вложенные пути         | ~   | ~      | +        | ~       | +    | **+**        |
| 7. Консистентность стилей | -   | -      | -        | -       | +    | **+**        |
| 8. Submit-состояние       | ~   | ~      | +        | +       | ~    | **+**        |
| 9. Accessibility          | -   | -      | -        | ~       | ~    | **+**        |

`+` решает, `~` частично, `-` не решает

<details>
<summary>Что такое Compound Components (если не знакомы)</summary>

**Compound Components** — паттерн React, при котором родительский компонент управляет состоянием, а дочерние компоненты используют это состояние через Context. Пример из стандартной библиотеки — `<select>` и `<option>`: `<select>` хранит выбранное значение, `<option>` знает, выбран ли он.

В @letar/forms это `<Form>` (хранит состояние формы) и `<Form.Field.String>`, `<Form.Button.Submit>` и т.д. (обращаются к нему через контекст). Подробнее — в [статье про архитектуру](03-compound-components.md).

</details>

---

## Девять проблем, которые никто не решил целиком

Каждая библиотека сильна в 2-3 аспектах, но ни одна не закрывает все девять:

### 1. Дублирование валидации

Вот типичный код с React Hook Form + Zod:

```tsx
// schema.ts — источник правды для валидации
const schema = z.object({
  email: z.string().email('Некорректный email'),
  name: z.string().min(2, 'Минимум 2 символа').max(100),
})

// form.tsx — но label, placeholder, helperText живут тут
<Controller
  name="email"
  control={control}
  render={({ field, fieldState }) => (
    <FormControl isInvalid={!!fieldState.error}>
      <FormLabel>Email</FormLabel>           {/* ← дублирование */}
      <Input
        placeholder="user@example.com"       {/* ← дублирование */}
        type="email"                         {/* ← знаем из z.email(), но пишем вручную */}
        maxLength={100}                      {/* ← знаем из z.max(100), но пишем вручную */}
        {...field}
      />
      <FormHelperText>Используется для входа</FormHelperText>  {/* ← дублирование */}
      <FormErrorMessage>{fieldState.error?.message}</FormErrorMessage>
    </FormControl>
  )}
/>
```

Три источника правды:

- **Zod:** правила валидации
- **JSX:** label, placeholder, helperText
- **HTML-атрибуты:** type, maxLength, min, max

Измените лимит в Zod — забудете обновить `maxLength`. Или наоборот. Рассинхронизация неизбежна.

### 2. Boilerplate

20% разработчиков называют главной проблемой форм **избыточную сложность**, ещё 15% — **boilerplate**. Каждое поле — это:

- Label
- Input с биндингами
- Обработка ошибок
- Helper text
- Wrapper для стилей

Для формы из 15 полей это 150-200 строк только на обвязку. Бизнес-логики — 0.

### 3. Ре-рендеры

Controlled-компоненты (Formik, ванильный React) перерисовывают всю форму при каждом нажатии клавиши. На форме с 15-20 полями это заметный лаг. Uncontrolled (RHF) решают проблему, но ценой менее предсказуемого поведения.

### 4. Типобезопасность

RHF: `register('emial')` — тишина до рантайма.
TanStack Form решает это через `DeepKeys<T>`, но требует verbose render-props.
Идеал: компиляторная проверка имён полей **без** лишнего кода.

### 5. Расширяемость

Вам нужно поле «выбор города с автоподсказками из DaData». Или «расписание на неделю». Или «drag & drop массив с вложенными группами». Каждая библиотека скажет: «напишите кастомный компонент». Но интеграция с формой, валидацией, типами, стилями — это ваша проблема.

### 6. Вложенные пути — строковый ад

В реальном приложении данные вложенные. Заказ с клиентом, адресом и массивом товаров:

```tsx
// React Hook Form: всё на строках
const { register, control } = useForm<Order>()

// Три уровня вложенности — ручной путь
<input {...register('customer.address.city')} />
<input {...register('customer.address.street')} />

// Массив — ещё веселее
const { fields } = useFieldArray({ control, name: 'items' })

{fields.map((item, index) => (
  <div key={item.id}>
    <input {...register(`items.${index}.product`)} />
    <input {...register(`items.${index}.quantity`)} />
    {/* А если у товара есть вложенные варианты? */}
    <input {...register(`items.${index}.variants.${variantIdx}.size`)} />
    <input {...register(`items.${index}.variants.${variantIdx}.color`)} />
    <input {...register(`items.${index}.variants.${variantIdx}.price`)} />
  </div>
))}
```

`items.${index}.variants.${variantIdx}.price` — это не код, это заклинание. Одна опечатка в любом сегменте — и поле молча перестаёт работать. TypeScript не спасёт: `register()` принимает `string`, а не типизированный путь. Переименовали `variants` в `options` на бэкенде? Удачи с глобальным поиском по шаблонным строкам.

А теперь представьте, что таких путей в форме 30. Каждый — конкатенация из 3-5 сегментов с индексами. Добро пожаловать в отладку.

### 7. Консистентность стилей — ручная обвязка каждого поля

Каждое поле формы — это не просто `<input>`. Это обвязка: label сверху, инпут посередине, ошибка снизу, подсказка, иконка, звёздочка обязательности. И эта обвязка должна быть одинаковой для _всех_ полей в приложении.

```tsx
// Пишете это для КАЖДОГО поля. Каждого.
<FormControl isInvalid={!!errors.email} isRequired>
  <FormLabel htmlFor="email">Email</FormLabel>
  <InputGroup>
    <InputLeftElement>
      <EmailIcon />
    </InputLeftElement>
    <Input id="email" {...register('email')} placeholder="user@example.com" />
  </InputGroup>
  {errors.email
    ? <FormErrorMessage>{errors.email.message}</FormErrorMessage>
    : <FormHelperText>Используется для входа</FormHelperText>}
</FormControl>

// Теперь повторите для password, name, phone, address...
// 15 полей × 12-15 строк обвязки = 200 строк CSS-шаблона
```

Обычно это решают extract-ом в свой `<FormField>` компонент. Но тогда вы _сами_ становитесь автором form-библиотеки — с пропсами, edge-кейсами, и обязанностью поддерживать всё это. Любой новый дизайн-элемент (иконка слева? бейдж «new»? tooltip на label?) — это правка общего компонента, которая может сломать 50 форм.

Генри Форд говорил: «Клиент может получить автомобиль любого цвета — при условии, что этот цвет будет чёрным». В формах работает тот же принцип: настоящая консистентность появляется только тогда, когда обвязка _не копируется_ руками, а зашита в компоненты. Все 40 полей в `@letar/forms` рендерят label, ошибку, подсказку и aria-атрибуты через единый внутренний layout на Chakra UI. Вы не _выбираете_ как обернуть поле — вы получаете одинаковый, протестированный результат. Любой цвет, если это чёрный.

### 8. Состояние отправки — isSubmitting, disabled, loading

Кнопка «Отправить» — проще простого? На самом деле — целый стейт-машина:

```tsx
const [isSubmitting, setIsSubmitting] = useState(false)
const [submitError, setSubmitError] = useState<string | null>(null)
const [isSuccess, setIsSuccess] = useState(false)

const handleSubmit = async (data: FormValues) => {
  setIsSubmitting(true)
  setSubmitError(null)
  setIsSuccess(false)
  try {
    await api.save(data)
    setIsSuccess(true)
    reset() // сброс формы
  } catch (err) {
    if (err.status === 422) {
      // Серверные ошибки валидации — раскидать по полям
      const fieldErrors = err.body.errors
      Object.entries(fieldErrors).forEach(([field, message]) => {
        setError(field, { message }) // если RHF
      })
    } else {
      setSubmitError(err.message)
    }
  } finally {
    setIsSubmitting(false)
  }
} // В JSX:
<button type="submit" disabled={isSubmitting} className={isSubmitting ? 'btn-loading' : 'btn-primary'}>
  {isSubmitting
    ? (
      <>
        <Spinner size="sm" /> Отправка...
      </>
    )
    : isSuccess
    ? (
      <>
        <CheckIcon /> Отправлено!
      </>
    )
    : (
      'Сохранить'
    )}
</button>
{
  submitError && <div className="error">{submitError}</div>
}
```

Три `useState`, try-catch-finally, условный рендеринг в кнопке, маппинг серверных ошибок по полям. И это _каждая_ форма в приложении. Скопировали, забыли `setIsSubmitting(false)` в `finally` — кнопка заблокирована навсегда. Не обработали 422 — пользователь не видит, какое поле сервер отверг. А ещё бывает двойной сабмит, если не заблокировать кнопку вовремя.

### 9. Accessibility — то, что все «сделают потом»

Формы — самый интерактивный элемент интерфейса, и именно на них accessibility ломается чаще всего. Вот что нужно сделать _правильно_ для каждого поля:

```tsx
// Одно поле «по стандарту» — сколько деталей вы бы забыли?
<div role="group" aria-labelledby="email-label">
  <label id="email-label" htmlFor="email-input">
    Email
    <span aria-hidden="true">*</span>
  </label>
  <input
    id="email-input"
    type="email"
    aria-required="true"
    aria-invalid={!!errors.email}
    aria-describedby={
      errors.email ? 'email-error' : 'email-hint' // переключаем в зависимости от состояния
    }
    value={email}
    onChange={handleChange}
  />
  {errors.email
    ? (
      <span id="email-error" role="alert">
        {errors.email}
      </span>
    )
    : <span id="email-hint">Используется для входа</span>}
</div>
```

`htmlFor` и `id` должны совпадать. `aria-describedby` указывает то на подсказку, то на ошибку — в зависимости от состояния валидации. `aria-invalid` синхронизирован с `errors`. `role="alert"` на ошибке, чтобы скринридер озвучил её при появлении. Звёздочка обязательности скрыта от скринридера через `aria-hidden`, потому что уже есть `aria-required`.

И это одно поле. А ещё нужно:

- Фокус на первое поле с ошибкой после неудачного сабмита
- `aria-live="polite"` на области с общей ошибкой формы
- Уникальные `id` для каждого поля (а если форма рендерится дважды на странице?)

На практике разработчики добавляют `htmlFor` и считают accessibility сделанным. Всё остальное — «потом». Потом не наступает.

---

## Что, если формы можно строить иначе?

Мы задались вопросом: а что, если бы:

1. **Валидация и UI метаданные жили в одном месте** — в Zod-схеме
2. **JSX содержал только вёрстку** — ни label, ни placeholder, ни maxLength
3. **50+ готовых полей** покрывали 95% сценариев — с единой CSS-обвязкой из коробки
4. **Вложенные объекты** описывались компонентами, а не строковыми путями
5. **Кнопка Submit** сама знала про isLoading, disabled и ошибки
6. **Accessibility** была встроена в каждое поле — aria-атрибуты, фокус, роли
7. **Форму можно было сгенерировать из одной строки** — из той же Zod-схемы
8. **Типобезопасность** была бы встроенной, а не добавленной
9. **Защита от ботов** не требовала отдельного пакета и настройки CAPTCHA

Вот как выглядит та же форма логина:

```tsx
const LoginSchema = z.object({
  email: z.string().email().meta({
    ui: { title: 'Email', placeholder: 'user@example.com' },
  }),
  password: z.string().min(8).meta({
    ui: { title: 'Пароль' },
  }),
})

// Вариант 1: ручная вёрстка (полный контроль)
<Form schema={LoginSchema} initialValue={{ email: '', password: '' }} onSubmit={login}>
  <Form.Field.String name="email" />
  <Form.Field.Password name="password" />
  <Form.Button.Submit>Войти</Form.Button.Submit>
</Form>

// Вариант 2: автогенерация (одна строка)
<Form.FromSchema schema={LoginSchema} initialValue={data} onSubmit={login} submitLabel="Войти" />
```

6 строк схемы + 5 строк JSX. Или 1 строка, если автогенерация. Готовый рецепт формы логина — на [forms-example.letar.best/examples/recipes](https://forms-example.letar.best/examples/recipes).

- `type="email"` — извлекается из `z.email()` автоматически
- `maxLength` — из `z.max()` автоматически
- Label, placeholder — из `.meta({ ui })`, не из JSX
- Ошибки — показываются автоматически, на русском
- TypeScript — `name="emial"` = ошибка компиляции
- **Обвязка** — label, error, helperText — всё внутри `Form.Field.*`, одинаково везде
- **Accessibility** — `aria-invalid`, `aria-describedby`, `aria-required`, уникальные `id`, фокус на ошибку — из коробки, без единой строчки ручного кода
- **Вложенность** — `<Form.Group name="customer">` вместо `customer.address.city`
- **Submit** — `<Form.Button.Submit>` сам отключается при отправке и показывает спиннер
- **Защита от ботов** — три уровня из коробки: невидимый `HoneypotField` (ловушка для ботов), `useRateLimit` (троттлинг повторных сабмитов), `Form.Captcha` (Turnstile/reCAPTCHA) — без внешних зависимостей

А вот форма заказа с вложенностью — сравните с кодом из проблемы #6:

```tsx
<Form schema={OrderSchema} initialValue={data} onSubmit={save}>
  <Form.Group name="customer">
    <Form.Field.String name="name" />
    <Form.Field.Phone name="phone" />
    <Form.Group name="address">
      <Form.Field.String name="city" /> {/* → customer.address.city */}
      <Form.Field.String name="street" /> {/* → customer.address.street */}
    </Form.Group>
  </Form.Group>

  <Form.Group.List name="items">
    {' '}
    {/* динамический массив */}
    <Form.Field.String name="product" /> {/* → items[0].product */}
    <Form.Field.Number name="quantity" /> {/* → items[0].quantity */}
  </Form.Group.List>

  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```

Ни одного строкового пути с точками и индексами. Вложенность — через компоненты. Переименовали `address` → `location`? Одно место, одно изменение.

Это `@letar/forms` — библиотека, которую мы строили два года внутри монорепозитория для 10+ продакшн-приложений. 233 файла, 29 366 строк кода, 1 077 тестов.

---

## Под капотом: почему TanStack Form, а не React Hook Form

Когда мы переписали 10 приложений с Conform на TanStack Form, решающими стали три вещи:

1. **`DeepKeys<T>`** — TanStack Form единственный даёт ошибку компиляции при опечатке в имени поля. React Hook Form использует `Path<T>`, но в сложных вложенных типах он ломается.

2. **Фреймворк-агностичное ядро** — TanStack Form не зависит от React internals. Это значит, что наш compound-component API (`Form.Field.*`) живёт _над_ TanStack Form, а не хачит его. Обновление TanStack не ломает наш код.

3. **Subscription-based рендеринг** — каждое поле подписывается только на своё значение и ошибки. При вводе в поле "email" поле "password" не ре-рендерится. React Hook Form достигает этого через `ref`, но ценой потери controlled-компонентов.

Мы обожглись на Formik (ре-рендеры убивали формы с 20+ полями), на Conform (progressive enhancement не нужен в SPA), и остановились на TanStack Form как "правильном фундаменте, но без батареек". Батарейки — наши.

---

## Что будет в цикле

Это первая статья из 12. В следующих мы разберём:

1. ~~Формы в React — почему всё ещё больно~~ _(вы здесь)_
2. **Zod `.meta()` — одна схема для валидации и UI** — как единый источник правды убирает дублирование
3. **Compound Components vs конфиг-объекты** — почему `<Form.Field.String>`, а не JSON
4. **50+ полей: от String до CreditCard** — обзор всех field-компонентов
5. **Мультистеп формы и условный рендеринг** — Steps, When, валидация по шагам
6. **Массивы и вложенные объекты** — FormGroup, drag & drop
7. **FromSchema: генерируем форму из одной строки** — автогенерация из Zod
8. **От БД до формы за 5 минут** — ZenStack → Zod → React pipeline
9. **Offline-first формы** — IndexedDB, очередь синхронизации, PWA
10. **i18n: формы на любом языке** — мультиязычность и перевод ошибок
11. **MCP: как AI пишет формы за тебя** — AI-интерфейс к библиотеке
12. **Релиз: как мы опенсорсили form-библиотеку** — GitHub, npm, уроки

Каждая статья самодостаточна, с живыми примерами на [forms-example.letar.best](https://forms-example.letar.best).

---

---

## Попробовать

<details>
<summary>Установка</summary>

```bash
bun add @letar/forms
```

```tsx
import { Form } from '@letar/forms'

const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
})

<Form schema={LoginSchema} initialValue={{ email: '', password: '' }} onSubmit={login}>
  <Form.Field.String name="email" />
  <Form.Field.Password name="password" />
  <Form.Button.Submit>Войти</Form.Button.Submit>
</Form>
```

</details>

- [Документация](https://forms.letar.best)
- [Живые примеры](https://forms-example.letar.best)
- [GitHub](https://github.com/kamiletar/letar-forms)
- [MCP для AI](https://www.npmjs.com/package/@letar/form-mcp)

---

**Навигация по серии**
→ Следующая: [Zod .meta() — одна схема для валидации, UI и доступности](02-zod-meta-single-source.md)

---

**Какую библиотеку форм вы используете в 2026? Доросли ли нативные формы React до продакшена?**
