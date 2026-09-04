import type { DocSection } from './loader.js'

/**
 * Описание директивы form-метаданных. `@meta("form.<key>", value)` — единственный синтаксис
 * (Фаза 4, v4.0.0: legacy comment-директива `@form.*` убрана из плагина целиком, генератор её
 * больше не читает). `name` остаётся ключом lookup'а (в т.ч. по короткому имени без `@form.`)
 * ради обратной совместимости самого MCP-API — не переименовано, чтобы не ломать существующих
 * потребителей `get_directives`; это внутренний идентификатор, не пример синтаксиса ZModel.
 */
export interface DirectiveInfo {
  /** Ключ директивы для lookup'а, напр. "@form.title" (внутренний id, используется для @meta-путей) */
  name: string
  /** Плоский dot-path ключ для @meta, напр. "form.title" (form.props.* — без вложенных путей, см. props/relation ниже) */
  metaKey: string
  /** Описание */
  description: string
  /** Единственный синтаксис: @meta("form.<key>", value) */
  example: string
  /** Сгенерированный вывод */
  output: string
}

/** Известные директивы с описаниями (дополняются из документации) */
const KNOWN_DIRECTIVES: DirectiveInfo[] = [
  {
    name: '@form.title',
    metaKey: 'form.title',
    description: 'Field title in the form',
    example: '@meta("form.title", "Recipe Name")',
    output: '.meta({ ui: { title: "Recipe Name" } })',
  },
  {
    name: '@form.placeholder',
    metaKey: 'form.placeholder',
    description: 'Placeholder for an input field',
    example: '@meta("form.placeholder", "Enter a name")',
    output: '.meta({ ui: { placeholder: "Enter a name" } })',
  },
  {
    name: '@form.description',
    metaKey: 'form.description',
    description: 'Help text below the field',
    example: '@meta("form.description", "Brief dish description")',
    output: '.meta({ ui: { description: "Brief dish description" } })',
  },
  {
    name: '@form.fieldType',
    metaKey: 'form.fieldType',
    description: 'Explicit form field type override',
    example: '@meta("form.fieldType", "tags")',
    output: '.meta({ ui: { fieldType: "tags" } })',
  },
  {
    name: '@form.props',
    metaKey: 'form.props.<dotpath>',
    description:
      'Field properties. Automatically split into Zod constraints (min, max, step) and UI props (layout, count). '
      + '⚠️ @meta не принимает объектный литерал (Unsupported attribute arg value: ObjectExpr — ломает '
      + 'zenstack generate целиком, ограничение upstream-генератора TS-схемы, не плагина) — каждый ключ отдельным вызовом @meta с плоским dot-path.',
    example: '@meta("form.props.min", 1) @meta("form.props.max", 100) @meta("form.props.step", 0.5)',
    output: 'z.number().min(1).max(100).step(0.5)',
  },
  {
    name: '@form.relation',
    metaKey: 'form.relation.<dotpath>',
    description:
      'Configuration for relation fields (FK -> Select/Combobox). Тот же запрет объектного литерала, что и у form.props — только плоский dot-path.',
    example: '@meta("form.relation.labelField", "name") @meta("form.relation.searchable", true)',
    output: '.meta({ ui: { fieldType: "combobox", relation: { labelField: "name", searchable: true } } })',
  },
  {
    name: '@form.exclude',
    metaKey: 'form.exclude',
    description: 'Exclude field from generated form schemas',
    example: '@meta("form.exclude", true)',
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
