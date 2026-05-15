'use client'

import { useFindManyLessonType } from '@/lib/hooks'
import type { LessonType } from '@letar/driving-school-db/prisma'
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
 * Combobox для поиска типов занятий
 *
 * @example
 * ```tsx
 * <DrivingSchoolForm.Combobox.LessonType
 *   name="lessonTypeId"
 *   label="Тип занятия"
 *   instructorId={currentInstructorId}
 * />
 * ```
 */
export function ComboboxLessonType({ name, instructorId, ...props }: Props): ReactElement {
  return (
    <FieldCombobox
      name={name}
      useQuery={(search: string) =>
        // oxlint-disable-next-line react-hooks/rules-of-hooks -- хук вызывается внутри FieldCombobox при рендере
        useFindManyLessonType({
          where: {
            name: { contains: search, mode: 'insensitive' },
            ...(instructorId && { instructorProfileId: instructorId }),
            isActive: true,
          },
          take: 20,
          orderBy: { name: 'asc' },
        })
      }
      getLabel={(lt) => `${(lt as LessonType).name} (${(lt as LessonType).durationMinutes} мин)`}
      getValue={(lt) => (lt as LessonType).id}
      minChars={1}
      debounce={300}
      emptyMessage="Типы занятий не найдены"
      {...props}
    />
  )
}
