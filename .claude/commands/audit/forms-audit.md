# Forms Audit - Аудит интеграции форм

Проведи аудит соответствия форм проекта паттернам @letar/forms.

## Когда использовать

- При добавлении форм в новый проект
- После добавления новых enum'ов в schema.zmodel
- Перед релизом (проверка консистентности)
- При рефакторинге форм

## Эталон

Изучи `apps/driving-school/src/driving-school-form/` как референсную реализацию.

## Чеклист аудита

### 1. createForm конфигурация

**Проверить:** `src/<project>-form/<project>-form.tsx`

```typescript
// Правильно
export const ProjectForm = createForm({
  extraFields: { ... },      // Кастомные Field
  extraSelects: { ... },     // Select для enum'ов
  extraComboboxes: { ... },  // Async search
  extraListboxes: { ... },   // Multi-select
})
```

- [ ] Файл существует
- [ ] Используется `createForm` из `@letar/forms`
- [ ] Экспортируется через `index.ts`
- [ ] Имя формы = `<ProjectName>Form` (PascalCase)

### 2. Select компоненты для enum'ов

**Проверить:** `src/<project>-form/selects/`

Для каждого enum в `schema.zmodel`:

```typescript
// Паттерн Select компонента
import { FieldSelect, type SelectOption } from '@letar/forms'
import { enumLabels } from '../labels'

export function SelectMyEnum({ name, ...props }: Props) {
  const options: SelectOption<MyEnum>[] = allValues.map((value) => ({
    label: enumLabels[value] ?? value,
    value,
  }))
  return <FieldSelect name={name} options={options} {...props} />
}
```

- [ ] Есть Select для каждого enum используемого в формах
- [ ] Используют `FieldSelect` из `@letar/forms`
- [ ] Labels берутся из `labels.ts` (generated)
- [ ] Типизированы через `SelectOption<T>`

### 3. Labels система

**Проверить:** `src/<project>-form/labels.ts`

```typescript
// Реэкспорт generated labels
export { MyEnumLabels as myEnumLabels } from '@/generated/form-schemas/enums/MyEnum.form'
```

- [ ] Файл `labels.ts` существует
- [ ] Реэкспортирует все enum labels из generated
- [ ] В `schema.zmodel` есть doc-комментарии `/// Метка` для enum значений

### 4. Структура файлов

```
src/<project>-form/
├── <project>-form.tsx    # createForm (обязательно)
├── index.ts              # экспорт (обязательно)
├── labels.ts             # реэкспорт labels (обязательно)
├── README.md             # документация (рекомендуется)
├── selects/              # Select компоненты
│   ├── index.ts
│   └── select-*.tsx
├── comboboxes/           # Async поиск (опционально)
├── listboxes/            # Multi-select (опционально)
└── fields/               # Кастомные поля (опционально)
```

- [ ] Базовая структура соблюдена
- [ ] Все компоненты экспортируются через index.ts
- [ ] Нейминг файлов консистентен

### 5. Zod схемы

**Проверить:** `app/**/_schemas/*.schema.ts`

```typescript
// Правильно
import { MyEnumFormSchema } from '@/generated/form-schemas/enums/MyEnum.form'
import { z } from 'zod/v4'

export const FormSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .meta({ ui: { title: 'Название' } }),
    type: MyEnumFormSchema, // Генерируемый enum
  })
  .strip()
```

- [ ] Импорт из `zod/v4` (не `zod`)
- [ ] `.strip()` на всех схемах форм
- [ ] UI метаданные через `.meta({ ui: {...} })`
- [ ] Enum схемы из generated

### 6. Использование в компонентах

**Проверить:** `app/**/*-form.tsx`

```typescript
// Правильно
import { ProjectForm } from '@/<project>-form'

<ProjectForm initialValue={...} onSubmit={...}>
  <ProjectForm.Field.String name="name" />
  <ProjectForm.Select.MyEnum name="type" />
  <ProjectForm.Button.Submit>Сохранить</ProjectForm.Button.Submit>
</ProjectForm>
```

- [ ] Используется проектная форма (не базовый useAppForm)
- [ ] Импорт из `@/<project>-form`
- [ ] Декларативный API через подкомпоненты

### 7. ZenStack plugin

**Проверить:** `schema.zmodel`

```zmodel
plugin formSchemas {
  provider = '@letar/zenstack-form-plugin'
  output = 'src/generated/form-schemas'
}

enum MyEnum {
  /// Значение 1
  VALUE_1
  /// Значение 2
  VALUE_2
}
```

