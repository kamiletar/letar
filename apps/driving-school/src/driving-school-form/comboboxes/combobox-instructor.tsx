'use client'

import { useFindManyUser } from '@/lib/hooks'
import type { User } from '@letar/driving-school-db/prisma'
import { FieldCombobox } from '@letar/forms'
import type { ReactElement } from 'react'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  /** Фильтрация по школе */
  schoolId?: string
}

/**
 * Combobox для поиска инструкторов
 *
 * @example
 * ```tsx
 * <DrivingSchoolForm.Combobox.Instructor
 *   name="instructorId"
 *   label="Инструктор"
 *   schoolId={currentSchoolId}
 * />
 * ```
 */
export function ComboboxInstructor({ name, schoolId, ...props }: Props): ReactElement {
  return (
    <FieldCombobox
      name={name}
      useQuery={(search: string) =>
        // oxlint-disable-next-line react-hooks/rules-of-hooks -- хук вызывается внутри FieldCombobox при рендере
        useFindManyUser({
          where: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
            instructorProfile: { isNot: null },
            ...(schoolId && {
              memberships: { some: { organizationId: schoolId, role: 'instructor' } },
            }),
          },
          take: 20,
          orderBy: { name: 'asc' },
        })
      }
      getLabel={(user) => (user as User).name ?? (user as User).email ?? 'Без имени'}
      getValue={(user) => (user as User).id}
      minChars={2}
      debounce={300}
      emptyMessage="Инструкторы не найдены"
      {...props}
    />
  )
}
