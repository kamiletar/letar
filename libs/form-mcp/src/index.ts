import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { buildDirectiveRegistry, getDirectives } from './data/directive-registry.js'
import { buildFieldRegistry, type FieldCategory, type FieldInfo, getFields } from './data/field-registry.js'
import { loadDocs, type LoadedDocs } from './data/loader.js'
import { buildPatternRegistry, getPatterns } from './data/pattern-registry.js'

export interface FormMcpServerOptions {
  /** Path to the docs/ directory with markdown files */
  docsPath: string
  /** Server name */
  name?: string
  /** Server version */
  version?: string
}

/** Creates an MCP server for the forms ecosystem */
export function createFormMcpServer(options: FormMcpServerOptions): McpServer {
  const { docsPath, name = '@letar/form-mcp', version = '0.1.0' } = options

  // Load data when the server is created
  const docs: LoadedDocs = loadDocs(docsPath)
  const fieldRegistry = buildFieldRegistry(docs.sections.fields)
  const directiveRegistry = buildDirectiveRegistry(docs.sections.zenstack)
  const patternRegistry = buildPatternRegistry()

  const server = new McpServer({ name, version }, { capabilities: { resources: {}, tools: {}, prompts: {} } })

  // ─── TOOLS ───────────────────────────────────────────────

  server.tool(
    'list_fields',
    'List all field types in @letar/forms. Filter by category: text, number, date, select, multi-select, special.',
    { category: z.string().optional().describe('Category: text, number, date, select, multi-select, special') },
    async ({ category }) => {
      const fields = getFields(fieldRegistry, category as FieldCategory | undefined)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              fields.map((f) => ({
                name: f.name,
                fullName: f.fullName,
                description: f.description,
                category: f.category,
              })),
              null,
              2,
            ),
          },
        ],
      }
    },
  )

  server.tool(
    'get_field_props',
    'Get props, description, and documentation for a specific form field.',
    { fieldType: z.string().describe('Field type, e.g.: String, Date, Select, Combobox') },
    async ({ fieldType }) => {
      const field = fieldRegistry.get(fieldType.toLowerCase())
      if (!field) {
        return {
          content: [{ type: 'text', text: `Field "${fieldType}" not found. Use list_fields to see available fields.` }],
          isError: true,
        }
      }
      const result: Record<string, unknown> = {
        name: field.name,
        fullName: field.fullName,
        description: field.description,
        category: field.category,
      }
      if (field.details) {
        result.details = field.details
      }
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    },
  )

  server.tool(
    'get_field_example',
    'Get a code example for a specific form field.',
    {
      fieldType: z.string().describe('Field type: String, Date, Select, etc.'),
      variant: z.string().optional().describe('Variant: basic, with-validation, in-form'),
    },
    async ({ fieldType }) => {
      const field = fieldRegistry.get(fieldType.toLowerCase())
      if (!field) {
        return {
          content: [{ type: 'text', text: `Field "${fieldType}" not found.` }],
          isError: true,
        }
      }
      // Generate an example based on the field type
      const example = generateFieldExample(field)
      return { content: [{ type: 'text', text: example }] }
    },
  )

  server.tool(
    'get_form_pattern',
    'Get a complete form example for a common scenario: crud-create, crud-edit, multi-step, offline, i18n, from-schema, declarative, server-action.',
    {
      pattern: z
        .string()
        .describe(
          'Pattern name: crud-create, crud-edit, multi-step, offline, i18n, from-schema, declarative, server-action',
        ),
    },
    async ({ pattern }) => {
      const patterns = getPatterns(patternRegistry, pattern)
      if (patterns.length === 0) {
        const all = getPatterns(patternRegistry)
        return {
          content: [
            {
              type: 'text',
              text: `Pattern "${pattern}" not found. Available: ${all.map((p) => p.name).join(', ')}`,
            },
          ],
          isError: true,
        }
      }
      const p = patterns[0]
      return {
        content: [{ type: 'text', text: `# ${p.title}\n\n${p.description}\n\n\`\`\`tsx\n${p.example}\n\`\`\`` }],
      }
    },
  )

  server.tool(
    'get_directives',
    'Get descriptions of @form.* directives for zenstack-form-plugin. Without arguments returns all directives.',
    { directive: z.string().optional().describe('Directive name: @form.title, @form.props, etc.') },
    async ({ directive }) => {
      const directives = getDirectives(directiveRegistry, directive)
      return {
        content: [{ type: 'text', text: JSON.stringify(directives, null, 2) }],
      }
    },
  )

  server.tool(
    'generate_form',
    'Generate form code from a field specification.',
    {
      fields: z
        .array(
          z.object({
            name: z.string().describe('Field name'),
            type: z.string().describe('Field type: String, Number, Date, Select, etc.'),
            label: z.string().describe('Field label'),
            required: z.boolean().optional().describe('Required field'),
            validation: z.string().optional().describe('Additional Zod validation'),
          }),
        )
        .describe('Array of field specifications'),
      formName: z.string().optional().describe('Form component name'),
      withSchema: z.boolean().optional().describe('Generate Zod schema'),
    },
    async ({ fields, formName = 'MyForm', withSchema = true }) => {
      const code = generateFormCode(fields, formName, withSchema)
      return { content: [{ type: 'text', text: code }] }
    },
  )

  // ─── RESOURCES ───────────────────────────────────────────

  // Static resources for each document
  const docEntries: Array<{ key: string; name: string; description: string }> = [
    { key: 'fields', name: 'Field Components', description: 'Complete reference for 40+ field types' },
    {
      key: 'form-level',
      name: 'Form-level Components',
      description: 'Steps, When, Errors, DirtyGuard, DebugValues and more',
    },
    {
      key: 'schema-generation',
      name: 'Schema Generation',
      description: 'FromSchema, AutoFields, Builder, Auto fields',
    },
    { key: 'offline', name: 'Offline Support', description: 'useOfflineForm, sync queue, status indicators' },
    { key: 'i18n', name: 'Internationalization', description: 'FormI18nProvider, error and option localization' },
    { key: 'zenstack', name: 'ZenStack Integration', description: '@form.* directives, generation from schema.zmodel' },
    { key: 'api-reference', name: 'API Reference', description: 'Hooks, contexts, types, utilities' },
  ]

  for (const entry of docEntries) {
    server.resource(
      entry.name,
      `form-docs://${entry.key}`,
      { description: entry.description, mimeType: 'text/markdown' },
      async () => ({
        contents: [
          {
            uri: `form-docs://${entry.key}`,
            mimeType: 'text/markdown',
            text: docs.raw[entry.key as keyof typeof docs.raw] || `# ${entry.name}\n\nDocumentation not available.`,
          },
        ],
      }),
    )
  }

  // ─── PROMPTS ─────────────────────────────────────────────

  server.prompt(
    'create-form',
    'Create a CRUD form for a data model',
    {
      modelName: z.string().describe('Model name (e.g.: User, Product, Recipe)'),
      fields: z.string().describe('Comma-separated field list: name:String, email:String, age:Number'),
      withOffline: z.boolean().optional().describe('Add offline support'),
      withI18n: z.boolean().optional().describe('Add i18n support'),
    },
    async ({ modelName, fields, withOffline, withI18n }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: buildCreateFormPrompt(modelName, fields, withOffline === true, withI18n === true),
          },
        },
      ],
    }),
  )

  server.prompt(
    'add-field',
    'Add a field to an existing form',
    {
      fieldType: z.string().describe('Field type: String, Date, Select, Combobox, etc.'),
      fieldName: z.string().describe('Field name in the form'),
      validation: z.string().optional().describe('Validation: required, email, min:3, max:100'),
    },
    async ({ fieldType, fieldName, validation }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: buildAddFieldPrompt(fieldType, fieldName, validation),
          },
        },
      ],
    }),
  )

  server.prompt(
    'migrate-form',
    'Migrate a form from another framework to @letar/forms',
    {
      sourceFramework: z.string().describe('Source framework: react-hook-form, formik, conform'),
    },
    async ({ sourceFramework }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: buildMigratePrompt(sourceFramework),
          },
        },
      ],
    }),
  )

  return server
}

