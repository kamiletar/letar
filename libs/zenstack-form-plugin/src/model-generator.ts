import type { DataField, DataFieldAttribute, DataModel } from '@zenstackhq/language/ast'
import { parseFormMeta } from './parser.js'
import type { FormFieldMeta, I18nConfig, ModelFieldInfo, ModelInfo, ZodConstraints } from './types.js'

/**
 * Mapping from Prisma types to Zod types.
 */
const PRISMA_TO_ZOD: Record<string, string> = {
  String: 'z.string()',
  Int: 'z.number().int()',
  Float: 'z.number()',
  Decimal: 'z.number()',
  BigInt: 'z.bigint()',
  Boolean: 'z.boolean()',
  DateTime: 'z.date()',
  Json: 'z.unknown()',
  Bytes: 'z.unknown()',
}

/**
 * Get field type from AST.
 *
 * ZenStack AST structure:
 * - Primitives (String, Int, etc.): field.type.type = "Int" (string)
 * - References (enum, model): field.type.reference.ref.name = "RecipeType"
 */
function getFieldType(field: DataField): string {
  const typeRef = field.type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyType = typeRef as any

  // Primitives: anyType.type is a string ("String", "Int", "Float", etc.)
  if (typeof anyType?.type === 'string') {
    return anyType.type
  }

  // References (enum, model): anyType.reference?.ref?.name
  if (anyType?.reference?.ref?.name) {
    return anyType.reference.ref.name
  }

  // Fallback via $refText
  if (anyType?.type?.$refText) {
    return anyType.type.$refText
  }

  return 'String'
}

/**
 * Check if field type is an enum.
 */
function isEnumType(field: DataField, enumNames: Set<string>): boolean {
  const typeName = getFieldType(field)
  return enumNames.has(typeName)
}

/**
 * Check if field is required.
 */
function isRequired(field: DataField): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !(field.type as any)?.optional
}

/**
 * Check if field is an array.
 */
function isList(field: DataField): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(field.type as any)?.array
}

/**
 * Get default value from field attributes.
 */
