import type { FormFieldMeta, ZodConstraints } from './types.js'

/**
 * Prop names that are Zod constraints (not UI props).
 */
const ZOD_CONSTRAINT_NAMES = new Set([
  // Number
  'min',
  'max',
  'step',
  'positive',
  'negative',
  // String
  'minLength',
  'maxLength',
  'pattern',
  'email',
  'url',
  'uuid',
])

/**
 * Extract label from enum value comment.
 *
 * Supports:
 * - `// Sweet` (inline comment)
 * - `/// Sweet` (doc comment)
 */
export function extractEnumLabel(comments: string[]): string | undefined {
  if (!comments || comments.length === 0) {
    return undefined
  }

  const comment = comments[0]?.trim()
  if (!comment) {
    return undefined
  }

  // Strip /// or // prefix
  const label = comment.replace(/^\/\/\/?/, '').trim()
  return label || undefined
}

/**
 * Convert SCREAMING_CASE to Title Case.
 *
 * @example
 * toTitleCase('SWEET') // 'Sweet'
 * toTitleCase('BANK_TRANSFER') // 'Bank Transfer'
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Parse @form.* directives from field comments.
 *
 * Supported directives:
 * - @form.title("...")
 * - @form.placeholder("...")
 * - @form.description("...")
 * - @form.fieldType("...")
 * - @form.props({...})
 * - @form.relation({...})
 * - @form.exclude
 */
export function parseFormMeta(comments: string[]): FormFieldMeta {
  const meta: FormFieldMeta = {}

  if (!comments || comments.length === 0) {
    return meta
  }

  // Join all comments into a single string for parsing
  const allComments = comments.join('\n')

  // @form.title("...")
  const titleMatch = allComments.match(/@form\.title\("([^"]+)"\)/)
  if (titleMatch) {
    meta.title = titleMatch[1]
  }

  // @form.placeholder("...")
  const placeholderMatch = allComments.match(/@form\.placeholder\("([^"]+)"\)/)
  if (placeholderMatch) {
    meta.placeholder = placeholderMatch[1]
  }

  // @form.description("...")
  const descriptionMatch = allComments.match(/@form\.description\("([^"]+)"\)/)
  if (descriptionMatch) {
    meta.description = descriptionMatch[1]
  }

  // @form.fieldType("...")
  const fieldTypeMatch = allComments.match(/@form\.fieldType\("([^"]+)"\)/)
  if (fieldTypeMatch) {
    meta.fieldType = fieldTypeMatch[1]
  }

  // @form.props({...}) — JS object literal (not strict JSON)
  // Split into Zod constraints (min, max, etc.) and UI props (everything else)
  const propsMatch = allComments.match(/@form\.props\((\{[\s\S]*?\})\)/)
  if (propsMatch) {
    try {
      // Convert JS object literal to valid JSON
      const jsonStr = propsMatch[1]
        .replace(/'/g, '"') // Single quotes → double
        .replace(/(\w+)\s*:/g, '"$1":') // key: → "key":
        .replace(/,\s*}/g, '}') // Remove trailing comma
      const allProps = JSON.parse(jsonStr) as Record<string, unknown>

      // Separate constraints from UI props
      const constraints: ZodConstraints = {}
      const uiProps: Record<string, unknown> = {}

      for (const [key, value] of Object.entries(allProps)) {
        if (ZOD_CONSTRAINT_NAMES.has(key)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(constraints as any)[key] = value
        } else {
          uiProps[key] = value
        }
      }

      if (Object.keys(constraints).length > 0) {
        meta.constraints = constraints
      }
      if (Object.keys(uiProps).length > 0) {
        meta.props = uiProps
      }
    } catch {
      // Ignore parse errors
    }
  }

  // @form.relation({...}) — JS object literal
  const relationMatch = allComments.match(/@form\.relation\((\{[\s\S]*?\})\)/)
  if (relationMatch) {
    try {
      const jsonStr = relationMatch[1]
        .replace(/'/g, '"')
        .replace(/(\w+)\s*:/g, '"$1":')
        .replace(/,\s*}/g, '}')
      meta.relation = JSON.parse(jsonStr)
    } catch {
      // Ignore parse errors
    }
  }

  // @form.exclude
  if (allComments.includes('@form.exclude')) {
    meta.exclude = true
  }

  return meta
}
