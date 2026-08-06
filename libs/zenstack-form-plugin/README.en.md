# @letar/zenstack-form-plugin

ZenStack plugin for generating Zod v4 schemas with UI metadata from `schema.zmodel` — works with [@letar/forms](https://www.npmjs.com/package/@letar/forms).

[![npm version](https://img.shields.io/npm/v/@letar/zenstack-form-plugin)](https://www.npmjs.com/package/@letar/zenstack-form-plugin)
[![license](https://img.shields.io/npm/l/@letar/zenstack-form-plugin)](./LICENSE)

[Документация на русском](./README.ru.md)

## Installation

```bash
npm install -D @letar/zenstack-form-plugin
```

## Configuration

Add the plugin to your `schema.zmodel`:

```zmodel
plugin formSchema {
  provider = '@letar/zenstack-form-plugin'
  output = './src/generated/form-schemas'
}
```

### i18n (optional)

For multi-language apps, add i18n options:

```zmodel
plugin formSchema {
  provider = '@letar/zenstack-form-plugin'
  output = './src/generated/form-schemas'

  i18n = true
  i18nOutput = './messages/form-schemas'
  defaultLocale = 'en'
  locales = 'en,ru'
}
```

When `i18n = true`, the plugin:

1. Adds `i18nKey` to `.meta({ ui: { ... } })` for each field
2. Generates JSON translation files for each locale
3. Generates a TypeScript file with key types

## Usage

### Enums with labels

Doc comments `///` before enum values become labels:

```zmodel
enum RecipeType {
  /// Sweet
  SWEET
  /// Salty
  SALTY
}
```

Generates:

```typescript
export const RecipeTypeFormSchema = z.enum(['SWEET', 'SALTY']).meta({
  ui: {
    options: [
      { value: 'SWEET', label: 'Sweet' },
      { value: 'SALTY', label: 'Salty' },
    ],
  },
})
```

### Models with @form.\* directives

Use `///` doc comments **BEFORE** the field (not after!):

```zmodel
model Recipe {
  id        String @id @default(cuid())

  /// @form.title("Recipe name")
  /// @form.placeholder("Enter name")
  title     String

  /// @form.title("Servings")
  /// @form.fieldType("numberInput")
  /// @form.props({ min: 1, max: 100 })
  portions  Int @default(1)

  /// @form.title("Tags")
  /// @form.fieldType("tags")
  tags      String[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Generates:

```typescript
export const RecipeCreateFormSchema = z.object({
  title: z.string().meta({
    ui: { title: 'Recipe name', placeholder: 'Enter name' },
  }),
  portions: z
    .number()
    .int()
    .meta({
      ui: { title: 'Servings', fieldType: 'numberInput', fieldProps: { min: 1, max: 100 } },
    }),
  tags: z.array(z.string()).meta({
    ui: { title: 'Tags', fieldType: 'tags' },
  }),
})

export const RecipeUpdateFormSchema = RecipeCreateFormSchema.partial()
```

### Use with @letar/forms

```tsx
import { Form } from '@letar/forms'
import { RecipeCreateFormSchema } from './generated/form-schemas'
<Form.FromSchema
  schema={RecipeCreateFormSchema}
  initialValue={data}
  onSubmit={handleSubmit}
  submitLabel="Create Recipe"
/>
```

## Supported Directives

| Directive                  | Description       | Example                                      |
| -------------------------- | ----------------- | -------------------------------------------- |
| `@form.title("...")`       | Field label       | `/// @form.title("Name")`                    |
| `@form.placeholder("...")` | Placeholder       | `/// @form.placeholder("Enter...")`          |
| `@form.description("...")` | Helper text       | `/// @form.description("Hint")`              |
| `@form.fieldType("...")`   | Component type    | `/// @form.fieldType("tags")`                |
| `@form.props({...})`       | Constraints/props | `/// @form.props({ min: 1, max: 100 })`      |
| `@form.relation({...})`    | Relation config   | `/// @form.relation({ labelField: "name" })` |
| `@form.exclude`            | Exclude from form | `/// @form.exclude`                          |

## Auto-splitting @form.props

The plugin automatically separates `@form.props` into:

**Zod constraints** — become schema methods:

- `min`, `max`, `step` → `.min()`, `.max()`, `.multipleOf()`
- `minLength`, `maxLength` → `.min()`, `.max()` for strings
- `pattern` → `.regex()`
- `email`, `url`, `uuid` → `.email()`, `.url()`, `.uuid()`

**UI props** — stay in `fieldProps`:

- `count`, `allowHalf` (for rating)
- `showValue`, `layout` (for slider, radioCard)
- Any other props

```zmodel
/// @form.props({ min: 1, max: 100, showValue: true })
portions Int
```

Generates:

```typescript
portions: z.number()
  .int()
  .min(1)
  .max(100)
  .meta({ ui: { fieldProps: { showValue: true } } })
```

## Auto-excluded Fields

- `id` — primary keys
- `createdAt`, `updatedAt` — system fields
- Fields with `@id` attribute
- Fields with `@relation` attribute
- Fields referencing models (e.g. `info RecipeInfo?`)
- Fields with `@form.exclude` directive

> **Note:** FK fields (`categoryId`, `userId`, etc.) are NOT auto-excluded.
> Use `@form.relation` for a select field or `@form.exclude` to skip.

## Supported Prisma Types

| Prisma type | Zod type                        |
| ----------- | ------------------------------- |
| String      | `z.string()`                    |
| Int         | `z.number().int()`              |
| Float       | `z.number()`                    |
| Decimal     | `z.number()`                    |
| BigInt      | `z.bigint()`                    |
| Boolean     | `z.boolean()`                   |
| DateTime    | `z.date()`                      |
| Json        | `z.unknown()`                   |
| Bytes       | `z.unknown()`                   |
| Enum        | `EnumNameFormSchema` (imported) |

## Generated Files

```
src/generated/form-schemas/
├── index.ts               # Re-exports all schemas
├── enums/
│   └── RecipeType.form.ts # Enum schemas with labels
├── Recipe.form.ts         # Model schemas
└── ...
```

## Custom Validation Translations

English and Russian validation messages are built in. For other languages, create a translations file:

```typescript
// i18n/form-validations.js
export default {
  de: {
    invalid_type: 'Erwartet {expected}, erhalten {received}',
    required: 'Pflichtfeld',
    too_small: {
      string: 'Mindestens {minimum} Zeichen',
      number: 'Mindestens {minimum}',
      array: 'Mindestens {minimum} Einträge',
      date: 'Datum muss nach {minimum} liegen',
      set: 'Mindestens {minimum} Einträge',
      file: 'Mindestdateigröße {minimum}',
    },
    too_big: {
      string: 'Maximal {maximum} Zeichen',
      number: 'Maximal {maximum}',
      array: 'Maximal {maximum} Einträge',
      date: 'Datum muss vor {maximum} liegen',
      set: 'Maximal {maximum} Einträge',
      file: 'Maximale Dateigröße {maximum}',
    },
    invalid_format: {
      email: 'Ungültige E-Mail-Adresse',
      url: 'Ungültige URL',
      // ... other formats
    },
    not_multiple_of: 'Muss ein Vielfaches von {multipleOf} sein',
    unrecognized_keys: 'Unbekannte Felder: {keys}',
    invalid_value: 'Ungültiger Wert. Erwartet: {options}',
    invalid_union: 'Ungültige Daten',
    invalid_key: 'Ungültiger Schlüssel',
    invalid_element: 'Ungültiges Element',
    custom: '{message}',
  },
}
```

Then reference it in your schema:

```zmodel
plugin formSchema {
  provider = '@letar/zenstack-form-plugin'
  output = './src/generated/form-schemas'
  i18n = true
  defaultLocale = 'en'
  locales = 'en,de'
  validationTranslationsPath = './i18n/form-validations.js'
}
```

**Resolution order:** custom file → built-in (en, ru) → English fallback.

See the `ValidationTranslations` type export for the full interface.

## Documentation

Full documentation and live examples: **[forms.letar.best](https://forms.letar.best)**

## License

[MIT](./LICENSE)
