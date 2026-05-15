import type { DocSection } from './loader.js'

/** Description of an @form.* directive */
export interface DirectiveInfo {
  /** Directive name, e.g. "@form.title" */
  name: string
  /** Description */
  description: string
  /** Syntax example */
  example: string
  /** Generated output */
  output: string
}

/** Known directives with descriptions (supplemented from docs) */
const KNOWN_DIRECTIVES: DirectiveInfo[] = [
  {
    name: '@form.title',
    description: 'Field title in the form',
    example: '/// @form.title("Recipe Name")',
    output: '.meta({ ui: { title: "Recipe Name" } })',
  },
  {
    name: '@form.placeholder',
    description: 'Placeholder for an input field',
    example: '/// @form.placeholder("Enter a name")',
    output: '.meta({ ui: { placeholder: "Enter a name" } })',
  },
  {
    name: '@form.description',
    description: 'Help text below the field',
    example: '/// @form.description("Brief dish description")',
    output: '.meta({ ui: { description: "Brief dish description" } })',
  },
  {
    name: '@form.fieldType',
    description: 'Explicit form field type override',
    example: '/// @form.fieldType("tags")',
    output: '.meta({ ui: { fieldType: "tags" } })',
  },
  {
    name: '@form.props',
    description:
      'Field properties. Automatically split into Zod constraints (min, max, step) and UI props (layout, count)',
    example: '/// @form.props({ min: 1, max: 100, step: 0.5 })',
    output: 'z.number().min(1).max(100).step(0.5)',
  },
  {
    name: '@form.relation',
    description: 'Configuration for relation fields (FK -> Select/Combobox)',
    example: '/// @form.relation({ labelField: "name", searchable: true })',
    output: '.meta({ ui: { fieldType: "combobox", relation: { labelField: "name", searchable: true } } })',
  },
  {
    name: '@form.exclude',
    description: 'Exclude field from generated form schemas',
    example: '/// @form.exclude',
    output: 'Field will not appear in CreateFormSchema / UpdateFormSchema',
  },
]

/** Builds the directive registry, supplementing from documentation */
export function buildDirectiveRegistry(zenstackSections: DocSection[]): Map<string, DirectiveInfo> {
  const registry = new Map<string, DirectiveInfo>()

  // Load known directives
  for (const directive of KNOWN_DIRECTIVES) {
    registry.set(directive.name, directive)
  }

  // Supplement with details from zenstack.md sections
  for (const section of zenstackSections) {
    if (section.heading.includes('@form.')) {
      const nameMatch = section.heading.match(/@form\.\w+/)
      if (nameMatch) {
        const existing = registry.get(nameMatch[0])
        if (existing) {
          // Supplement with detailed description from docs
          existing.description = section.content.split('\n')[0] || existing.description
        }
      }
    }
  }

  return registry
}

/** Returns all directives or a specific one */
export function getDirectives(registry: Map<string, DirectiveInfo>, name?: string): DirectiveInfo[] {
  if (name) {
    const normalized = name.startsWith('@form.') ? name : `@form.${name}`
    const directive = registry.get(normalized)
    return directive ? [directive] : []
  }
  return Array.from(registry.values())
}
