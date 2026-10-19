'use client'

// Компоненты форм используемые только внутри проекта form-develop-app

import type { FormComboboxKey, FormSelectKey } from '@/generated/form-schemas'
import type { RecipeType } from '@/generated/prisma/enums'
import { createForm, FieldSelect, type FormRegistryCheck, type SelectOption } from '@letar/forms'
import { FieldDataGrid } from '@letar/forms/data-grid'
import { FieldRichText } from '@letar/forms/rich-text'
import { FieldTableEditor } from '@letar/forms/table-editor'
import type { ReactElement } from 'react'

// Custom Select для RecipeType
const SelectType = ({ name }: { name?: string }): ReactElement => {
  const options: SelectOption<RecipeType>[] = [
    { label: 'Сладкое', value: 'SWEET' },
    { label: 'Соленое', value: 'SALTY' },
  ]

  return <FieldSelect name={name} options={options} />
}

// Создаём расширенную форму с app-specific компонентами
export const DevelopAppForm = createForm({
  // Тяжёлые поля подключаются подпутями: ключ совпадает с именем поля (`Field.RichText` и т.д.)
  extraFields: {
    RichText: FieldRichText,
    DataGrid: FieldDataGrid,
    TableEditor: FieldTableEditor,
  },
  extraSelects: {
    Type: SelectType,
  },
  lazySelects: {
    // Ключ `form.fieldType = "Select.Category"` из schema.zmodel (модель RegistryKeyDemo)
    Category: () => import('./selects/category-select').then((m) => m.CategorySelect),
  },
})

// Все ключи реестра из schema.zmodel зарегистрированы — проверяется typecheck'ом (§17.4 плана forms)
export const developAppFormRegistryCheck: FormRegistryCheck<typeof DevelopAppForm, FormSelectKey, FormComboboxKey> =
  true
