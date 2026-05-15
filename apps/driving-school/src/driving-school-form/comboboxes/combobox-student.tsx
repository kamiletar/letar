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
  /** Фильтрация по инструктору */
  instructorId?: string
  /** Фильтрация по школе */
  schoolId?: string
}

/**
 * Combobox для поиска учеников
 *
 * @example
 * ```tsx
 * <DrivingSchoolForm.Combobox.Student
 *   name="studentId"
 *   label="Ученик"
 *   instructorId={currentInstructorId}
 * />
 * ```
 */
export function ComboboxStudent({ name, instructorId, schoolId, ...props }: Props): ReactElement {
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
            studentProfile: { isNot: null },
            ...(instructorId && {
              studentProfile: {
                instructorConnections: { some: { instructorId, status: 'ACTIVE' } },
              },
            }),
            ...(schoolId && {
              memberships: { some: { organizationId: schoolId, role: 'member' } },
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
      emptyMessage="Ученики не найдены"
      {...props}
    />
  )
}
