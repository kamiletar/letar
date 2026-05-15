'use client'

import type { FileCategory } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { fileCategoryLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  /** Показать опцию "Все категории" */
  showAll?: boolean
}

const allCategories: FileCategory[] = ['POSTER', 'SCREENSHOT', 'THUMBNAIL', 'FONT']

/**
 * Select для категории файла
 */
export function SelectFileCategory({ name, showAll, ...props }: Props): ReactElement {
  const options: SelectOption<FileCategory | ''>[] = [
    ...(showAll ? [{ label: 'Все категории', value: '' as FileCategory }] : []),
    ...allCategories.map((value) => ({
      label: fileCategoryLabels[value],
      value,
    })),
  ]

  return <FieldSelect name={name} options={options} {...props} />
}
