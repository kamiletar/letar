# 2 года, 50+ компонентов: как мы опенсорсили form-библиотеку

> **Уровень сложности:** Простой

**TL;DR:**

- За 2 года от 50-строчного wrapper до 50+ field-компонентов, ZenStack плагина, MCP-сервера и offline-поддержки в 10+ продакшн-приложениях
- Ключевое решение: Zod `.meta()` как единый источник правды — из него следуют Compound Components, FromSchema, i18n и ZenStack pipeline
- Три npm-пакета (forms, form-mcp, zenstack-form-plugin), документация на Fumadocs и 16 интерактивных примеров

**Кому полезно:**

- Junior: увидеть эволюцию библиотеки от идеи до open-source и понять, почему стоит использовать готовое решение
- Middle: извлечь уроки из «что сработало / что не сработало» и оценить Quick Start для своего проекта
- Senior: оценить архитектурные решения (Compound Components vs конфиг, привязка к Chakra, 4 уровня контроля) и roadmap

---

> Двенадцатая и финальная статья цикла «@letar/forms — от боли к декларативным формам». История проекта, архитектурные решения, уроки двух лет разработки — и ссылка на GitHub.

---

## От внутреннего монорепо до npm

Всё началось в 2024 году с простого wrapper вокруг TanStack Form для Chakra UI. `ChakraFormField` — один компонент, 50 строк. Потом появился `FormGroup` для вложенных объектов. Потом `FormGroupList` для массивов.

К концу 2024 — 15 полей. К середине 2025 — 30. Сегодня — 50+ field-компонентов, 10+ form-level компонентов, ZenStack плагин, MCP-сервер, offline-поддержка и i18n.

Библиотека используется в 10+ продакшн-приложениях:

- **premium-rosstil** — e-commerce (Product CRUD, заказы, корзина)
- **driving-school** — PWA для автошкол (регистрация, расписание, offline-отчёты)
- **dashboard** — админ-панель (CRUD для 20+ моделей)
- **kami** — персональный сайт (формы обратной связи)
- **imot** — учёт (финансовые формы, Currency, Percentage)

---

## Что сработало

### 1. Zod `.meta()` как единый источник

Это главное архитектурное решение. Всё остальное — следствие:

- Compound Components — потому что JSX содержит только вёрстку
- FromSchema — потому что вся информация в схеме
- ZenStack pipeline — потому что `.meta()` генерируется из `@form.*`
- i18n — потому что ключи переводов живут в `.meta()`

Если бы мы хранили label в JSX, а валидацию в Zod — никакой автогенерации бы не было.

### 2. Compound Components с Object.assign

Один импорт `Form` вместо двадцати. Точка-нотация (`Form.Field.String`) — discoverable в IDE. `createForm()` для расширения.

Альтернативы, которые мы рассматривали:

- **Отдельные импорты** (`import { StringField } from '...'`) — 20 импортов на файл
- **Конфиг-объект** (react-jsonschema-form) — нет контроля над вёрсткой
- **HOC-based** — сложно, плохой DX

### 3. Четыре уровня контроля

```
FromSchema → AutoFields → Form.Field.* → useAppForm
```

Это не «фреймворк или ничего». Начинаете с автогенерации, детализируете по мере необходимости. Ни разу не пришлось переписывать всё с нуля при смене уровня.

### 4. MCP-сервер

AI с контекстом о библиотеке создаёт формы в разы быстрее. Это изменило наш workflow: вместо «написать форму» — «описать форму и проверить».

### 5. Утилитарные компоненты из schema-driven архитектуры

Три компонента, которые мы не планировали, но которые стали одними из самых используемых:

- **`FormSkeleton`** — одна строка, автоматически генерирует loading-скелетон по Zod-схеме. Заменяет 15–20 строк ручных `<Skeleton />`.
- **`FormComparison`** — diff-view для сравнения двух состояний данных. Показывает «было → стало» с подсветкой изменений. Модерация, аудит, approval flow.
- **`FormReadOnlyView`** — та же Zod-схема, но вместо инпутов — текстовое отображение. Квитанции, карточки, подтверждения.

Все три стали возможны благодаря schema-driven подходу: схема содержит достаточно информации, чтобы генерировать не только формы, но и их проекции.

---

## Что не сработало (и мы переделали)

### 1. Императивный API как основной

Первая версия была на `useAppForm` + `withForm` — чистый TanStack Form API. Работает, но verbose. Compound Components (`<Form.Field.String>`) появились позже и стали основным API.

**Урок:** Декларативный API проще для 80% кейсов. Императивный — для оставшихся 20%.

### 2. Попытка поддержать все UI-библиотеки

Начинали с абстракции `FormField` (без Chakra). Потом поняли: абстракция ради абстракции. 100% наших приложений на Chakra UI. Привязались к Chakra и сделали DX на порядок лучше.

