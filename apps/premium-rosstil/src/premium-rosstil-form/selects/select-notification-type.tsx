'use client'

import type { NotificationType } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { notificationTypeLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: NotificationType[] = ['NEW_PRODUCT', 'ORDER_STATUS', 'PROMOTION', 'CART_REMINDER']

export function SelectNotificationType({ name, ...props }: Props): ReactElement {
  const options: SelectOption<NotificationType>[] = allValues.map((value) => ({
    label: notificationTypeLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