// ─── HELPER FUNCTIONS ────────────────────────────────────

function generateFieldExample(field: FieldInfo): string {
  const lines = [
    `// Usage example for ${field.fullName}`,
    '',
    `// Declarative API:`,
    `<${field.fullName} name="myField" label="My Field" />`,
    '',
    `// In a form:`,
    `<Form form={form}>`,
    `  <${field.fullName} name="myField" label="My Field"${field.category === 'select' ? ' options={options}' : ''} />`,
    `  <Form.Button.Submit>Submit</Form.Button.Submit>`,
    `</Form>`,
  ]

  if (field.details) {
    lines.push('', '// Details:', '/*', field.details.slice(0, 500), '*/')
  }

  return lines.join('\n')
}

function generateFormCode(
  fields: Array<{ name: string; type: string; label: string; required?: boolean; validation?: string }>,
  formName: string,
  withSchema: boolean,
): string {
  const lines: string[] = []

  if (withSchema) {
    lines.push(`import { z } from 'zod/v4'`)
  }
  lines.push(`import { useAppForm } from '@letar/forms'`)
  lines.push('')

  if (withSchema) {
    lines.push(`const ${formName}Schema = z.object({`)
    for (const field of fields) {
      const zodType = mapFieldTypeToZod(field.type, field.required, field.validation)
      lines.push(`  ${field.name}: ${zodType},`)
    }
    lines.push(`}).strip()`)
    lines.push('')
    lines.push(`type ${formName}Values = z.infer<typeof ${formName}Schema>`)
    lines.push('')
  }

  lines.push(`export function ${formName}() {`)
  lines.push(`  const form = useAppForm({`)
  if (withSchema) {
    lines.push(`    schema: ${formName}Schema,`)
  }
  lines.push(`    defaultValues: {`)
  for (const field of fields) {
    lines.push(`      ${field.name}: ${getDefaultValue(field.type)},`)
  }
  lines.push(`    },`)
  lines.push(`    onSubmit: async ({ value }) => {`)
  lines.push(`      // TODO: call Server Action`)
  lines.push(`      console.log(value)`)
  lines.push(`    },`)
  lines.push(`  })`)
  lines.push('')
  lines.push(`  return (`)
  lines.push(`    <Form form={form}>`)
  for (const field of fields) {
    const required = field.required ? ' required' : ''
    lines.push(`      <Form.Field.${field.type} name="${field.name}" label="${field.label}"${required} />`)
  }
  lines.push(`      <Form.Button.Submit>Save</Form.Button.Submit>`)
  lines.push(`    </Form>`)
  lines.push(`  )`)
  lines.push(`}`)

  return lines.join('\n')
}

