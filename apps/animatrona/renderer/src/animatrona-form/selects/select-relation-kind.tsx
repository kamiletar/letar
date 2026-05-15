'use client'

import type { RelationKind } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { relationKindLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  /** Показать опцию "Все типы" */
  showAll?: boolean
}

const allKinds: RelationKind[] = [
  'SEQUEL',
  'PREQUEL',
  'SIDE_STORY',
  'PARENT_STORY',
  'SUMMARY',
  'FULL_STORY',
  'SPIN_OFF',
  'ADAPTATION',
  'CHARACTER',
  'ALTERNATIVE_VERSION',
  'ALTERNATIVE_SETTING',
  'OTHER',
]

/**
 * Select для типа связи между аниме
 */
export function SelectRelationKind({ name, showAll, ...props }: Props): ReactElement {
  const options: SelectOption<RelationKind | ''>[] = [
    ...(showAll ? [{ label: 'Все типы', value: '' as RelationKind }] : []),
    ...allKinds.map((value) => ({
      label: relationKindLabels[value],
      value,
    })),
  ]

  return <FieldSelect name={name} options={options} {...props} />
}
