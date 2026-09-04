# @letar/zenstack-form-plugin

ZenStack plugin for generating Zod v4 schemas with UI metadata from `schema.zmodel` — works with [@letar/forms](https://www.npmjs.com/package/@letar/forms).

[![npm version](https://img.shields.io/npm/v/@letar/zenstack-form-plugin)](https://www.npmjs.com/package/@letar/zenstack-form-plugin)
[![license](https://img.shields.io/npm/l/@letar/zenstack-form-plugin)](./LICENSE)

[Документация на русском](./README.ru.md)

> **v3.0.0 (Phase 3):** the primary syntax for form metadata is now the field-level attribute
> `@meta("form.*", value)`, placed directly on the field in `schema.zmodel`. The old `///
> @form.*(...)` doc-comment directive still works (see "Legacy syntax" below), but is deprecated.

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

### Models with `@meta("form.*", value)` directives

Since Phase 3 (v3.0.0), the primary syntax is the **field attribute** `@meta`, placed directly on
the field — no doc comment needed:

```zmodel
model Recipe {
  id        String @id @default(cuid())

  title     String @meta("form.title", "Recipe name") @meta("form.placeholder", "Enter name")

  portions  Int @default(1) @gte(1) @lte(100)
    @meta("form.title", "Servings") @meta("form.fieldType", "numberInput")

  tags      String[] @meta("form.title", "Tags") @meta("form.fieldType", "tags")

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
    .min(1)
    .max(100)
    .meta({
      ui: { title: 'Servings', fieldType: 'numberInput' },
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

## Supported `@meta` Keys

| Key `@meta("form.<key>", …)` | Description       | Example                                     |
| ---------------------------- | ----------------- | ------------------------------------------- |
| `form.title`                 | Field label       | `@meta("form.title", "Name")`               |
| `form.placeholder`           | Placeholder       | `@meta("form.placeholder", "Enter...")`     |
| `form.description`           | Helper text       | `@meta("form.description", "Hint")`         |
| `form.fieldType`             | Component type    | `@meta("form.fieldType", "tags")`           |
| `form.props.<dotpath>`       | Constraints/props | `@meta("form.props.min", 1)`                |
| `form.relation.<dotpath>`    | Relation config   | `@meta("form.relation.labelField", "name")` |
| `form.exclude`               | Exclude from form | `@meta("form.exclude", true)`               |

⚠️ **An object literal in `@meta` breaks `zenstack generate` entirely**
(`Unhandled error: Unsupported attribute arg value: ObjectExpr`) — this is an upstream limitation
of ZenStack's own TS-schema generator, not a plugin bug. That's why `form.props`/`form.relation`,
which used to take an object (`@form.props({ min: 1, max: 100 })`), are now expressed as a **flat
dot-path**, one `@meta` call per key:

```zmodel
// ❌ Breaks generate entirely
portions Int @meta("form.props", { min: 1, max: 100 })

// ✅ Works
portions Int @meta("form.props.min", 1) @meta("form.props.max", 100)
```

Scalars (string/number/boolean) and arrays work fine in `@meta` — only a bare object literal is
blocked.

### Legacy syntax (`///` doc comment) — deprecated but still working

The old `///` doc-comment syntax before a field still works — the plugin reads **both**, and
`@meta` wins on conflict for the same metadata key on one field. `nx zenstack:generate` prints a
deprecation warning when it finds `@form.*`, but the build doesn't break:

```zmodel
model Recipe {
  id        String @id @default(cuid())

  /// @form.title("Recipe name")
  /// @form.placeholder("Enter name")
  title     String

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Write new code with `@meta`; migrate existing schemas with the idempotent codemod
`scripts/codemods/codemod-form-directives.mjs` (`--dry-run` for a preview) rather than rewriting
directives by hand.

| Legacy directive           | `@meta` equivalent                            |
| -------------------------- | --------------------------------------------- |
| `@form.title("...")`       | `@meta("form.title", "...")`                  |
| `@form.placeholder("...")` | `@meta("form.placeholder", "...")`            |
| `@form.description("...")` | `@meta("form.description", "...")`            |
| `@form.fieldType("...")`   | `@meta("form.fieldType", "...")`              |
| `@form.props({...})`       | `@meta("form.props.<key>", value)` per key    |
| `@form.relation({...})`    | `@meta("form.relation.<key>", value)` per key |
| `@form.exclude`            | `@meta("form.exclude", true)`                 |

## Auto-splitting `form.props`

The plugin automatically separates `form.props` keys into:

**Zod constraints** — become schema methods:

- `min`, `max`, `step` → `.min()`, `.max()`, `.multipleOf()`
- `minLength`, `maxLength` → `.min()`, `.max()` for strings
- `pattern` → `.regex()`
- `email`, `url`, `uuid` → `.email()`, `.url()`, `.uuid()`

**UI props** — stay in `fieldProps`:

- `count`, `allowHalf` (for rating)
- `showValue`, `layout` (for slider, radioCard)
- Any other props

> Prefer setting constraints (`min`/`max`/`pattern`/`email`/...) via native ZModel attributes
> (`@gte`/`@lte`/`@regex`/`@email`) instead — the ORM already applies them through
> `@zenstackhq/zod`, so the form inherits the same constraints from one source. `form.props` for
> constraints remains a working escape hatch for intentional client/server divergence, not the
> primary path.

```zmodel
portions Int @meta("form.props.min", 1) @meta("form.props.max", 100) @meta("form.props.showValue", true)
```

Generates:

```typescript
portions: z.number()
  .int()
  .min(1)
  .max(100)
  .meta({ ui: { fieldProps: { showValue: true } } })
```

### Custom error text — trailing positional `message`, not `@meta` (v3.1.0)

Native ZModel validation attributes (`@gte`, `@gt`, `@lte`, `@lt`, `@length`, `@email`, `@url`,
`@regex`, ...) accept an optional trailing string argument. When present, it becomes the error
message for that specific check when the generated Zod schema rejects the value:

```zmodel
price Int @gte(0, "Price cannot be negative")
```

Generates:

```typescript
price: applyNativeMessages(
  z.number().int().gte(0),
  [{ count: 1 }, { count: 1, message: 'Price cannot be negative' }],
)
```

(`applyNativeMessages` is a small helper emitted inline into the generated file itself — the
output has no runtime dependency on `@letar/zenstack-form-plugin`.)

`@length(min, max, message)` sets one shared message for **both** bounds — a single string
argument, not a pair, since `@length` maps to two Zod checks (`min_length`/`max_length`) from one
attribute:

```zmodel
title String @length(2, 100, "Title must be 2–100 characters")
```

⚠️ Only literal string messages are supported in this release. i18n-key-based resolution
(analogous to how `title`/`placeholder` resolve through `i18nKey` for `@letar/forms`) is **not**
implemented yet — that remains a deliberate scope cut, not an oversight. `Decimal`-typed fields are
also out of scope: they don't go through the same `ZodUtils.*` codepath and have no message
support.

## Auto-excluded Fields

- `id` — primary keys
- `createdAt`, `updatedAt` — system fields
- Fields with `@id` attribute
- Fields with `@relation` attribute
- Fields referencing models (e.g. `info RecipeInfo?`)
- Fields with `@meta("form.exclude", true)` (or legacy `/// @form.exclude`)

> **Note:** FK fields (`categoryId`, `userId`, etc.) are NOT auto-excluded.
> Use `form.relation` for a select field or `form.exclude` to skip.

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

## Version

Current version: **3.0.0** (Phase 3: `@meta("form.*", value)` as the primary syntax). Full
history — see [package.json](package.json) and [CHANGELOG.md](CHANGELOG.md).

## Documentation

Full documentation and live examples: **[forms.letar.best](https://forms.letar.best)**

## License

[MIT](./LICENSE)
