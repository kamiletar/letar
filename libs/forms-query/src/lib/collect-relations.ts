import { parseFieldRegistryType, type SchemaFieldInfo, traverseSchema } from '@letar/forms-core/schema'

/** Справочник, на который ссылаются поля формы через `fieldProps.relation` (`@meta("form.relation.*")`, `relationMeta()`) */
export interface CollectedRelation {
  /** Модель справочника (как в `RelationConfig.model` и в `schema.zmodel`) */
  model: string
  /** Поле модели с подписью опции */
  labelField: string
  /** Поле значения (по умолчанию `id`) */
  valueField?: string
  /** Поле описания опции */
  descriptionField?: string
  /** Пути полей формы, которые используют этот справочник */
  paths: string[]
}

interface RelationMeta {
  model?: unknown
  labelField?: unknown
  valueField?: unknown
  descriptionField?: unknown
}

const asString = (value: unknown): string | undefined => (typeof value === 'string' && value ? value : undefined)

/** Поля с вложенностью: объекты (`children`) и массивы (`element`, у элемента-объекта — свои `children`) */
function* walk(fields: SchemaFieldInfo[]): Generator<SchemaFieldInfo> {
  for (const field of fields) {
    yield field
    if (field.children) {
      yield* walk(field.children)
    }
    if (field.element) {
      yield* walk([field.element])
    }
  }
}

/**
 * Обходит form-схему и собирает справочники, которые нужно загрузить для `RelationFieldProvider`: по одному на
 * модель. Не зависит от ZenStack и TanStack Query — годится для любого источника данных.
 *
 * Что пропускается: поля с ключом реестра `createForm` (`fieldType: 'Select.WorkCategory'` — такой компонент
 * грузит данные сам, `relation` ему не нужен) и `relation` без `model` или `labelField` (загружать нечего — в dev
 * это видно по предупреждению). Один справочник у нескольких полей загружается один раз; если поля просят разные
 * `labelField`/`valueField`/`descriptionField` той же модели, побеждает первое, остальные — предупреждение (провайдер
 * хранит опции по модели, две подписи одной модели ему не выразить).
 */
export function collectRelations(formSchema: unknown): CollectedRelation[] {
  const byModel = new Map<string, CollectedRelation>()

  for (const field of walk(traverseSchema(formSchema))) {
    const fieldType = field.ui?.fieldType
    if (typeof fieldType === 'string' && parseFieldRegistryType(fieldType)) {
      continue
    }
    const relation = field.ui?.fieldProps?.relation as RelationMeta | undefined
    if (!relation) {
      continue
    }

    const model = asString(relation.model)
    const labelField = asString(relation.labelField)
    if (!model || !labelField) {
      console.warn(
        `useZenStackRelations: у поля «${field.path}» relation без ${
          model ? 'labelField' : 'model'
        } — справочник не загружается.`,
      )
      continue
    }

    const valueField = asString(relation.valueField)
    const descriptionField = asString(relation.descriptionField)
    const existing = byModel.get(model)
    if (!existing) {
      byModel.set(model, {
        model,
        labelField,
        ...(valueField ? { valueField } : {}),
        ...(descriptionField ? { descriptionField } : {}),
        paths: [field.path],
      })
      continue
    }

    existing.paths.push(field.path)
    if (
      existing.labelField !== labelField
      || (valueField && existing.valueField !== valueField)
      || (descriptionField && existing.descriptionField !== descriptionField)
    ) {
      console.warn(
        `useZenStackRelations: поле «${field.path}» просит другие labelField/valueField/descriptionField для модели `
          + `«${model}», чем «${existing.paths[0]}» — используются настройки первого. Разведи их через overrides.`,
      )
    }
  }

  return [...byModel.values()]
}