function mapFieldTypeToZod(type: string, required?: boolean, validation?: string): string {
  const base: Record<string, string> = {
    String: 'z.string()',
    Textarea: 'z.string()',
    Number: 'z.number()',
    NumberInput: 'z.number()',
    Date: 'z.date()',
    Checkbox: 'z.boolean()',
    Switch: 'z.boolean()',
    Select: 'z.string()',
    Combobox: 'z.string()',
  }
  let zodType = base[type] ?? 'z.string()'
  if (required) {
    zodType += `.min(1, 'Required field')`
  }
  if (validation) {
    zodType += `.${validation}`
  }
  return zodType
}

function getDefaultValue(type: string): string {
  const defaults: Record<string, string> = {
    Number: '0',
    NumberInput: '0',
    Checkbox: 'false',
    Switch: 'false',
    Date: 'undefined',
  }
  return defaults[type] ?? `''`
}

function buildCreateFormPrompt(modelName: string, fields: string, withOffline: boolean, withI18n: boolean): string {
  const parts = [
    `Create a CRUD form for the "${modelName}" model using @letar/forms.`,
    '',
    `Fields: ${fields}`,
    '',
    'Requirements:',
    '- Use useAppForm from @letar/forms',
    '- Create a Zod v4 schema with .strip()',
    '- Use the declarative API (Form.Field.*)',
    '- Create a Server Action for saving',
    '- Schema file: _schemas/{modelName}.schema.ts',
  ]
  if (withOffline) {
    parts.push('- Add offline support via useOfflineForm')
  }
  if (withI18n) {
    parts.push('- Add i18n via FormI18nProvider')
  }
  return parts.join('\n')
}

function buildAddFieldPrompt(fieldType: string, fieldName: string, validation?: string): string {
  return [
    `Add a "${fieldName}" field of type Form.Field.${fieldType} to an existing form.`,
    '',
    'Requirements:',
    '- Add the field to the Zod schema',
    '- Add a defaultValue in useAppForm',
    `- Use <Form.Field.${fieldType} name="${fieldName}" />`,
    validation ? `- Validation: ${validation}` : '',
    '- Remember to update the form type',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildMigratePrompt(sourceFramework: string): string {
  return [
    `Migrate a form from ${sourceFramework} to @letar/forms.`,
    '',
    'Key changes:',
    '- Replace useForm -> useAppForm from @letar/forms',
    '- Replace Controller/Field -> Form.Field.* (declarative API)',
    '- Replace yup/joi -> Zod v4 with .strip()',
    '- Replace handleSubmit -> onSubmit in useAppForm',
    '- Replace FormProvider -> <Form form={form}>',
    '- Use FormGroup for field grouping',
    '- Use Form.When for conditional fields',
    '',
    'Imports:',
    "import { useAppForm } from '@letar/forms'",
    "import { z } from 'zod/v4'",
  ].join('\n')
}

export { type DirectiveInfo } from './data/directive-registry.js'
export { type FieldCategory, type FieldInfo } from './data/field-registry.js'
export { type LoadedDocs } from './data/loader.js'
export { type FormPattern, type PatternInfo } from './data/pattern-registry.js'
