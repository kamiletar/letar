/** Available form patterns */
export type FormPattern =
  | 'crud-create'
  | 'crud-edit'
  | 'multi-step'
  | 'offline'
  | 'i18n'
  | 'from-schema'
  | 'declarative'
  | 'server-action'
  | 'analytics'
  | 'server-errors'
  | 'undo-redo'
  | 'reference-select'
  | 'reference-zenstack'

/** Form pattern description */
export interface PatternInfo {
  name: FormPattern
  title: string
  description: string
  /** TSX code example */
  example: string
}

/** Form pattern registry — code templates for common scenarios */
const PATTERNS: PatternInfo[] = [
  {
    name: 'crud-create',
    title: 'CRUD: Create Record',
    description: 'Form for creating a new record with validation and Server Action',
    example: `import { z } from 'zod/v4'
import { useAppForm } from '@letar/forms'

const CreateSchema = z.object({
  name: z.string().min(1, 'Required field'),
  email: z.email('Invalid email'),
}).strip()

type CreateForm = z.infer<typeof CreateSchema>

export function CreateEntityForm({ onSubmit }: { onSubmit: (data: CreateForm) => Promise<void> }) {
  const form = useAppForm({
    schema: CreateSchema,
    defaultValues: { name: '', email: '' },
    onSubmit: async ({ value }) => {
      await onSubmit(value)
    },
  })

  return (
    <Form form={form}>
      <Form.Field.String name="name" label="Name" required />
      <Form.Field.String name="email" label="Email" required />
      <Form.Button.Submit>Create</Form.Button.Submit>
    </Form>
  )
}`,
  },
  {
    name: 'crud-edit',
    title: 'CRUD: Edit Record',
    description: 'Edit form with initial data loading',
    example: `import { z } from 'zod/v4'
import { useAppForm } from '@letar/forms'

const UpdateSchema = z.object({
  name: z.string().min(1, 'Required field'),
  email: z.email('Invalid email'),
}).strip()

export function EditEntityForm({ entity, onSubmit }: { entity: Entity; onSubmit: (data: UpdateForm) => Promise<void> }) {
  const form = useAppForm({
    schema: UpdateSchema,
    defaultValues: { name: entity.name, email: entity.email },
    onSubmit: async ({ value }) => {
      await onSubmit(value)
    },
  })

  return (
    <Form form={form}>
      <Form.Field.String name="name" label="Name" required />
      <Form.Field.String name="email" label="Email" required />
      <Form.Button.Submit>Save</Form.Button.Submit>
    </Form>
  )
}`,
  },
  {
    name: 'multi-step',
    title: 'Multi-step Form',
    description: 'Form with multiple steps and per-step validation',
    example: `<Form form={form}>
  <Form.Steps validateOnNext animated>
    <Form.Steps.Step title="General">
      <Form.Field.String name="name" label="Name" required />
      <Form.Field.String name="email" label="Email" required />
    </Form.Steps.Step>
    <Form.Steps.Step title="Details">
      <Form.Field.Textarea name="bio" label="About" />
      <Form.Field.Phone name="phone" label="Phone" />
    </Form.Steps.Step>
    <Form.Steps.Step title="Confirmation">
      <Form.DebugValues />
    </Form.Steps.Step>
  </Form.Steps>
  <Form.Button.Submit>Done</Form.Button.Submit>
</Form>`,
  },
  {
    name: 'offline',
    title: 'Offline Form',
    description: 'Form with offline mode support and synchronization',
    example: `import { useOfflineForm, FormOfflineIndicator, FormSyncStatus } from '@letar/forms'

function OfflineForm() {
  const form = useOfflineForm({
    schema: MySchema,
    storageKey: 'my-form',
    syncAction: async (data) => await saveToServer(data),
  })

  return (
    <Form form={form}>
      <FormOfflineIndicator />
      <Form.Field.String name="title" label="Title" />
      <Form.Button.Submit>Save</Form.Button.Submit>
      <FormSyncStatus />
    </Form>
  )
}`,
  },
  {
    name: 'i18n',
    title: 'Multilingual Form',
    description: 'Form with i18n support via FormI18nProvider',
    example: `import { FormI18nProvider } from '@letar/forms'

function LocalizedForm() {
  return (
    <FormI18nProvider locale="ru" messages={ruMessages}>
      <Form form={form}>
        <Form.Field.String name="name" label="Name" required />
      </Form>
    </FormI18nProvider>
  )
}`,
  },
  {
    name: 'from-schema',
    title: 'Auto-generation from Schema',
    description: 'Form automatically generated from a Zod schema with UI metadata',
    example: `import { UserCreateFormSchema } from '@/generated/form-schemas/User.form'

// Full auto-generation — single line
<Form form={form}>
  <Form.FromSchema schema={UserCreateFormSchema} />
  <Form.Button.Submit>Create</Form.Button.Submit>
</Form>

// Partial — selected fields
<Form form={form}>
  <Form.AutoFields schema={UserCreateFormSchema} include={['name', 'email']} />
  <Form.Field.Custom name="avatar" label="Avatar">
    <CustomAvatarUpload />
  </Form.Field.Custom>
  <Form.Button.Submit>Create</Form.Button.Submit>
</Form>`,
  },
  {
    name: 'declarative',
    title: 'Declarative API',
    description: 'Full declarative API with conditional fields and groups',
    example: `<Form form={form}>
  <Form.Group title="General Information">
    <Form.Field.String name="name" label="Name" required />
    <Form.Field.Select name="type" label="Type" options={typeOptions} />
  </Form.Group>

  <Form.When name="type" is="company">
    <Form.Group title="Company Details">
      <Form.Field.String name="companyName" label="Company Name" />
      <Form.Field.String name="inn" label="Tax ID" />
    </Form.Group>
  </Form.When>

  <Form.Group.List name="contacts" title="Contacts" addLabel="Add contact">
    <Form.Field.String name="phone" label="Phone" />
    <Form.Field.String name="email" label="Email" />
  </Form.Group.List>

  <Form.Errors />
  {/* or once for the whole instance: createForm({ dirtyGuard: true }); off per form: dirtyGuard={false} */}
  <Form.DirtyGuard message="You have unsaved changes" />
  <Form.Button.Submit>Save</Form.Button.Submit>
</Form>`,
  },
  {
    name: 'server-action',
    title: 'Server Action Integration',
    description: 'Form calling a Server Action directly from onSubmit',
    example: `// actions.ts
'use server'
import { CreateSchema } from './_schemas/create.schema'

export async function createEntity(formData: unknown) {
  const parsed = CreateSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.flatten() }
  const db = await getEnhancedPrisma()
  await db.entity.create({ data: parsed.data })
  return { success: true }
}

// form.tsx
const form = useAppForm({
  schema: CreateSchema,
  defaultValues: { name: '' },
  onSubmit: async ({ value }) => {
    const result = await createEntity(value)
    if (result.error) { /* handle errors */ }
  },
})`,
  },
  {
    name: 'analytics' as FormPattern,
    title: 'Form with Analytics',
    description:
      'Track field-level user behavior: drop-offs, time per field, completion rates. Supports Umami, Yandex Metrika, GA4, PostHog adapters.',
    example: `import { AnalyticsPanel, createUmamiAdapter, useFormAnalytics } from '@letar/forms'
import { z } from 'zod/v4'

const ContactSchema = z.object({
  name: z.string().min(2).meta({ ui: { title: 'Name' } }),
  email: z.string().email().meta({ ui: { title: 'Email' } }),
  message: z.string().max(1000).meta({ ui: { title: 'Message' } }),
})

function ContactForm() {
  const analytics = useFormAnalytics({
    formId: 'contact',
    adapters: [createUmamiAdapter()],
  })

  return (
    <Form schema={ContactSchema} initialValue={{ name: '', email: '', message: '' }} onSubmit={save}>
      <Form.Field.String name="name" />
      <Form.Field.String name="email" />
      <Form.Field.Textarea name="message" />
      <Form.Button.Submit>Send</Form.Button.Submit>
      {process.env.NODE_ENV === 'development' && <AnalyticsPanel analytics={analytics} />}
    </Form>
  )
}`,
  },
  {
    name: 'server-errors' as FormPattern,
    title: 'Server Error Mapping',
    description:
      'Auto-map Prisma, ZenStack, Zod server errors to form fields. Supports P2002 (unique), P2003 (FK), policy rejection, Zod flatten, ActionResult. A Server Action must RETURN an expected failure as a value (actionFailure / catchActionFailure) — production Next.js strips the text of a thrown error; useFormServerAction.run rethrows it on the client.',
    example: `import { applyServerErrors, mapServerErrors } from '@letar/forms'

<Form schema={UserSchema} onSubmit={async ({ value }) => {
  try {
    await createUser(value)
  } catch (error) {
    const mapped = mapServerErrors(error, {
      fieldMap: {
        email: { field: 'email', message: 'This email is already registered' },
      },
    })
    applyServerErrors(form, mapped)
  }
}}>
  <Form.Field.String name="email" />
  <Form.Field.String name="name" />
  <Form.Errors />
  <Form.Button.Submit>Create</Form.Button.Submit>
</Form>

// Server Action: return an expected failure as a VALUE (thrown text is stripped in production)
'use server'
import { catchActionFailure, UserFacingError } from '@letar/forms/server-errors'

export async function createUser(input: UserInput) {
  return catchActionFailure(async () => {
    if (await isBanned(input.email)) throw new UserFacingError('Registration is closed', 'email')
    return db.user.create({ data: input, select: { id: true } })
  }, { uniqueMessages: { email: 'This email is already registered' } })
}

// Client: run() recognises the returned failure, puts it under the field + <Form.Errors />
const formRef = useFormRef()
const { run, pending } = useFormServerAction(formRef, { toaster })
await run(() => createUser(data))`,
  },
  {
    name: 'undo-redo' as FormPattern,
    title: 'Undo/Redo Form',
    description:
      'Ctrl+Z/Ctrl+Y history for forms. Debounced snapshots, keyboard shortcuts, optional sessionStorage persistence.',
    example: `import { HistoryControls, useFormHistory } from '@letar/forms'

function ProductEditor() {
  const form = useDeclarativeForm()
  const history = useFormHistory(form, {
    maxHistory: 50,
    debounceMs: 500,
    keyboard: true,
  })

  return (
    <Form schema={ProductSchema} onSubmit={save}>
      <HistoryControls history={history} showCounter />
      <Form.Field.String name="title" />
      <Form.Field.RichText name="description" />
      <Form.Field.Currency name="price" />
      <Form.Button.Submit>Save</Form.Button.Submit>
    </Form>
  )
}`,
  },
  {
    name: 'reference-select' as FormPattern,
    title: 'Dictionary field by a key from the schema',
    description:
      'A dictionary (category, unit, counterparty) with its own create/edit dialog is written once as a component and '
      + 'registered in createForm. The schema points at it with `form.fieldType = "Select.<Name>"`, so Form.AutoFields, '
      + 'Form.Field.Auto and a hand-written <AppForm.Select.<Name>> use the same component. Needs @letar/forms >= 2.25.0 '
      + 'and @letar/zenstack-form-plugin >= 4.2.0. If the field is used only in auto forms and needs only labels or a short '
      + 'onCreate without a dialog, `form.relation.*` + RelationConfig.fieldProps is lighter.',
    example: `// schema.zmodel — the key lives in the schema
model Work {
  id         String @id @default(cuid())
  categoryId String @meta("form.fieldType", "Select.WorkCategory") @meta("form.props.createItem", false)
}

// src/app-form/app-form.tsx — register the component; typecheck checks the keys of the schema
import { createForm, type FormRegistryCheck } from '@letar/forms'
import type { FormComboboxKey, FormSelectKey } from '@/generated/form-schemas'

export const AppForm = createForm({
  lazySelects: {
    WorkCategory: () => import('./selects/work-category-select').then((m) => m.WorkCategorySelect),
  },
})

// Not every key from schema.zmodel is registered → compile error listing the missing keys
export const appFormRegistryCheck: FormRegistryCheck<typeof AppForm, FormSelectKey, FormComboboxKey> = true

// Form: the field is drawn by AppForm.Select.WorkCategory
<AppForm schema={WorkCreateFormSchema} initialValue={initial} onSubmit={save}>
  <AppForm.AutoFields />
</AppForm>`,
  },
  {
    name: 'reference-zenstack' as FormPattern,
    title: 'Dictionary from ZenStack / TanStack Query with optimistic create',
    description:
      'A Select over a ZenStack dictionary: options from useFindMany, create and edit in the app dialog, an optimistic '
      + 'create (the record is visible and selected at once, the form submit waits for the server). '
      + 'useZenStackOptions marks the temporary `$optimistic` rows of ZenStack as pending. Return the SERVER answer from '
      + 'onCreate/onUpdate, not the dialog input. Needs @letar/forms >= 2.24.0 and @letar/forms-query >= 0.2.0.',
    example: `'use client'
import { useZenStackOptions } from '@letar/forms-query/zenstack'
import { useClientQueries } from '@zenstackhq/tanstack-query/react'

export function WorkCategorySelect(props: { name: string; label?: string }) {
  const client = useClientQueries(schema)
  // options + loading; $optimistic rows → pending (visible, not selectable), data = the record
  const categories = useZenStackOptions(
    client.workCategory.useFindMany({ orderBy: { name: 'asc' } }),
    (c) => ({ label: c.name, value: c.id }),
  )
  const create = client.workCategory.useCreate({ optimisticUpdate: true })
  const update = client.workCategory.useUpdate()
  const dialog = useWorkCategoryDialog() // the app dialog: a Promise + resolver, its own AppForm inside

  return (
    <Form.Field.Select
      {...props}
      {...categories.fieldProps}
      onCreate={async (search, { optimistic }) => {
        const input = await dialog.open({ name: search })
        if (!input) { return null }
        optimistic({ label: input.name }) // the dialog is closed — the record is visible and selected now
        const created = await create.mutateAsync({ data: input }) // the server answer, not input
        return { label: created.name, value: created.id, data: created }
      }}
      onUpdate={async (option) => {
        const input = await dialog.open(option.data)
        if (!input) { return null }
        const saved = await update.mutateAsync({ where: { id: String(option.value) }, data: input })
        return saved ? { label: saved.name, value: saved.id, data: saved } : null
      }}
      onSettleError={(info) => toast.error('Could not save: ' + info.preview.label)}
    />
  )
}`,
  },
]

/** Builds the pattern registry */
export function buildPatternRegistry(): Map<FormPattern, PatternInfo> {
  const registry = new Map<FormPattern, PatternInfo>()
  for (const pattern of PATTERNS) {
    registry.set(pattern.name, pattern)
  }
  return registry
}

/** Returns a pattern by name or all patterns */
export function getPatterns(registry: Map<FormPattern, PatternInfo>, name?: string): PatternInfo[] {
  if (name) {
    const pattern = registry.get(name as FormPattern)
    return pattern ? [pattern] : []
  }
  return Array.from(registry.values())
}
