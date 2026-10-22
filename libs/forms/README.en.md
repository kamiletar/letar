# @letar/forms

Declarative form components for React with **40+ field types**, powered by [TanStack Form](https://tanstack.com/form) and [Chakra UI v3](https://chakra-ui.com).

[![npm version](https://img.shields.io/npm/v/@letar/forms)](https://www.npmjs.com/package/@letar/forms)
[![license](https://img.shields.io/npm/l/@letar/forms)](./LICENSE)

[Документация на русском](./README.ru.md)

Upgrading from 2.x: [docs/MIGRATION-3.md](./docs/MIGRATION-3.md) (in Russian).

## Quick Start

```bash
npm install @letar/forms@next @tanstack/react-form @chakra-ui/react zod framer-motion react-icons
```

`@next` is the 3.x channel. Until 3.x is promoted to `latest`, `@letar/forms` without a tag installs the old 1.x line.

```tsx
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

const Schema = z.object({
  title: z
    .string()
    .min(2)
    .meta({ ui: { title: 'Title', placeholder: 'Enter...' } }),
  rating: z
    .number()
    .min(0)
    .max(10)
    .meta({ ui: { title: 'Rating' } }),
})

function MyForm() {
  return (
    <Form schema={Schema} initialValue={{ title: '', rating: 5 }} onSubmit={save}>
      <Form.Field.String name="title" />
      <Form.Field.Number name="rating" />
      <Form.Button.Submit>Save</Form.Button.Submit>
    </Form>
  )
}
```

**Or fully auto-generated from schema:**

```tsx
<Form.FromSchema schema={Schema} initialValue={data} onSubmit={handleSubmit} submitLabel="Create" />
```

## Philosophy: Separate Layout from Logic

| Aspect          | Where defined              | How used in JSX                 |
| --------------- | -------------------------- | ------------------------------- |
| **Validation**  | Zod schema                 | `schema={Schema}`               |
| **UI metadata** | Zod `.meta({ ui: {...} })` | Auto-extracted from schema      |
| **Structure**   | TypeScript types           | `initialValue={data}`           |
| **Layout**      | JSX                        | `<HStack>`, `<VStack>`, `<Box>` |

**Result:** JSX contains only layout and field names. All logic lives in the schema.

## Features

### Recoverable drafts

Use `<Form persistence={{ key: 'author-record-id', excludeFields: ['password'] }}>` for local
JSON drafts. Since v2.40.1, restoring keeps the copy for another reload until successful submission,
explicit discard, reverting to initial values, or TTL expiry. Pending writes flush on page exit and
unmount; `debounceMs: 0` writes synchronously. The restore dialog focuses Restore and requires an
explicit choice. Include author and record IDs in editor keys. File contents and unavailable
localStorage are outside this recovery mechanism.

### 40+ Field Components

```tsx
// Text
<Form.Field.String name="title" />
<Form.Field.Textarea name="description" />
<Form.Field.RichText name="content" />
<Form.Field.Password name="password" />

// Numbers
<Form.Field.Number name="price" />
<Form.Field.Slider name="rating" />
<Form.Field.Currency name="amount" />

// Selection
<Form.Field.Select name="category" />
<Form.Field.Combobox name="search" />
<Form.Field.RadioGroup name="type" />
<Form.Field.Checkbox name="agree" />

// Date & Time
<Form.Field.Date name="birthday" />
<Form.Field.DateRange name="period" />
<Form.Field.Time name="time" />

// Specialized
<Form.Field.Phone name="phone" />
<Form.Field.FileUpload name="avatar" />
<Form.Field.ColorPicker name="color" />
<Form.Field.PinInput name="code" />
```

### Conditional Rendering

```tsx
<Form schema={Schema} initialValue={data} onSubmit={save}>
  <Form.Field.Select name="type" />

  <Form.When field="type" is="company">
    <Form.Field.String name="companyName" />
  </Form.When>

  <Form.Button.Submit />
</Form>
```

### Multi-Step Forms

```tsx
<Form schema={Schema} initialValue={data} onSubmit={save}>
  <Form.Steps animated validateOnNext>
    <Form.Steps.Step title="Personal Info">
      <Form.Field.String name="name" />
      <Form.Field.String name="email" />
    </Form.Steps.Step>

    <Form.Steps.Step title="Address">
      <Form.Field.String name="city" />
      <Form.Field.String name="street" />
    </Form.Steps.Step>

    <Form.Steps.Navigation />
  </Form.Steps>
</Form>
```

### Groups and Arrays

```tsx
// Nested object
<Form.Group name="address">
  <Form.Field.String name="city" />    {/* → address.city */}
  <Form.Field.String name="street" />  {/* → address.street */}
</Form.Group>

// Array of items
<Form.Group.List name="phones">
  <Form.Field.Phone />
  <Form.Group.List.Button.Add>Add Phone</Form.Group.List.Button.Add>
</Form.Group.List>
```

### Auto Constraints from Zod

```tsx
const Schema = z.object({
  title: z.string().min(2).max(100),  // → minLength={2} maxLength={100}
  email: z.string().email(),          // → type="email"
  rating: z.number().min(1).max(10),  // → min={1} max={10}
})

// DRY: validation and UI constraints in one place
<Form.Field.String name="title" />  {/* maxLength={100} from schema */}
```

### Error Summary

```tsx
<Form schema={Schema} initialValue={data} onSubmit={save}>
  <Form.Field.String name="name" />
  <Form.Field.String name="email" />

  <Form.Errors title="Please fix:" />
  <Form.Button.Submit />
</Form>
```

### Address Provider

Address and city fields support pluggable geocoding providers. DaData (Russia) is built-in:

```tsx
import { createDaDataProvider, createForm } from '@letar/forms'

// Option 1: Set once via createForm (recommended)
const AppForm = createForm({
  addressProvider: createDaDataProvider({ token: process.env.DADATA_TOKEN }),
})

<AppForm.Field.Address name="address" />
<AppForm.Field.City name="city" />

// Option 2: Per-field provider
<Form.Field.Address name="address" provider={myProvider} />

// Option 3: Backward compatible token prop
<Form.Field.Address name="address" token="dadata-token" />
```

Custom provider — implement the `AddressProvider` interface:

```typescript
import type { AddressProvider } from '@letar/forms'

const googlePlaces: AddressProvider = {
  async getSuggestions(query, options) {
    const res = await fetch(`/api/places?q=${query}&limit=${options?.count ?? 10}`)
    const data = await res.json()
    return data.map((item) => ({
      label: item.description,
      value: item.description,
      data: item.structured,
    }))
  },
}
```

### createForm — App-Level Customization

Create an extended Form with app-specific fields, selects, and address provider:

```tsx
import { createForm, createDaDataProvider } from '@letar/forms'
import { SelectCategory } from './selects/select-category'

const AppForm = createForm({
  addressProvider: createDaDataProvider({ token: '...' }),
  extraSelects: { Category: SelectCategory },
})

// Usage — all customizations applied automatically
<AppForm initialValue={data} onSubmit={save}>
  <AppForm.Field.Address name="address" />
  <AppForm.Select.Category name="categoryId" />
  <AppForm.Button.Submit />
</AppForm>
```

## Subpath Exports

```tsx
// Offline support (PWA)
import { FormOfflineIndicator, useOfflineForm } from '@letar/forms/offline'

// Internationalization
import { FormI18nProvider, useFormI18n } from '@letar/forms/i18n'
```

### Pluggable heavy fields (3.0.0)

`RichText`, `DataGrid`, `TableEditor` and drag-and-drop lists are not part of the core. Register the fields in
`createForm`; the key must match the field name. Each subpath needs its own optional peer packages.

```tsx
import { createForm } from '@letar/forms'
import { FieldDataGrid } from '@letar/forms/data-grid' // @tanstack/react-table, react-virtual
import { FieldRichText } from '@letar/forms/rich-text' // @tiptap/*
import { SortableGroupList } from '@letar/forms/sortable' // @dnd-kit/*
import { FieldTableEditor } from '@letar/forms/table-editor' // @dnd-kit/*

export const AppForm = createForm({
  extraFields: { RichText: FieldRichText, DataGrid: FieldDataGrid, TableEditor: FieldTableEditor },
})
```

`AppForm.Field.RichText` without registration is a type error; `fieldType: 'richText'` in auto forms falls back to
a Textarea and logs one dev warning per field.

## Peer Dependencies

Six peers are required: `react`, `@chakra-ui/react`, `@tanstack/react-form`, `framer-motion`, `react-icons`, `zod`.
Everything else is optional and needed only by its subpath.

| Package                                  | Version   | Required for                            |
| ---------------------------------------- | --------- | --------------------------------------- |
| `react`                                  | >= 18.0.0 | Always                                  |
| `@tanstack/react-form`                   | >= 1.0.0  | Always                                  |
| `@chakra-ui/react`                       | >= 3.0.0  | Always                                  |
| `framer-motion`                          | >= 10.0.0 | Always                                  |
| `react-icons`                            | >= 5.0.0  | Always                                  |
| `zod`                                    | ^4.0.0    | Always                                  |
| `@tiptap/*`                              | >= 3.0.0  | Optional (`@letar/forms/rich-text`)     |
| `@dnd-kit/*`                             | >= 6.0.0  | Optional (`/sortable`, `/table-editor`) |
| `@tanstack/react-table`, `react-virtual` | >= 8 / 3  | Optional (`@letar/forms/data-grid`)     |
| `@uiw/react-json-view`                   | >= 2.0.0  | Optional (`@letar/forms/debug`)         |
| `idb-keyval`                             | >= 6.0.0  | Optional (`@letar/forms/offline`)       |

## Documentation

Full documentation and live examples: **[forms.letar.best](https://forms.letar.best)**

## License

[MIT](./LICENSE)

---

**Version:** 0.58.0
