# Мультистеп формы в React: пошаговая валидация, условные шаги и анимации

> **Уровень сложности:** Средний

**TL;DR:**

- `Form.Steps` разбивает длинную форму на шаги с анимацией, прогрессом и валидацией каждого шага отдельно
- `Form.When` показывает/скрывает поля и целые шаги по условию — количество шагов динамически перестраивается
- `Form.Watch` — renderless-компонент для побочных эффектов между полями (автозаполнение, пересчёт)

**Кому полезно:**

- Junior: научиться разбивать длинные формы на шаги без ручного state management
- Middle: освоить динамические мультистепы с условным рендерингом и валидацией по шагам
- Senior: оценить декларативный подход When + Steps для сложных форм с зависимостями между полями

---

> Пятая статья из цикла «@letar/forms — от боли к декларативным формам». Как разбить длинную форму на шаги, валидировать каждый по отдельности и показывать поля по условию.

---

## Проблема: форма из 30 полей

Форма регистрации в автошколе:

- Личные данные (ФИО, дата рождения, телефон)
- Документы (паспорт, СНИЛС, медсправка)
- Обучение (категория, тип КПП, инструктор)
- Расписание (дни недели, время)
- Оплата (тариф, способ оплаты)

30+ полей на одном экране — это UX-катастрофа. Пользователь видит гигантскую простыню, не понимает прогресс и уходит.

Решение — мультистеп: разбить на 5 шагов по 5-7 полей. Но реализация — головная боль:

- Какие поля валидировать на текущем шаге?
- Как сохранять данные между шагами?
- Как вернуться назад без потери ввода?
- Как показать прогресс?

---

## Form.Steps — мультистеп за 5 минут

```tsx
<Form schema={RegistrationSchema} initialValue={data} onSubmit={save}>
  <Form.Steps animated validateOnNext>
    <Form.Steps.Step title="Личные данные" description="ФИО и контакты">
      <Form.Field.String name="lastName" />
      <Form.Field.String name="firstName" />
      <Form.Field.String name="middleName" />
      <Form.Field.Date name="birthDate" />
      <Form.Field.Phone name="phone" />
    </Form.Steps.Step>

    <Form.Steps.Step title="Документы" description="Паспорт и СНИЛС">
      <Form.Field.MaskedInput name="passport" mask="____ ______" />
      <Form.Field.MaskedInput name="snils" mask="___-___-___ __" />
      <Form.Field.FileUpload name="medCertificate" accept="image/*,.pdf" />
    </Form.Steps.Step>

    <Form.Steps.Step title="Обучение" description="Категория и инструктор">
      <Form.Field.RadioCard name="category" />
      <Form.Field.SegmentedGroup name="transmission" />
      <Form.Field.Select name="instructor" />
    </Form.Steps.Step>

    <Form.Steps.Step title="Расписание" description="Удобное время">
      <Form.Field.Schedule name="schedule" />
    </Form.Steps.Step>

    <Form.Steps.Step title="Оплата" description="Тариф и способ">
      <Form.Field.RadioCard name="plan" />
      <Form.Field.RadioGroup name="paymentMethod" />
    </Form.Steps.Step>

    <Form.Steps.Navigation />
  </Form.Steps>
</Form>
```

Что получаем:

- **Степпер** вверху с прогрессом (шаг 2 из 5)
- **Анимация** перехода между шагами (`animated`)
- **Валидация** перед переходом на следующий шаг (`validateOnNext`)
- **Кнопки** «Назад» / «Далее» / «Отправить» (`Navigation`)
- **Сохранение** данных при навигации назад

### validateOnNext: валидация по шагам

Когда пользователь нажимает «Далее», валидируются только поля текущего шага. Как это работает:

1. `Form.Steps.Step` собирает имена всех вложенных `Form.Field.*`
2. При нажатии «Далее» — валидирует только эти поля через Zod
3. Если есть ошибки — показывает их и не пускает дальше
4. Если валидация пройдена — анимированный переход на следующий шаг

Пользователю не показываются ошибки полей, которые он ещё не заполнял.

### Кастомная навигация

