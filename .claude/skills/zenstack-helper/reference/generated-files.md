# Структура генерируемых файлов

После `nx zenstack:generate <app>` создаётся:

## Директория src/generated/

```
src/generated/
├── schema.prisma           # Prisma схема (НЕ РЕДАКТИРОВАТЬ!)
└── form-schemas/           # Zod схемы с UI метаданными (@letar/zenstack-form-plugin)
    ├── index.ts            # Реэкспорт всех схем
    ├── enums/
    │   ├── Gender.form.ts
    │   └── UserRole.form.ts
    └── Recipe.form.ts      # Model схемы
```

**ВАЖНО:** Стандартный `@core/zod` плагин НЕ используется! Папки `zod/` нет.

## Важные правила

### 1. НИКОГДА не редактируй schema.prisma напрямую

```bash
# ❌ НЕ редактируй
src/generated/schema.prisma

# ✅ Редактируй источник
apps/<app>/schema.zmodel
```

### 2. Перегенерация при изменениях

```bash
# После изменения schema.zmodel
nx zenstack:generate <app>

# Автоматически запускает prisma generate
```

### 3. Импорты из generated

```typescript
// Zod схемы для форм (с @form.* директивами)
import { RecipeCreateFormSchema, RecipeUpdateFormSchema } from '@/generated/form-schemas/Recipe.form'

// Enum схемы с метками
import { GenderFormSchema, GenderLabels } from '@/generated/form-schemas/enums/Gender.form'

// Типы
import type { RecipeCreateForm, RecipeUpdateForm } from '@/generated/form-schemas/Recipe.form'
```

## Формат схем

### form-schemas/ для моделей

Генерируются из @form.\* директив:

```typescript
// Recipe.form.ts
export const RecipeCreateFormSchema = z.object({
  title: z.string().meta({
    ui: { title: 'Название рецепта', placeholder: 'Введите название' },
  }),
  portions: z
    .number()
    .int()
    .min(1)
    .max(100)
    .meta({
      ui: { title: 'Количество порций', fieldType: 'numberInput', fieldProps: { showValue: true } },
    }),
})

export const RecipeUpdateFormSchema = RecipeCreateFormSchema.partial()
export const RecipeExcludedFields = ['id', 'createdAt', 'updatedAt'] as const

export type RecipeCreateForm = z.infer<typeof RecipeCreateFormSchema>
export type RecipeUpdateForm = z.infer<typeof RecipeUpdateFormSchema>
```

### form-schemas/enums/ для enum

```typescript
// Gender.form.ts
export const GenderFormSchema = z.enum(['MALE', 'FEMALE']).meta({
  ui: {
    options: [
      { value: 'MALE', label: 'Мужской' },
      { value: 'FEMALE', label: 'Женский' },
    ],
  },
})

export const GenderLabels = {
  MALE: 'Мужской',
  FEMALE: 'Женский',
} as const
```

## Команды

```bash
# Генерация (schema.zmodel → schema.prisma + form-schemas)
nx zenstack:generate <app>

# После генерации — применить к БД
nx db:push <app>      # Dev
nx db:migrate <app>   # Prod

# Пересобрать плагин (при изменении кода плагина)
nx build zenstack-form-plugin --skip-nx-cache
```

## Конфигурация плагина

В `schema.zmodel`:

```zmodel
plugin formSchema {
  provider = '../../libs/zenstack-form-plugin/dist/index.js'
  output = './src/generated/form-schemas'
}
```
