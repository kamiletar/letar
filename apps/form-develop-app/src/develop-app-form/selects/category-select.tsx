'use client'

import { useCreateCategoryOptimistic, useFindManyCategory, useUpdateCategory } from '@/lib/hooks'
import { FieldSelect } from '@letar/forms'
import { useZenStackOptions } from '@letar/forms-query/zenstack'
import type { ReactElement } from 'react'

interface CategoryRecord {
  id: string
  name: string
  color: string
  $optimistic?: boolean
}

const mapCategory = (c: CategoryRecord) => ({ label: c.name, value: c.id })

/** Окно приложения — `window.prompt` вместо настоящего диалога: важна связка с реестром createForm и хуками ZenStack */
function askName(current: string): string | null {
  const name = window.prompt('Название категории', current)
  return name && name.trim() ? name.trim() : null
}

/**
 * Справочник категорий как компонент реестра `createForm`: схема ссылается на него ключом
 * `form.fieldType = "Select.Category"`, автоформа рисует именно его. Свои хуки, окно создания и правки,
 * оптимистичный `create` — то, что базовый Select из схемы дать не может.
 */
export function CategorySelect(props: { name: string; label?: string; createLabel?: string }): ReactElement {
  const all = useFindManyCategory({ orderBy: { name: 'asc' } })
  const categories = useZenStackOptions(
    all as { data?: CategoryRecord[]; isLoading?: boolean },
    mapCategory,
  )
  const create = useCreateCategoryOptimistic()
  const update = useUpdateCategory()

  return (
    <FieldSelect
      {...props}
      {...categories.fieldProps}
      onCreate={async (_search, { optimistic }) => {
        const name = askName('')
        if (!name) {
          return null
        }
        optimistic({ label: name })
        const created = (await create.mutateAsync({ data: { name } })) as CategoryRecord | null
        return created ? { label: created.name, value: created.id, data: created } : null
      }}
      onUpdate={async (option) => {
        const name = askName(String(option.label))
        if (!name) {
          return null
        }
        const saved = (await update.mutateAsync({ where: { id: String(option.value) }, data: { name } })) as
          | CategoryRecord
          | null
        return saved ? { label: saved.name, value: saved.id, data: saved } : null
      }}
    />
  )
}