function getDefaultValue(field: DataField): unknown | undefined {
  const defaultAttr = field.attributes.find((attr: DataFieldAttribute) => attr.decl?.$refText === '@default')

  if (!defaultAttr || defaultAttr.args.length === 0) {
    return undefined
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const arg = defaultAttr.args[0] as any

  if (arg?.value?.$type === 'BooleanLiteral') {
    return arg.value.value
  }
  if (arg?.value?.$type === 'NumberLiteral') {
    // Explicitly convert to number — AST may store as string
    return Number(arg.value.value)
  }
  if (arg?.value?.$type === 'StringLiteral') {
    return arg.value.value
  }

  return undefined
}

/**
 * Check if field type is a model reference (not a primitive or enum).
 */
function isModelReference(field: DataField, enumNames: Set<string>): boolean {
  const typeName = getFieldType(field)

  // Prisma primitive — not a model
  if (PRISMA_TO_ZOD[typeName]) {
    return false
  }

  // Enum — not a model
  if (enumNames.has(typeName)) {
    return false
  }

  // Everything else is a model reference
  return true
}

/**
 * Extract model information from AST.
 */
export function extractModelInfo(model: DataModel, enumNames: Set<string>): ModelInfo {
  const fields: ModelFieldInfo[] = []
  const excludedFields: string[] = []

  // System fields that are always excluded
  const systemFields = ['id', 'createdAt', 'updatedAt']

  for (const field of model.fields) {
    const fieldType = getFieldType(field)
    const formMeta = parseFormMeta(field.comments)

    // Check if field should be excluded
    const isSystemField = systemFields.includes(field.name)
    const isId = field.attributes.some((attr: DataFieldAttribute) => attr.decl?.$refText === 'id')
    const hasRelationAttr = field.attributes.some((attr: DataFieldAttribute) => attr.decl?.$refText === 'relation')
    const isModelRef = isModelReference(field, enumNames)

    // Exclude: system fields, id, relation fields, model references
    // BUT: keep FK fields with @form.relation for select rendering
    const hasFormRelation = !!formMeta.relation
    const shouldExclude = formMeta.exclude || isId || hasRelationAttr || (isModelRef && !hasFormRelation)
      || isSystemField

    if (shouldExclude) {
      excludedFields.push(field.name)
      continue
    }

    const fieldInfo: ModelFieldInfo = {
      name: field.name,
      type: fieldType,
      isRequired: isRequired(field),
      isList: isList(field),
      isEnum: isEnumType(field, enumNames),
      enumName: isEnumType(field, enumNames) ? fieldType : undefined,
      defaultValue: getDefaultValue(field),
      formMeta,
    }

    fields.push(fieldInfo)
  }

  return {
    name: model.name,
    fields,
    excludedFields,
  }
}

/**
 * Generate Zod constraints from @form.props.
 */
function generateConstraints(constraints: ZodConstraints | undefined, prismaType: string): string {
  if (!constraints) {
    return ''
  }

  const parts: string[] = []
  const isNumber = ['Int', 'Float', 'Decimal', 'BigInt'].includes(prismaType)
  const isString = prismaType === 'String'

  if (isNumber) {
    if (constraints.min !== undefined) {
      parts.push(`.min(${constraints.min})`)
    }
    if (constraints.max !== undefined) {
      parts.push(`.max(${constraints.max})`)
    }
    if (constraints.step !== undefined) {
      parts.push(`.multipleOf(${constraints.step})`)
    }
    if (constraints.positive) {
      parts.push('.positive()')
    }
    if (constraints.negative) {
      parts.push('.negative()')
    }
  }

  if (isString) {
    if (constraints.minLength !== undefined) {
      parts.push(`.min(${constraints.minLength})`)
    }
    if (constraints.maxLength !== undefined) {
      parts.push(`.max(${constraints.maxLength})`)
    }
    if (constraints.pattern) {
      parts.push(`.regex(/${constraints.pattern}/)`)
    }
    if (constraints.email) {
      parts.push('.email()')
    }
    if (constraints.url) {
      parts.push('.url()')
    }
    if (constraints.uuid) {
      parts.push('.uuid()')
    }
  }

  return parts.join('')
}

/**
 * Generate Zod type for a field.
 */
function generateZodType(field: ModelFieldInfo, _enumNames: Set<string>): string {
  let zodType: string

  if (field.isEnum && field.enumName) {
    // Use imported enum schema
    zodType = `${field.enumName}FormSchema`
  } else {
    // Map Prisma type to Zod
    zodType = PRISMA_TO_ZOD[field.type] ?? 'z.string()'
  }

  // Apply constraints from @form.props (min, max, etc.)
  const constraintsStr = generateConstraints(field.formMeta.constraints, field.type)
  if (constraintsStr) {
    zodType = `${zodType}${constraintsStr}`
  }

  // Arrays
  if (field.isList) {
    zodType = `z.array(${zodType})`
  }

  // Optional fields (Prisma ? means nullable, not undefined)
  if (!field.isRequired) {
    zodType = `${zodType}.nullable().optional()`
  }

  // Default value
  if (field.defaultValue !== undefined) {
    let defaultStr: string
    if (typeof field.defaultValue === 'string') {
      defaultStr = `'${field.defaultValue}'`
    } else if (typeof field.defaultValue === 'boolean') {
      defaultStr = String(field.defaultValue)
    } else if (typeof field.defaultValue === 'number') {
      // BigInt types need BigInt() wrapper
      if (field.type === 'BigInt') {
        defaultStr = `BigInt(${field.defaultValue})`
      } else {
        defaultStr = String(field.defaultValue)
      }
    } else {
      defaultStr = JSON.stringify(field.defaultValue)
    }
    zodType = `${zodType}.default(${defaultStr})`
  }

  return zodType
}

/**
 * Parameters for UI meta generation.
 */
interface GenerateUIMetaParams {
  formMeta: FormFieldMeta
  modelName: string
  fieldName: string
  i18nConfig: I18nConfig | null
}

/**
 * Generate UI meta object for a field.
 */
function generateUIMeta(params: GenerateUIMetaParams): string | null {
  const { formMeta, modelName, fieldName, i18nConfig } = params
  const parts: string[] = []

  if (formMeta.title) {
    parts.push(`title: '${formMeta.title}'`)
  }
  if (formMeta.placeholder) {
    parts.push(`placeholder: '${formMeta.placeholder}'`)
  }
  if (formMeta.description) {
    parts.push(`description: '${formMeta.description}'`)
  }
  if (formMeta.fieldType) {
    parts.push(`fieldType: '${formMeta.fieldType}'`)
  }
  if (formMeta.props) {
    parts.push(`fieldProps: ${JSON.stringify(formMeta.props)}`)
  }
  if (formMeta.relation) {
    parts.push(`fieldProps: { relation: ${JSON.stringify(formMeta.relation)} }`)
  }

  // Add i18nKey when i18n is enabled
  if (i18nConfig?.enabled) {
    parts.push(`i18nKey: '${modelName}.${fieldName}'`)
  }

  if (parts.length === 0) {
    return null
  }

  return `{ ${parts.join(', ')} }`
}

/**
 * Generate code for a model.
 */
export function generateModelCode(
  modelInfo: ModelInfo,
  enumNames: Set<string>,
  i18nConfig: I18nConfig | null = null,
): string {
  const { name, fields, excludedFields } = modelInfo

  // Collect enum imports
  const enumImports = new Set<string>()
  for (const field of fields) {
    if (field.isEnum && field.enumName) {
      enumImports.add(field.enumName)
    }
  }

  // Generate imports
  const imports = [`import { z } from 'zod/v4'`]
  for (const enumName of enumImports) {
    imports.push(`import { ${enumName}FormSchema } from './enums/${enumName}.form'`)
  }

  // Generate schema fields
  const schemaFields: string[] = []
  for (const field of fields) {
    const zodType = generateZodType(field, enumNames)
    const uiMeta = generateUIMeta({
      formMeta: field.formMeta,
      modelName: name,
      fieldName: field.name,
      i18nConfig,
    })

    if (uiMeta) {
      schemaFields.push(`  ${field.name}: ${zodType}\n    .meta({\n      ui: ${uiMeta}\n    })`)
    } else {
      schemaFields.push(`  ${field.name}: ${zodType}`)
    }
  }

  const excludedFieldsStr = excludedFields.map((f) => `'${f}'`).join(', ')

  return `// AUTO-GENERATED by @letar/zenstack-form-plugin
// DO NOT EDIT MANUALLY

${imports.join('\n')}

/**
 * Create schema for ${name} with UI metadata.
 */
export const ${name}CreateFormSchema = z.object({
${schemaFields.join(',\n')}
})

/**
 * Update schema for ${name} (all fields optional).
 */
export const ${name}UpdateFormSchema = ${name}CreateFormSchema.partial()

/**
 * Fields excluded from forms.
 */
export const ${name}ExcludedFields = [${excludedFieldsStr}] as const

/**
 * Types.
 */
export type ${name}CreateForm = z.infer<typeof ${name}CreateFormSchema>
export type ${name}UpdateForm = z.infer<typeof ${name}UpdateFormSchema>
`
}
