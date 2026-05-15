'use client'

import { useFindManyStudyGroup } from '@/lib/hooks'
import type { StudyGroup } from '@letar/driving-school-db/prisma'
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
 * Combobox для поиска учебных групп
 *
 * @example
 * ```tsx
 * <DrivingSchoolForm.Combobox.StudyGroup
 *   name="studyGroupId"
 *   label="Учебная группа"
 *   schoolId={currentSchoolId}
 * />
 * ```
 */
export function ComboboxStudyGroup({ name, schoolId, ...props }: Props): ReactElement {
  return (
    <FieldCombobox
      name={name}
      useQuery={(search: string) =>
        // oxlint-disable-next-line react-hooks/rules-of-hooks -- хук вызывается внутри FieldCombobox при рендере
        useFindManyStudyGroup({
          where: {
            name: { contains: search, mode: 'insensitive' },
            ...(schoolId && { schoolId }),
          },
          take: 20,
          orderBy: { name: 'asc' },
        })
      }
      getLabel={(group) => (group as StudyGroup).name}
      getValue={(group) => (group as StudyGroup).id}
      minChars={1}
      debounce={300}
      emptyMessage="Группы не найдены"
      {...props}
    />
  )
}
