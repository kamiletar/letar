'use client'

import { HStack, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Demo schema with all field types
 */
const DemoSchema = z.object({
  // String field
  name: z
    .string()
    .min(2)
    .meta({
      ui: { title: 'Name', placeholder: 'Enter your name' },
    }),

  // Textarea field
  description: z.string().meta({
    ui: { title: 'Description', placeholder: 'Enter description...' },
  }),

  // Number field
  age: z
    .number()
    .min(0)
    .max(150)
    .meta({
      ui: { title: 'Age' },
    }),

  // Date field
  birthDate: z.string().meta({
    ui: { title: 'Birth Date' },
  }),

  // Time field
  wakeUpTime: z.string().meta({
    ui: { title: 'Wake Up Time' },
  }),

  // Password field
  password: z
    .string()
    .min(6)
    .meta({
      ui: { title: 'Password', placeholder: 'Enter password' },
    }),

  // Select field (Chakra styled, required)
  framework: z.string().meta({
    ui: { title: 'Framework', placeholder: 'Select framework' },
  }),

  // Select field (optional - will show clear button)
  theme: z
    .string()
    .optional()
    .meta({
      ui: { title: 'Theme', placeholder: 'Select theme' },
    }),

  // Combobox field (static options with search)
  country: z.string().meta({
    ui: { title: 'Country', placeholder: 'Search country...' },
  }),

  // Combobox with groups
  language: z
    .string()
    .optional()
    .meta({
      ui: { title: 'Programming Language', placeholder: 'Search language...' },
    }),

  // Listbox field (single selection)
  role: z.string().meta({
    ui: { title: 'Role', description: 'Select your role' },
  }),

  // Listbox field (multiple selection)
  skills: z
    .array(z.string())
    .optional()
    .meta({
      ui: { title: 'Skills', description: 'Select all that apply' },
    }),

  // Checkbox field
  newsletter: z.boolean().meta({
    ui: { title: 'Subscribe to newsletter' },
  }),

  // Switch field
  darkMode: z.boolean().meta({
    ui: { title: 'Dark Mode' },
  }),

  // RadioGroup field
  size: z.string().meta({
    ui: { title: 'Size', description: 'Choose your preferred size' },
  }),

  // RadioGroup horizontal
  priority: z.string().meta({
    ui: { title: 'Priority' },
  }),

  // RadioCard field (card-based single selection)
  plan: z.string().meta({
    ui: { title: 'Subscription Plan', description: 'Choose your plan' },
  }),

  // CheckboxCard field (card-based multiple selection)
  features: z
    .array(z.string())
    .optional()
    .meta({
      ui: { title: 'Features', description: 'Select desired features' },
    }),

  // SegmentedGroup field (segmented control)
  billing: z.string().meta({
    ui: { title: 'Billing Cycle' },
  }),

  // SegmentedGroup small
  displayMode: z.string().meta({
    ui: { title: 'Display Mode' },
  }),

  // ColorPicker field
  brandColor: z.string().meta({
    ui: { title: 'Brand Color', description: 'Select your brand color' },
  }),

  // ColorPicker with minimal UI (swatches only)
  accentColor: z.string().meta({
    ui: { title: 'Accent Color' },
  }),

  // Editable field (inline editing)
  editableTitle: z.string().meta({
    ui: { title: 'Editable Title' },
  }),

  // Editable multiline
  editableNotes: z.string().meta({
    ui: { title: 'Notes', description: 'Click to add notes' },
  }),

  // Schedule field (weekly working hours)
  workingHours: z.any().meta({
    ui: { title: 'Working Hours', description: 'Set your availability' },
  }),
})

type DemoFormData = z.infer<typeof DemoSchema>

const frameworkOptions = [
  { label: 'React', value: 'react' },
  { label: 'Vue', value: 'vue' },
  { label: 'Angular', value: 'angular' },
  { label: 'Svelte', value: 'svelte' },
]

const themeOptions = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
]

const sizeOptions = [
  { label: 'Small', value: 'sm' },
  { label: 'Medium', value: 'md' },
  { label: 'Large', value: 'lg' },
]

const priorityOptions = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
]

const countryOptions = [
  { label: 'Russia', value: 'ru' },
  { label: 'United States', value: 'us' },
  { label: 'Germany', value: 'de' },
  { label: 'France', value: 'fr' },
  { label: 'Japan', value: 'jp' },
  { label: 'China', value: 'cn' },
  { label: 'Brazil', value: 'br' },
  { label: 'India', value: 'in' },
]

const languageOptions = [
  { label: 'TypeScript', value: 'ts', group: 'Frontend' },
  { label: 'JavaScript', value: 'js', group: 'Frontend' },
  { label: 'React', value: 'react', group: 'Frontend' },
  { label: 'Python', value: 'python', group: 'Backend' },
  { label: 'Go', value: 'go', group: 'Backend' },
  { label: 'Rust', value: 'rust', group: 'Backend' },
  { label: 'PostgreSQL', value: 'postgres', group: 'Database' },
  { label: 'MongoDB', value: 'mongo', group: 'Database' },
]

const roleOptions = [
  { label: 'Developer', value: 'developer' },
  { label: 'Designer', value: 'designer' },
  { label: 'Manager', value: 'manager' },
  { label: 'QA Engineer', value: 'qa' },
]

const skillOptions = [
  { label: 'Frontend', value: 'frontend' },
  { label: 'Backend', value: 'backend' },
  { label: 'DevOps', value: 'devops' },
  { label: 'Mobile', value: 'mobile' },
  { label: 'Data Science', value: 'data' },
]

