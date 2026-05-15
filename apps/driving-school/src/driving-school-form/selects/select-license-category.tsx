'use client'

import type { LicenseCategory } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { licenseCategoryLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  /** Показать опцию "Все категории" */
  showAll?: boolean
  /** Значение для опции "Все" */
  allValue?: string
}

const allCategories: LicenseCategory[] = [
  'M',
  'A1',
  'A',
  'B1',
  'B',
  'C1',
  'C',
  'D1',
  'D',
  'BE',
  'CE',
  'C1E',
  'DE',
  'D1E',
  'Tm',
  'Tb',
]

export function SelectLicenseCategory({ name, showAll, allValue = '', ...props }: Props): ReactElement {
  const options: SelectOption<LicenseCategory | ''>[] = [
    ...(showAll ? [{ label: 'Все категории', value: allValue as LicenseCategory }] : []),
    ...allCategories.map((value) => ({
      label: licenseCategoryLabels[value] ?? value,
      value,
    })),
  ]

  return <FieldSelect name={name} options={options} {...props} />
}
