'use client'

import { useFindManyInstructorVehicle } from '@/lib/hooks'
import type { InstructorVehicle } from '@letar/driving-school-db/prisma'
import { FieldCombobox } from '@letar/forms'
import type { ReactElement } from 'react'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  /** Фильтрация по инструктору */
  instructorId?: string
}

/**
 * Combobox для поиска автомобилей инструктора
 *
 * @example
 * ```tsx
 * <DrivingSchoolForm.Combobox.Vehicle
 *   name="vehicleId"
 *   label="Автомобиль"
 *   instructorId={currentInstructorId}
 * />
 * ```
 */
export function ComboboxVehicle({ name, instructorId, ...props }: Props): ReactElement {
  return (
    <FieldCombobox
      name={name}
      useQuery={(search: string) =>
        // oxlint-disable-next-line react-hooks/rules-of-hooks -- хук вызывается внутри FieldCombobox при рендере
        useFindManyInstructorVehicle({
          where: {
            OR: [
              { brand: { contains: search, mode: 'insensitive' } },
              { model: { contains: search, mode: 'insensitive' } },
            ],
            ...(instructorId && { instructorProfileId: instructorId }),
            isActive: true,
          },
          take: 20,
          orderBy: { brand: 'asc' },
        })
      }
      getLabel={(vehicle) => `${(vehicle as InstructorVehicle).brand} ${(vehicle as InstructorVehicle).model}`}
      getValue={(vehicle) => (vehicle as InstructorVehicle).id}
      minChars={1}
      debounce={300}
      emptyMessage="Автомобили не найдены"
      {...props}
    />
  )
}
