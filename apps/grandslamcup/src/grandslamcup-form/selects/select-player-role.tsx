'use client'

import type { PlayerRole } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { playerRoleLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
}

const allValues: PlayerRole[] = ['PLAYER', 'COACH', 'ASSISTANT_COACH']

/** Select для роли игрока в команде */
export function SelectPlayerRole({ name, ...props }: Props): ReactElement {
  const options: SelectOption<PlayerRole>[] = allValues.map((value) => ({
    label: playerRoleLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