```tsx
<Form.Steps animated>
  <Form.Steps.Step title="Шаг 1">...</Form.Steps.Step>
  <Form.Steps.Step title="Шаг 2">...</Form.Steps.Step>

  {/* Вместо стандартной навигации */}
  <Form.Steps.Navigation
    prevLabel="← Назад"
    nextLabel="Далее →"
    submitLabel="Отправить заявку"
    showStepCount // "Шаг 2 из 5"
  />
</Form.Steps>
```

---

## Form.When — условный рендеринг

Часто поля зависят от значений других полей. Классический пример: «тип клиента» — физлицо или юрлицо.

```tsx
<Form schema={ClientSchema} initialValue={data} onSubmit={save}>
  <Form.Field.SegmentedGroup
    name="clientType"
    options={[
      { value: 'individual', label: 'Физлицо' },
      { value: 'company', label: 'Юрлицо' },
    ]}
  />

  {/* Показывается только если clientType === 'individual' */}
  <Form.When field="clientType" is="individual">
    <Form.Field.String name="fullName" />
    <Form.Field.MaskedInput name="passport" mask="____ ______" />
  </Form.When>

  {/* Показывается только если clientType === 'company' */}
  <Form.When field="clientType" is="company">
    <Form.Field.String name="companyName" />
    <Form.Field.MaskedInput name="inn" mask="__________" />
    <Form.Field.String name="contactPerson" />
  </Form.When>

  <Form.Button.Submit />
</Form>
```

### Продвинутые условия

```tsx
{
  /* Значение не равно */
}
;<Form.When field="role" isNot="guest">
  <Form.Field.String name="email" />
</Form.When>

{
  /* Значение из списка */
}
;<Form.When field="country" isOneOf={['RU', 'BY', 'KZ']}>
  <Form.Field.Phone name="phone" />
</Form.When>

{
  /* Кастомное условие */
}
;<Form.When field="age" condition={(age) => age >= 18}>
  <Form.Field.Checkbox name="drivingLicense" />
</Form.When>

{
  /* Булево поле */
}
;<Form.When field="hasDiscount" is={true}>
  <Form.Field.Percentage name="discountPercent" />
</Form.When>
```

### When + Steps = динамические мультистепы

```tsx
<Form.Steps animated validateOnNext>
  <Form.Steps.Step title="Основное">
    <Form.Field.String name="name" />
    <Form.Field.SegmentedGroup name="type" options={typeOptions} />
  </Form.Steps.Step>

  {/* Этот шаг виден только для компаний */}
  <Form.When field="type" is="company">
    <Form.Steps.Step title="Реквизиты">
      <Form.Field.String name="companyName" />
      <Form.Field.MaskedInput name="inn" mask="__________" />
    </Form.Steps.Step>
  </Form.When>

  <Form.Steps.Step title="Контакты">
    <Form.Field.Phone name="phone" />
    <Form.Field.String name="email" />
  </Form.Steps.Step>

  <Form.Steps.Navigation />
</Form.Steps>
```

Физлицо видит 2 шага, юрлицо — 3. Степпер и навигация перестраиваются автоматически.

---

## Реальный пример: форма регистрации

Собираем всё вместе — мультистеп + условия + валидация:

```tsx
const RegistrationSchema = z.object({
  // Шаг 1: Тип аккаунта
  accountType: z.enum(['personal', 'business']).meta({
    ui: { title: 'Тип аккаунта', fieldType: 'radioCard' },
  }),

  // Шаг 2: Личные данные (всегда)
  name: z
    .string()
    .min(2)
    .meta({ ui: { title: 'Имя' } }),
  email: z
    .string()
    .email()
    .meta({ ui: { title: 'Email' } }),
  password: z
    .string()
    .min(8)
    .meta({ ui: { title: 'Пароль' } }),

  // Шаг 2.5: Данные компании (только для business)
  companyName: z
    .string()
    .optional()
    .meta({ ui: { title: 'Название компании' } }),
  inn: z
    .string()
    .optional()
    .meta({ ui: { title: 'ИНН' } }),

  // Шаг 3: Настройки
  newsletter: z
    .boolean()
    .default(true)
    .meta({
      ui: { title: 'Подписка на рассылку' },
    }),
  theme: z
    .enum(['light', 'dark', 'auto'])
    .default('auto')
    .meta({
      ui: { title: 'Тема', fieldType: 'segmentedGroup' },
    }),
})

function RegistrationForm() {
  return (
    <Form schema={RegistrationSchema} initialValue={defaults} onSubmit={register}>
      <Form.Steps animated validateOnNext>
        <Form.Steps.Step title="Тип аккаунта">
          <Form.Field.RadioCard name="accountType" />
        </Form.Steps.Step>

        <Form.Steps.Step title="Данные">
          <Form.Field.String name="name" />
          <Form.Field.String name="email" />
          <Form.Field.PasswordStrength name="password" />
        </Form.Steps.Step>

        <Form.When field="accountType" is="business">
          <Form.Steps.Step title="Компания">
            <Form.Field.String name="companyName" />
            <Form.Field.MaskedInput name="inn" mask="__________" />
          </Form.Steps.Step>
        </Form.When>

        <Form.Steps.Step title="Настройки">
          <Form.Field.Switch name="newsletter" />
          <Form.Field.SegmentedGroup name="theme" />
        </Form.Steps.Step>

        <Form.Steps.Navigation submitLabel="Создать аккаунт" />
      </Form.Steps>
    </Form>
  )
}
```

