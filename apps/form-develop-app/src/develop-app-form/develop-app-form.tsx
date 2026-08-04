'use client'

// Компоненты форм используемые только внутри проекта form-develop-app

import type { RecipeType } from '@/generated/prisma/enums'
import { createForm, FieldSelect, type SelectOption } from '@letar/forms'
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
  extraSelects: {
    Type: SelectType,
  },
})
