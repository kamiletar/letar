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
  | 'dependent-select'

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
      + 'onCreate without a dialog, `form.relation.*` + RelationConfig.fieldProps is lighter. With @letar/forms >= 2.26.0 and plugin >= 4.3.0 '
      + 'the key is often not needed at all: for an FK field and an enum field the plugin writes `ui.registryName` (model / enum name), '
      + 'and auto forms render `AppForm.Select.<ModelOrEnum>` when it is registered (otherwise the ordinary field, no error). '
      + 'Only Select is picked by name; Combobox/Listbox need the explicit key. Opt out with any `form.fieldType`.',
    example: `// schema.zmodel — the key lives in the schema
model Work {
  id         String @id @default(cuid())
  categoryId String @meta("form.fieldType", "Select.WorkCategory") @meta("form.props.createItem", false)
}

// src/app-form/app-form.tsx — register the component; typecheck checks the keys of the schema
import { createForm, type FormRegistryCheck, type FormRegistryUnregistered } from '@letar/forms'
import type { FormComboboxKey, FormSelectKey } from '@/generated/form-schemas'

export const AppForm = createForm({
  lazySelects: {
    WorkCategory: () => import('./selects/work-category-select').then((m) => m.WorkCategorySelect),
  },
})

// Not every key from schema.zmodel is registered → compile error listing the missing keys
export const appFormRegistryCheck: FormRegistryCheck<typeof AppForm, FormSelectKey, FormComboboxKey> = true

// Without an explicit key (forms >= 2.26.0, plugin >= 4.3.0): a categoryId field with @relation to WorkCategory and an enum
// field are matched by name. Which candidates from the schema still have no component (info, not a check):
import type { FormSelectCandidate } from '@/generated/form-schemas'
type Unregistered = FormRegistryUnregistered<typeof AppForm, FormSelectCandidate> // 'Unit' | 'Status' | never

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
  {
    name: 'dependent-select' as FormPattern,
    title: 'Dependent (cascading) selects: country -> city, company -> employee',
    description:
      'A Select or Combobox whose list depends on another field: `dependsOn="countryId"`. The parent values arrive as `deps` in every loader '
      + '(`loadOptions(search, { signal, deps })`, `loadSelected`, `useQuery(search, deps)`, `useSelected(value, deps)`) and in `onCreate/onUpdate(…, { deps })` — '
      + 'the create dialog gets the parent that was selected on click. The field is disabled until the parents are set and is cleared only when the USER edits a parent '
      + '(hydration, reset, a restored draft do not clear it); a parent change aborts the previous request. Chain: country -> region -> city clears both children in one batch. '
      + 'An array row refers to a root field with a leading "/": `dependsOn="/countryId"`; a bare name is a field of the same row. '
      + 'The form does not guarantee the pair: the server must check it (`city.countryId === countryId`) and return the error of the CHILD field via `errorMap.onServer` '
      + '(a Server Action returns it as a value, see the server-errors pattern) — the message appears under "City". '
      + 'From a schema: `@meta("form.dependsOn", "countryId")` (plus a registry key `form.fieldType = "Select.City"` to filter the list in auto forms). '
      + 'Needs @letar/forms >= 2.27.0; the TanStack Query adapters — @letar/forms-query >= 0.3.0. Not for the deprecated CascadingSelect.',
    example: `// 1. Promise source: Country -> City (a Select loads once per parent value)
<Form.Field.Select
  name="countryId"
  loadOptions={(_search, { signal }) => fetchCountries(signal)}
  getLabel={(c) => c.name}
  getValue={(c) => c.id}
/>
<Form.Field.Combobox
  name="cityId"
  dependsOn="countryId"
  loadOptions={(search, { signal, deps }) => searchCities({ countryId: deps.countryId, search }, signal)}
  loadSelected={(value, { signal, deps }) => getCity(value, deps.countryId, signal)}
  getLabel={(c) => c.name}
  getValue={(c) => c.id}
  // deps is a snapshot at the click: the dialog gets the country that was selected
  onCreate={async (search, { deps }) => {
    const city = await openCityDialog({ countryId: deps.countryId, name: search })
    return city ? { label: city.name, value: city.id, data: city } : null
  }}
/>

// A chain: the region depends on the country, the city on the region. A new country clears both (one batch, no request for cities)
<Form.Field.Select name="regionId" dependsOn="countryId" loadOptions={(_s, { signal, deps }) => fetchRegions(deps.countryId, signal)} ... />
<Form.Field.Combobox name="cityId" dependsOn="regionId" loadOptions={...} ... />

// Select from a loaded list: a function of deps filters without a request (category -> subcategory)
<Form.Field.Select name="subcategoryId" dependsOn="categoryId" options={(deps) => allSubcategories.filter((s) => s.categoryId === deps.categoryId)} />

// 2. ZenStack + TanStack Query: Company -> Employee (@letar/forms-query)
import { fromSearchQuery, fromSelectedQuery, type SearchQueryOptions, useInvalidateAfter } from '@letar/forms-query'

// The field calls useQuery(search, deps); the adapter gives the hook (search, options, deps),
// options.enabled = minChars passed AND the parents are ready — no request while the company is empty
function useEmployeeSearch(search: string, options: SearchQueryOptions, deps: { companyId?: string }) {
  const client = useClientQueries(schema)
  return client.employee.useFindMany(
    { where: { companyId: deps.companyId, name: { contains: search, mode: 'insensitive' } }, take: 20 },
    options,
  )
}
const searchEmployees = fromSearchQuery(useEmployeeSearch)

function EmployeeCombobox() {
  // a mutation outside the ZenStack hooks (a server action): invalidate only the list of the company where the record was created
  const invalidateAfter = useInvalidateAfter((ctx) => [['employees', ctx.deps.companyId]])
  return (
    <Form.Field.Combobox
      name="employeeId"
      dependsOn="companyId"
      useQuery={searchEmployees}
      useSelected={fromSelectedQuery(useEmployeeById)}
      getLabel={(e) => e.name}
      getValue={(e) => e.id}
      onCreate={invalidateAfter(async (search, { deps }) => createEmployeeViaDialog({ companyId: deps.companyId, name: search }))}
    />
  )
}

// 3. A row of an array: "/countryId" is a field of the form root, a bare name is a field of the same row
<Form.Group.List name="deliveries">
  <Form.Field.Select name="cityId" dependsOn="/countryId" loadOptions={(_s, { signal, deps }) => fetchCities(deps.countryId, signal)} ... />
</Form.Group.List>

// 4. The server checks the pair and returns the error of the CHILD field (a Server Action returns it as a value)
'use server'
import { actionFailure } from '@letar/forms/server-errors'

export async function saveAddress(input: AddressInput) {
  const city = await db.city.findUnique({ where: { id: input.cityId }, select: { countryId: true } })
  if (!city || city.countryId !== input.countryId) {
    return actionFailure('The city does not belong to the country', 'cityId') // the field of the CHILD
  }
  // ...
}
// on the client run() puts the message under "City" (errorMap.onServer of the child field)

// 5. From schema.zmodel (needs the plugin >= 4.4.0; get_directives -> @form.dependsOn)
// cityId String @meta("form.dependsOn", "countryId") @meta("form.fieldType", "Select.City")`,
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
