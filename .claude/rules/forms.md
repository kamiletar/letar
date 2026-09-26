---
paths: apps/**/*-form.tsx, apps/**/*Form.tsx, apps/**/_schemas/*.ts, libs/forms/**/*
---

# Правила для форм

## Библиотека @letar/forms

⚠️ **ОБЯЗАТЕЛЬНО** прочитай `libs/forms/README.md` перед работой с формами!

## Приоритет инструментов

При работе с формами **ОБЯЗАТЕЛЬНО** следуй этому порядку:

1. **schema.zmodel** — начни с `@meta("form.*", value)` (единственный синтаксис с Фазы 4 `zenstack-form-plugin` v4.0.0; legacy `/// @form.*`-комментарии убраны из парсера целиком) (Skill `zenstack-helper`, MCP `form-mcp` → `get_directives`)
2. **Генерация** — запусти `nx zenstack:generate <app>` для создания form schemas
3. **form-mcp** — вызови `list_fields` для проверки доступных полей, `get_form_pattern` для паттерна, `get_field_props` для пропсов
4. **createForm инстанс** — используй app-specific инстанс (см. секцию ниже)
5. **Skill `form-pipeline`** — при создании формы с нуля

⚠️ **Если поля или директивы нет** — НЕ пиши кастомную реализацию! Делегируй через agent-mail (см. `.claude/rules/form-delegation.md`).

## createForm — app-specific инстанс

**ОБЯЗАТЕЛЬНО:** каждое приложение создаёт свой инстанс формы через `createForm()` из `@letar/forms`.

### Структура

```
src/<app-name>-form/
├── <app-name>-form.tsx   # createForm() с extraSelects, extraComboboxes, extraFields
└── index.ts              # export { AppNameForm } from './<app-name>-form'
```

### Паттерн

```typescript
import { createForm } from '@letar/forms'

export const MyAppForm = createForm({
  lazySelects: {
    // Enum Select-ы (lazy imports для оптимизации памяти!)
    Status: () => import('./selects/status-select'),
    Category: () => import('./selects/category-select'),
  },
  lazyComboboxes: {
    // Async Combobox-ы для поиска сущностей
    User: () => import('./comboboxes/user-combobox'),
  },
  extraFields: {
    // Синхронные кастомные поля
    PlateNumber: PlateNumberField,
  },
})
```

### Использование

⚠️ **`initialValue` должен отражать актуально отправленные данные, не статический дефолт.**
После успешного `onSubmit` форма делает `reset(dataToSubmit)`, снимая `isTouched` — следующий
ре-рендер родителя с `initialValue`, не совпадающим по значению с тем, что реально было
отправлено (например «первый элемент списка» вместо выбора пользователя), перетирает поле
обратно. Бьёт по любому полю, не только select. Разбор —
[letar-forms-post-submit-reset-stale-initialvalue](/.claude/docs/letar-forms-post-submit-reset-stale-initialvalue.md).

```tsx
import { MyAppForm } from '@/my-app-form'
<MyAppForm initialValue={defaults} onSubmit={handleSubmit}>
  <MyAppForm.Field.String name="title" label="Название" />
  <MyAppForm.Select.Status name="status" label="Статус" />
  <MyAppForm.Combobox.User name="userId" label="Пользователь" />
  <MyAppForm.Button.Submit>Сохранить</MyAppForm.Button.Submit>
</MyAppForm>
```

### Ключ реестра в схеме (`@letar/forms` ≥ 2.25.0, `zenstack-form-plugin` ≥ 4.2.0)

Поле-справочник со своим компонентом из инстанса привязывается строкой в схеме:
`@meta("form.fieldType", "Select.WorkCategory")` (или `Combobox.<Имя>`). `Form.AutoFields` и `Form.Field.Auto`
рисуют компонент из `lazySelects`/`extraSelects`/`lazyComboboxes`; исключать такое поле из `AutoFields`
больше не нужно. Плагин пишет `src/generated/form-schemas/form-registry-keys.ts`, а в модуле `createForm`
одна строка проверяет typecheck'ом, что все ключи из схемы зарегистрированы:

```typescript
export const appFormRegistryCheck: FormRegistryCheck<typeof AppForm, FormSelectKey, FormComboboxKey> = true
```

⚠️ Забыли строку `FormRegistryCheck` или не запустили `zenstack generate` после правки схемы — ошибку
даёт только рантайм (в dev и тестах исключение, в production один `console.error` и базовое поле).
Со старой `@letar/forms` (< 2.25.0) ключ молча превращается в текстовое поле. Полностью —
`libs/zenstack-form-plugin/README.md`, раздел «Проверка, что все ключи зарегистрированы».

### Memory optimization

- **Все Select/Combobox** через `lazySelects`/`lazyComboboxes` (dynamic imports)
- **Образец:** `apps/driving-school/src/driving-school-form/` — 46 Select, 10 Combobox, 3 Field, 1 Listbox

## ZenStack Form Plugin

- **ОБЯЗАТЕЛЬНО** используй `@meta("form.*", value)` директивы в schema.zmodel вместо ручных Zod
  схем (плоский dot-path — объектный литерал `@meta(key, {...})` ломает `zenstack generate`
  целиком, `ObjectExpr` не поддержан upstream-генератором TS-схемы)
- Проверяй `get_directives` (form-mcp) перед добавлением директив
- Если нужной директивы нет → делегация через agent-mail

## Основной паттерн (legacy API)