---

## Итоги

| Компонент               | Что делает                                  |
| ----------------------- | ------------------------------------------- |
| `Form.Steps`            | Контейнер мультистепа (анимация, валидация) |
| `Form.Steps.Step`       | Один шаг (title, description, children)     |
| `Form.Steps.Navigation` | Кнопки «Назад» / «Далее» / «Отправить»      |
| `Form.When`             | Условный рендеринг по значению поля         |
| `Form.Watch`            | Отслеживание изменений + побочные эффекты   |

### Form.Watch — побочные эффекты между шагами

`Form.Watch` — renderless-компонент для отслеживания изменений полей и автоматических побочных эффектов:

```tsx
<Form schema={Schema} initialValue={data} onSubmit={save}>
  {/* Автогенерация slug при изменении title */}
  <Form.Watch
    field="title"
    onChange={(value, { setFieldValue }) => {
      setFieldValue('slug', transliterate(String(value)))
    }}
  />

  <Form.Steps animated validateOnNext>
    <Form.Steps.Step title="Основное">
      <Form.Field.String name="title" />
      <Form.Field.String name="slug" />
    </Form.Steps.Step>
    <Form.Steps.Step title="Детали">
      <Form.Field.Textarea name="description" />
    </Form.Steps.Step>
    <Form.Steps.Navigation />
  </Form.Steps>
</Form>
```

`Form.Watch` не рендерит UI — он только подписывается на изменения поля и вызывает `onChange`. Это удобно для:

- Автозаполнения зависимых полей (title → slug)
- Пересчёта значений при изменении другого поля
- Условной логики, которая не влияет на рендеринг

Ключевые принципы:

1. Валидация **по шагам** — пользователь не видит ошибок будущих полей
2. When + Steps = **динамические шаги** — количество шагов зависит от ответов
3. Watch = **побочные эффекты** между полями и шагами
4. Данные **не теряются** при навигации назад
5. Всё — **декларативно** в JSX, без императивного стейт-менеджмента

---

## Попробовать

- **Мультистеп:** [forms-example.letar.best/examples/multi-step](https://forms-example.letar.best/examples/multi-step)
- **Условный рендеринг:** [forms-example.letar.best/examples/conditional](https://forms-example.letar.best/examples/conditional)
- **Исходный код:** [multi-step](https://github.com/kamiletar/letar-forms-example/blob/main/src/app/examples/multi-step/page.tsx) | [conditional](https://github.com/kamiletar/letar-forms-example/blob/main/src/app/examples/conditional/page.tsx)
- **Клонировать:** `git clone https://github.com/kamiletar/letar-forms-example && cd letar-forms-example && npm install && npm run dev`

В следующей статье — массивы и вложенные объекты: `Form.Group`, `Form.Group.List` и drag & drop сортировка (подробнее — в [статье 6: массивы и группы](06-arrays-groups.md)).

---

_Это пятая статья из цикла «@letar/forms — от боли к декларативным формам». [Предыдущая: 50+ полей](04-40-fields.md) | [Следующая: Массивы и группы](06-arrays-groups.md)._
