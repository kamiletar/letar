'use client'

import type { VehicleOwner } from '@letar/driving-school-db/prisma'
import { FieldSegmentedGroup, type SegmentedGroupOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { vehicleOwnerLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const options: SegmentedGroupOption<VehicleOwner>[] = [
  { label: vehicleOwnerLabels.INSTRUCTOR, value: 'INSTRUCTOR' },
  { label: vehicleOwnerLabels.STUDENT, value: 'STUDENT' },
]

export function SegmentedVehicleOwner({ name, ...props }: Props): ReactElement {
  return <FieldSegmentedGroup name={name} options={options} {...props} />
}