```typescript
import { ChakraFormField, FormGroup, useAppForm } from '@letar/forms'
import { z } from 'zod/v4'

const schema = z.object({
  name: z.string().min(1, 'Обязательное поле'),
  email: z.email('Некорректный email'),
}).strip() // ⚠️ Всегда используй .strip() для Zod v4

function MyForm() {
  const form = useAppForm({ schema, defaultValues: { name: '', email: '' } })

  return (
    <FormGroup form={form} name="root">
      <ChakraFormField name="name" label="Имя">
        <Input />
      </ChakraFormField>
      <ChakraFormField name="email" label="Email">
        <Input type="email" />
      </ChakraFormField>
    </FormGroup>
  )
}
```

## Правила

- **Схемы валидации** — храни в `_schemas/` с суффиксом `.schema.ts`
- **Server Actions** — вызывай напрямую из `onSubmit`, не через `<form action>`
- **Массивы** — используй `FormGroupList`
- **Оффлайн** — используй `useOfflineForm` из `@letar/forms/offline`
- **Черновик в localStorage — по умолчанию, не по напоминанию.** Для любой нетривиальной формы
  (создание/редактирование сущности, длинная форма — не одноразовый auth-экран) подключай
  `useFormPersistence` (`@letar/forms`, `libs/forms/src/lib/declarative/form-persistence.tsx`):
  подписка на `form.store.subscribe` → `saveValues(form.state.values)`, `clearSavedData()` на
  успешный submit. Принцип — [Ководство §188](https://www.artlebedev.ru/kovodstvo/sections/188/):
  пользовательский ввод священен, закрытие вкладки/краш/перезагрузка не должны его стирать.
  ⛔ **Исключение — чувствительные поля** (пароль, номер карты/CVV/срок действия, другие
  auth/платёжные данные) **никогда** не попадают в сохраняемый снимок — фильтруй их из объекта
  перед `saveValues`, даже если остальная форма персистится.

## Не делай

- ❌ **NEVER** используй Conform для новых форм (только @letar/forms)
- ❌ **NEVER** импортируй из `@tanstack/react-form` напрямую
- ❌ **NEVER** забывай `.strip()` в Zod схемах
- ❌ **NEVER** пиши кастомные поля форм если аналог есть в form-components (проверь `list_fields`!)
- ❌ **NEVER** используй `Field.NativeSelect`/`<AppForm.Field.NativeSelect>` в новом коде —
  компонент помечен `@deprecated` (2026-09-15). Всегда `Field.Select` — он закрывает те же
  случаи, включая мобильный UX, собственным стилем библиотеки (кнопка очистки; поиск в списке — сам с 10-й опции, `searchable`, с `@letar/forms` 2.21.0).
  `NativeSelect` остаётся только ради уже существующих мест использования, новых фич в него не
  добавляют. Исполняемая версия — semgrep `letar-forms-native-select-deprecated`
  (`.semgrep/letar-rules.yml`, WARNING, не блокирует коммит — на момент завода сотни существующих
  срабатываний по всему монорепо, миграция не форсируется).
- ❌ **NEVER** используй нативный `<form>` + `useActionState` вместо `@letar/forms` — даже для «простых» форм (email, подписка, логин). Отговорки «форма слишком простая» или «отложим на потом» **запрещены**. Нет createForm инстанса → создай его сначала.
- ❌ **NEVER** пиши сырой Chakra `NativeSelect`/`Select.Root` + `useState`/`useSearchParams` для дропдауна — даже вне контекста сабмита сущности (URL-фильтр списка, ad-hoc-панель, per-row контрол таблицы). Такой контрол всё равно оборачивается в `createForm()`-инстанс приложения:
  - **URL-синхронизированный фильтр** (аналог старого `CategoryFilter` на `useRouter`/`useSearchParams`) → `<AppForm.Field.Select>` (или `.Select.<Name>`) внутри `<AppForm>` + `<Form.UrlSync fields={[...]} defaults={...} />` (§ «URL Sync фильтров», `libs/forms/README.md`), не ручной `router.push`.
  - **Локальный бридж без общего сабмита** (например построчный выбор в таблице, сразу вызывающий server action) → одно-полевая микро-`<AppForm>` + `<Form.Watch field="..." onChange={...} />` (§ «Form-level компоненты», `libs/forms/README.md`) — образец: `MaterialCombobox`/`combobox-material.tsx` в domwellbes (`.claude/docs/`, задача «Импорт из чертежа», 2026-09-12).
  - Растущий каталог (материалы/работы/контрагенты/поставщики и т.п.) внутри такого контрола — `Combobox.<Name>` (async full-text поиск, `initialSearchValue` проп у `Form.Field.Combobox` с v2.14.4), не просто `Select`.
  - ⚠️ Исполняемая версия этого правила — semgrep `letar-forms-raw-select-combobox-outside-lib`
    (`.semgrep/letar-rules.yml`, WARNING, не блокирует коммит): ловит `NativeSelect.Root`/
    `Select.Root`/`Combobox.Root` вне пакетов `@letar/forms*`. На момент завода (2026-09-12) —
    357 существующих срабатываний в 108 файлах по всему монорепо, поэтому не ERROR; не игнорируй
    предупреждение в НОВОМ коде.
- ❌ **NEVER** создавай приложение с формой без `src/<app>-form/` директории с `createForm()` инстансом.

## Документация

→ **MCP: `form-mcp`** — 6 tools для доступа к полям, паттернам и директивам (list_fields, get_field_props, get_form_pattern и др.)
→ **Skill: `form-pipeline`** — полный воркфлоу создания форм
→ **Skill: `zenstack-helper`** — @form.\* директивы для генерации схем
→ **Rule: `form-delegation`** — делегация недостающих фич через agent-mail