const planOptions = [
  { label: 'Free', value: 'free', description: 'Basic features for personal use' },
  { label: 'Pro', value: 'pro', description: 'All features for professionals' },
  { label: 'Enterprise', value: 'enterprise', description: 'Custom solutions for teams' },
]

const featureOptions = [
  { label: 'Analytics', value: 'analytics', description: 'Track usage metrics' },
  { label: 'API Access', value: 'api', description: 'Programmatic access' },
  { label: 'Priority Support', value: 'support', description: '24/7 support' },
  { label: 'Custom Branding', value: 'branding', description: 'White-label solution' },
]

const billingOptions = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Yearly', value: 'yearly' },
]

const displayModeOptions = [
  { label: 'List', value: 'list' },
  { label: 'Grid', value: 'grid' },
  { label: 'Table', value: 'table' },
]

const initialValues: DemoFormData = {
  name: '',
  description: '',
  age: 0,
  birthDate: '',
  wakeUpTime: '',
  password: '',
  framework: '',
  theme: undefined,
  country: '',
  language: undefined,
  role: '',
  skills: undefined,
  newsletter: false,
  darkMode: false,
  size: '',
  priority: '',
  plan: '',
  features: undefined,
  billing: '',
  displayMode: '',
  brandColor: '#4299E1',
  accentColor: '#38B2AC',
  editableTitle: 'Click to edit this title',
  editableNotes: '',
  workingHours: {
    monday: { open: '09:00', close: '18:00' },
    tuesday: { open: '09:00', close: '18:00' },
    wednesday: { open: '09:00', close: '18:00' },
    thursday: { open: '09:00', close: '18:00' },
    friday: { open: '09:00', close: '17:00' },
    saturday: null,
    sunday: null,
  },
}

export default function FieldsDemoPage() {
  const [submittedData, setSubmittedData] = useState<DemoFormData | null>(null)

  const handleSubmit = (data: DemoFormData) => {
    setSubmittedData(data)
  }

  return (
    <DemoPageLayout title="Fields Demo" description="Демонстрация всех типов полей">
      <Form initialValue={initialValues} schema={DemoSchema} onSubmit={handleSubmit}>
        <VStack gap={4} align="stretch">
          {/* String field */}
          <Form.Field.String name="name" />

          {/* Textarea field */}
          <Form.Field.Textarea name="description" rows={4} />

          {/* Number field */}
          <Form.Field.Number name="age" min={0} max={150} />

          {/* Date field */}
          <Form.Field.Date name="birthDate" />

          {/* Time field */}
          <Form.Field.Time name="wakeUpTime" />

          {/* Password field */}
          <Form.Field.Password name="password" />

          {/* Select field (Chakra styled, required - no clear button) */}
          <Form.Field.Select name="framework" options={frameworkOptions} />

          {/* Select field (optional - shows clear button automatically) */}
          <Form.Field.Select name="theme" options={themeOptions} />

          {/* Combobox field (searchable select) */}
          <Form.Field.Combobox name="country" options={countryOptions} />

          {/* Combobox with groups */}
          <Form.Field.Combobox name="language" options={languageOptions} />

          {/* Listbox field (single selection) */}
          <Form.Field.Listbox name="role" options={roleOptions} />

          {/* Listbox field (multiple selection) */}
          <Form.Field.Listbox name="skills" options={skillOptions} selectionMode="multiple" />

          {/* RadioGroup field (vertical) */}
          <Form.Field.RadioGroup name="size" options={sizeOptions} />

          {/* RadioGroup field (horizontal) */}
          <Form.Field.RadioGroup name="priority" options={priorityOptions} orientation="horizontal" />

          {/* RadioCard field (card-based single selection) */}
          <Form.Field.RadioCard name="plan" options={planOptions} />

          {/* CheckboxCard field (card-based multiple selection) */}
          <Form.Field.CheckboxCard name="features" options={featureOptions} />

          {/* SegmentedGroup field */}
          <Form.Field.SegmentedGroup name="billing" options={billingOptions} />

          {/* SegmentedGroup field (small size) */}
          <Form.Field.SegmentedGroup name="displayMode" options={displayModeOptions} size="sm" />

          {/* ColorPicker field */}
          <Form.Field.ColorPicker name="brandColor" />

          {/* ColorPicker with minimal UI (swatches only) */}
          <Form.Field.ColorPicker
            name="accentColor"
            showArea={false}
            showSliders={false}
            showEyeDropper={false}
            swatches={['#FF0000', '#00FF00', '#0000FF', '#38B2AC', '#9F7AEA', '#ED64A6']}
          />

          {/* Editable field (inline editing) */}
          <Form.Field.Editable name="editableTitle" showControls />

          {/* Editable multiline */}
          <Form.Field.Editable name="editableNotes" multiline placeholder="Click to add notes..." />

          {/* Schedule field (weekly working hours) */}
          <Form.Field.Schedule name="workingHours" />

          <HStack gap={4}>
            {/* Checkbox field */}
            <Form.Field.Checkbox name="newsletter" />

            {/* Switch field */}
            <Form.Field.Switch name="darkMode" />
          </HStack>

          <HStack gap={4}>
            <Form.Button.Submit>Submit</Form.Button.Submit>
            <Form.Button.Reset>Reset</Form.Button.Reset>
          </HStack>

          {/* JSON-инспектор значений формы */}
          <Form.DebugValues />
        </VStack>
      </Form>

      <SubmittedDataPreview data={submittedData} />
    </DemoPageLayout>
  )
}
