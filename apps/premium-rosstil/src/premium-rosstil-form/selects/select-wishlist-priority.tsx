'use client'

import type { WishlistPriority } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { wishlistPriorityLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: WishlistPriority[] = ['DREAM', 'WANT', 'MAYBE']

export function SelectWishlistPriority({ name, ...props }: Props): ReactElement {
  const options: SelectOption<WishlistPriority>[] = allValues.map((value) => ({
    label: wishlistPriorityLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