- [ ] Plugin подключен
- [ ] Doc-комментарии `///` на значениях enum
- [ ] `nx zenstack:generate` выполнен

### 8. i18n (мультиязычные приложения)

**Проверить:** `schema.zmodel`, `messages/form-schemas/`

```zmodel
// Конфигурация плагина с i18n
plugin formSchemas {
  provider = '@letar/zenstack-form-plugin'
  output = 'src/generated/form-schemas'

  // i18n
  i18n = true
  i18nOutput = './messages/form-schemas'
  defaultLocale = 'ru'
  locales = 'ru,en'
}
```

**Генерируемые файлы:**

```
messages/form-schemas/
├── ru.json    # Переводы (defaultLocale — перезаписывается)
├── en.json    # Переводы (merge-стратегия)
└── keys.ts    # TypeScript типы
```

**Структура переводов (v2.1.0+):**

```json
{
  "Product": {
    "name": { "title": "Название", "placeholder": "Введите..." }
  },
  "validation": {
    "too_small": {
      "string": "Минимум {minimum} символов",
      "number": "Минимум {minimum}"
    },
    "invalid_format": {
      "email": "Некорректный email",
      "url": "Некорректный URL"
    }
  }
}
```

**Использование FormI18nProvider:**

```tsx
import { FormI18nProvider } from '@letar/forms'
import { useLocale, useTranslations } from 'next-intl' // setupZodErrorMap — глобальный перевод ошибок валидации
<FormI18nProvider t={useTranslations('formSchemas')} locale={useLocale()} setupZodErrorMap>
  <Form schema={Schema} initialValue={data} onSubmit={save}>
    ...
  </Form>
</FormI18nProvider>
```

- [ ] i18n включён в plugin (если приложение мультиязычное)
- [ ] Файлы переводов сгенерированы в `i18nOutput`
- [ ] `FormI18nProvider` обёртывает формы
- [ ] `setupZodErrorMap` включён для перевода ошибок валидации
- [ ] Секция `validation.*` в JSON содержит переводы ошибок
- [ ] Переводы для non-default локалей заполнены
- [ ] TypeScript keys импортируются при необходимости

## Предложение выноса паттернов

Если при аудите обнаружены повторяющиеся паттерны, которые можно вынести в `@letar/forms`:

1. **Остановись перед рефакторингом**
2. **Опиши найденный паттерн** пользователю:
   - Где встречается (файлы, компоненты)
   - Сколько раз повторяется
   - Как можно обобщить (новый Field, хелпер, HOC)
3. **Предложи варианты:**
   - Вынести в `@letar/forms` как новый компонент
   - Создать локальный shared компонент в проекте
   - Оставить как есть (если паттерн специфичен)
4. **Дождись подтверждения** перед началом работы

### Примеры выносимых паттернов

| Паттерн                                 | Куда выносить                                    |
| --------------------------------------- | ------------------------------------------------ |
| Повторяющийся Field с кастомной логикой | `Form.Field.*` или `createForm({ extraFields })` |
| Общий Select для нескольких проектов    | `@letar/forms` напрямую                          |
| Валидатор с UI feedback                 | Утилита в `form-components/utils`                |
| Layout wrapper для полей                | `Form.Group.*` или `fieldWrapper`                |

## Результат аудита

Выведи таблицу:

| Проверка      | Статус      | Комментарий          |
| ------------- | ----------- | -------------------- |
| createForm    | ✅/❌/⚠️     | Путь или проблема    |
| Select'ы      | ✅/❌/⚠️     | N из M enum'ов       |
| Labels        | ✅/❌/⚠️     | ...                  |
| Структура     | ✅/❌/⚠️     | ...                  |
| Zod схемы     | ✅/❌/⚠️     | ...                  |
| Использование | ✅/❌/⚠️     | ...                  |
| ZenStack      | ✅/❌/⚠️     | ...                  |
| i18n          | ✅/❌/⚠️/N/A | (если мультиязычное) |

И список действий для исправления:

1. Создать/обновить файлы
2. Добавить недостающие компоненты
3. Исправить импорты

## Документация

- [forms.md](/.claude/docs/forms.md) — паттерны форм
- [libs/forms/README.md](/libs/forms/README.md) — API библиотеки
- [driving-school-form](/apps/driving-school/src/driving-school-form/) — эталон
