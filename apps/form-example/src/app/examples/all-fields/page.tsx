'use client'

/**
 * Полный каталог всех типов полей @letar/forms.
 * Демонстрирует 40 компонентов, организованных по 8 категориям.
 * Статья: https://forms.letar.best/docs/guides/all-fields
 */

import { PageH1 } from '@/components/page-h1'
import { Heading, Separator, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

// --- Опции для полей выбора ---

const frameworkOptions = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'angular', label: 'Angular' },
  { value: 'svelte', label: 'Svelte' },
]

const searchOptions = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'angular', label: 'Angular' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'solid', label: 'SolidJS' },
  { value: 'qwik', label: 'Qwik' },
]

const planOptions = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
]

const tierOptions = [
  { value: 'starter', label: 'Starter', description: '$0/mo' },
  { value: 'growth', label: 'Growth', description: '$29/mo' },
  { value: 'scale', label: 'Scale', description: '$99/mo' },
]

const sizeOptions = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
]

const featureOptions = [
  { value: 'ts', label: 'TypeScript', description: 'Type safety' },
  { value: 'lint', label: 'Linting', description: 'Code quality' },
  { value: 'test', label: 'Testing', description: 'Unit & E2E' },
]

const listboxOptions = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'angular', label: 'Angular' },
]

const citySuggestions = ['Moscow', 'Saint Petersburg', 'Kazan', 'Novosibirsk', 'Yekaterinburg']

const nativeSelectOptions = [
  { title: 'Draft', value: 'draft' },
  { title: 'Published', value: 'published' },
  { title: 'Archived', value: 'archived' },
]

// --- Zod-схема со всеми полями ---

const Schema = z.object({
  // === Текстовые (7) ===
  name: z.string().meta({ ui: { title: 'String', placeholder: 'Single-line text' } }),
  bio: z.string().meta({ ui: { title: 'Textarea', placeholder: 'Multi-line text...' } }),
  password: z.string().meta({ ui: { title: 'Password' } }),
  securePassword: z
    .string()
    .min(8)
    .meta({ ui: { title: 'PasswordStrength' } }),
  nickname: z.string().meta({ ui: { title: 'Editable (click to edit)' } }),
  passport: z.string().meta({ ui: { title: 'MaskedInput (passport)' } }),
  content: z.string().meta({ ui: { title: 'RichText (WYSIWYG)' } }),

  // === Числовые (6) ===
  quantity: z.number().meta({ ui: { title: 'Number' } }),
  itemCount: z
    .number()
    .min(0)
    .max(999)
    .meta({ ui: { title: 'NumberInput (with spinner)' } }),
  volume: z
    .number()
    .min(0)
    .max(100)
    .meta({ ui: { title: 'Slider (0-100)' } }),
  price: z.number().meta({ ui: { title: 'Currency ($)' } }),
  discount: z
    .number()
    .min(0)
    .max(100)
    .meta({ ui: { title: 'Percentage' } }),
  rating: z
    .number()
    .min(1)
    .max(5)
    .meta({ ui: { title: 'Rating (1-5)' } }),

  // === Выбор (10) ===
  framework: z.string().meta({ ui: { title: 'Select' } }),
  status: z.string().meta({ ui: { title: 'NativeSelect' } }),
  search: z.string().meta({ ui: { title: 'Combobox (searchable)' } }),
  cityAutocomplete: z.string().meta({ ui: { title: 'Autocomplete' } }),
  listboxChoice: z.string().meta({ ui: { title: 'Listbox' } }),
  plan: z.enum(['free', 'pro', 'enterprise']).meta({ ui: { title: 'RadioGroup' } }),
  tier: z.enum(['starter', 'growth', 'scale']).meta({ ui: { title: 'RadioCard' } }),
  size: z.enum(['sm', 'md', 'lg']).meta({ ui: { title: 'SegmentedGroup' } }),
  country: z.string().meta({ ui: { title: 'Country (for CascadingSelect)' } }),
  cascadeCity: z.string().meta({ ui: { title: 'CascadingSelect (depends on country)' } }),

  // === Булевы и мультивыбор (4) ===
  agree: z.boolean().meta({ ui: { title: 'Checkbox' } }),
  notifications: z.boolean().meta({ ui: { title: 'Switch' } }),
  features: z.array(z.string()).meta({ ui: { title: 'CheckboxCard (multi-select)' } }),
  tags: z.array(z.string()).meta({ ui: { title: 'Tags' } }),

  // === Дата и время (6) ===
  birthday: z.string().meta({ ui: { title: 'Date' } }),
  time: z.string().meta({ ui: { title: 'Time' } }),
  period: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .meta({ ui: { title: 'DateRange' } }),
  appointmentAt: z.string().meta({ ui: { title: 'DateTimePicker' } }),
  workDuration: z.string().meta({ ui: { title: 'Duration (HH:MM)' } }),
  schedule: z.record(z.string(), z.any()).meta({ ui: { title: 'Schedule (weekly)' } }),

  // === Авто (1) ===
  autoField: z.string().meta({ ui: { title: 'Auto (auto-detected from schema)' } }),

  // === Специализированные (7) ===
  phone: z.string().meta({ ui: { title: 'Phone' } }),
  address: z.string().meta({ ui: { title: 'Address' } }),
  city: z.string().meta({ ui: { title: 'City' } }),
  pin: z.string().meta({ ui: { title: 'PIN Code' } }),
  otp: z.string().meta({ ui: { title: 'OTP Input' } }),
  color: z.string().meta({ ui: { title: 'Color' } }),
  files: z.any().meta({ ui: { title: 'FileUpload' } }),
})