**Урок:** Solve your actual problem, не гипотетический.

### 3. Ручной маппинг полей

В ранних версиях FromSchema/AutoFields маппинг Zod type → компонент был жёстко зашит. Теперь — через `fieldType` в `.meta()` и расширяемый маппер.

**Урок:** Конвенция по умолчанию + возможность переопределить = правильный баланс.

---

## Цифры

| Метрика                | Значение |
| ---------------------- | -------- |
| Field-компонентов      | 50+      |
| Form-level компонентов | 12       |
| Строк кода (src/)      | ~8 000   |
| Тестов                 | 150+     |
| Продакшн-приложений    | 10+      |
| Время разработки       | 2 года   |
| MCP-инструментов       | 6        |
| Zod-версия             | v4       |
| React-версия           | 19       |
| TanStack Form          | latest   |

---

## Стек

```
@letar/forms
├── TanStack Form (ядро state management)
├── Zod v4 (валидация + .meta() для UI)
├── Chakra UI v3 (UI-компоненты)
├── React 19 (рендеринг)
└── Опциональные:
    ├── @dnd-kit (drag & drop в массивах)
    ├── use-mask-input (Phone, MaskedInput)
    ├── @tiptap (RichText WYSIWYG)
    ├── next-intl (i18n)
    └── @uiw/react-json-view (DebugValues)
```

---

## Open-source: что вошло в релиз

### Пакеты

| Пакет                         | npm | Описание                             |
| ----------------------------- | --- | ------------------------------------ |
| `@letar/forms`                | npm | Основная библиотека (50+ полей)      |
| `@letar/form-mcp`             | npm | MCP-сервер для AI                    |
| `@letar/zenstack-form-plugin` | npm | ZenStack плагин (@form.\* директивы) |

### Документация

- **[forms.letar.best](https://forms.letar.best)** — Fumadocs-документация с полнотекстовым поиском
- **[forms-example.letar.best](https://forms-example.letar.best)** — 16 интерактивных примеров + CRUD с БД

### GitHub

- Репозиторий: `github.com/letar/forms` (MIT)
- Monorepo: библиотека + docs app + example app + MCP сервер
- CI: GitHub Actions (lint + typecheck + test + build)

---

## Roadmap

Что мы планируем после релиза:

1. **Standalone Chakra-free режим** — поддержка других UI-библиотек (Radix, shadcn)
2. **Server Components** — рендер формы на сервере, гидратация на клиенте
3. **Form Builder UI** — визуальный конструктор форм (drag & drop поля)
4. **React Native** — адаптация полей для мобильных приложений
5. **Playwright integration** — автоматическое тестирование форм
6. **AI form generation** — создание Zod-схемы из скриншота дизайна

---

## Как попробовать

### Установка

```bash
npm install @letar/forms
# или
bun add @letar/forms
```

### Quick Start

```tsx
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

const Schema = z.object({
  name: z.string().min(2).meta({ ui: { title: 'Имя' } }),
  email: z.string().email().meta({ ui: { title: 'Email' } }),
})

<Form schema={Schema} initialValue={{ name: '', email: '' }} onSubmit={save}>
  <Form.Field.String name="name" />
  <Form.Field.String name="email" />
  <Form.Button.Submit>Сохранить</Form.Button.Submit>
</Form>
```

### Готовые рецепты

Не знаете с чего начать? Скопируйте готовый рецепт:

- **Login** — форма авторизации (2 поля, валидация, submit)
- **Registration** — мультистеп регистрация (личные данные → пароль → настройки)
- **Contact** — форма обратной связи (имя, email, телефон, сообщение)
- **Settings** — форма настроек профиля (Switch, Select, SegmentedGroup)

Все рецепты с исходным кодом: [forms-example.letar.best/examples/recipes](https://forms-example.letar.best/examples/recipes)

### MCP для AI

```json
{ "form-mcp": { "command": "npx", "args": ["-y", "@letar/form-mcp"] } }
```

---

## Спасибо

Спасибо всем, кто читал цикл. 12 статей, от «почему формы — боль» до open-source релиза. Надеемся, библиотека сделает ваши формы чуточку менее болезненными.

Вопросы, issues, pull requests — на GitHub. Feedback — в комментариях.

---

## Ссылки

- **Документация:** [forms.letar.best](https://forms.letar.best)
- **Примеры:** [forms-example.letar.best](https://forms-example.letar.best)
- **GitHub:** [github.com/letar/forms](https://github.com/letar/forms)
- **npm MCP:** `npx @letar/form-mcp`

---

_Это двенадцатая статья из цикла «@letar/forms — от боли к декларативным формам». [Предыдущая: Analytics](13-analytics.md)._

---

**Опенсорсили ли вы свои внутренние инструменты?**