// --- Опции для CascadingSelect ---

const countryOptions = [
  { value: 'us', label: 'United States' },
  { value: 'ru', label: 'Russia' },
  { value: 'de', label: 'Germany' },
]

const cityByCountry: Record<string, Array<{ value: string; label: string }>> = {
  us: [
    { value: 'nyc', label: 'New York' },
    { value: 'la', label: 'Los Angeles' },
    { value: 'chi', label: 'Chicago' },
  ],
  ru: [
    { value: 'msk', label: 'Moscow' },
    { value: 'spb', label: 'Saint Petersburg' },
    { value: 'kzn', label: 'Kazan' },
  ],
  de: [
    { value: 'ber', label: 'Berlin' },
    { value: 'muc', label: 'Munich' },
    { value: 'ham', label: 'Hamburg' },
  ],
}

export default function AllFieldsPage() {
  return (
    <Stack gap={6}>
      <div>
        <PageH1 size="lg">All Field Types</PageH1>
        <Text color="fg.muted">Every field type available in @letar/forms — 40 components organized by category.</Text>
      </div>

      <Form
        schema={Schema}
        initialValue={{
          // Текстовые
          name: '',
          bio: '',
          password: '',
          securePassword: '',
          nickname: 'Click to edit',
          passport: '',
          content: '',
          // Числовые
          quantity: 1,
          itemCount: 5,
          volume: 50,
          price: 0,
          discount: 10,
          rating: 3,
          // Выбор
          framework: '',
          status: '',
          search: '',
          cityAutocomplete: '',
          listboxChoice: '',
          plan: 'free',
          tier: 'starter',
          size: 'md',
          country: '',
          cascadeCity: '',
          // Булевы / мультивыбор
          agree: false,
          notifications: true,
          features: [],
          tags: [],
          // Дата / время
          birthday: '',
          time: '',
          period: { start: '', end: '' },
          appointmentAt: '',
          workDuration: '',
          schedule: {},
          // Авто
          autoField: '',
          // Специализированные
          phone: '',
          address: '',
          city: '',
          pin: '',
          otp: '',
          color: '#059669',
          files: null,
        }}
        onSubmit={async (data) => alert(JSON.stringify(data, null, 2))}
      >
        <Stack gap={4}>
          {/* === ТЕКСТОВЫЕ (7) === */}
          <Heading size="sm">Text Fields (7)</Heading>
          <Form.Field.String name="name" />
          <Form.Field.Textarea name="bio" />
          <Form.Field.Password name="password" />
          <Form.Field.PasswordStrength name="securePassword" />
          <Form.Field.Editable name="nickname" />
          <Form.Field.MaskedInput name="passport" mask="99 99 999999" />
          <Form.Field.RichText name="content" minHeight="120px" />

          <Separator />

          {/* === ЧИСЛОВЫЕ (6) === */}
          <Heading size="sm">Number Fields (6)</Heading>
          <Form.Field.Number name="quantity" />
          <Form.Field.NumberInput name="itemCount" min={0} max={999} step={1} />
          <Form.Field.Slider name="volume" />
          <Form.Field.Currency name="price" />
          <Form.Field.Percentage name="discount" />
          <Form.Field.Rating name="rating" />

          <Separator />

          {/* === ВЫБОР (10) === */}
          <Heading size="sm">Selection Fields (10)</Heading>
          <Form.Field.Select name="framework" options={frameworkOptions} />
          <Form.Field.NativeSelect name="status" options={nativeSelectOptions} placeholder="Choose status" />
          <Form.Field.Combobox name="search" options={searchOptions} />
          <Form.Field.Autocomplete name="cityAutocomplete" suggestions={citySuggestions} />
          <Form.Field.Listbox name="listboxChoice" options={listboxOptions} />
          <Form.Field.RadioGroup name="plan" options={planOptions} orientation="horizontal" />
          <Form.Field.RadioCard name="tier" options={tierOptions} />
          <Form.Field.SegmentedGroup name="size" options={sizeOptions} />
          <Form.Field.Select name="country" options={countryOptions} />
          <Form.Field.CascadingSelect
            name="cascadeCity"
            dependsOn="country"
            loadOptions={async (parentValue: unknown) =>
              cityByCountry[parentValue as string] ?? ([] as { value: string; label: string }[])}
          />

          <Separator />

          {/* === БУЛЕВЫ И МУЛЬТИВЫБОР (4) === */}
          <Heading size="sm">Boolean &amp; Multi-Select (4)</Heading>
          <Form.Field.Checkbox name="agree" />
          <Form.Field.Switch name="notifications" />
          <Form.Field.CheckboxCard name="features" options={featureOptions} />
          <Form.Field.Tags name="tags" />

          <Separator />

          {/* === ДАТА И ВРЕМЯ (6) === */}
          <Heading size="sm">Date &amp; Time (6)</Heading>
          <Form.Field.Date name="birthday" />
          <Form.Field.Time name="time" />
          <Form.Field.DateRange name="period" />
          <Form.Field.DateTimePicker name="appointmentAt" />
          <Form.Field.Duration name="workDuration" />
          <Form.Field.Schedule name="schedule" />

          <Separator />

          {/* === АВТО (1) === */}
          <Heading size="sm">Auto Field (1)</Heading>
          <Form.Field.Auto name="autoField" />

          <Separator />

          {/* === СПЕЦИАЛИЗИРОВАННЫЕ (7) === */}
          <Heading size="sm">Specialized (7)</Heading>
          <Form.Field.Phone name="phone" />
          <Form.Field.Address name="address" />
          <Form.Field.City name="city" />
          <Form.Field.PinInput name="pin" />
          <Form.Field.OTPInput name="otp" length={6} />
          <Form.Field.ColorPicker name="color" />
          <Form.Field.FileUpload name="files" accept="image/*" maxFiles={3} variant="dropzone" />

          <Form.DebugValues showInProduction />
          <Form.Button.Submit>Submit All (40 Fields)</Form.Button.Submit>
        </Stack>
      </Form>
    </Stack>
  )
}
