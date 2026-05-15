'use client'

import { useFindManyTheoryTopic } from '@/lib/hooks'
import type { TheoryTopic } from '@letar/driving-school-db/prisma'
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
 * Combobox для поиска тем теории
 *
 * @example
 * ```tsx
 * <DrivingSchoolForm.Combobox.TheoryTopic
 *   name="topicId"
 *   label="Тема занятия"
 *   schoolId={currentSchoolId}
 * />
 * ```
 */
export function ComboboxTheoryTopic({ name, schoolId, ...props }: Props): ReactElement {
  return (
    <FieldCombobox
      name={name}
      useQuery={(search: string) =>
        // oxlint-disable-next-line react-hooks/rules-of-hooks -- хук вызывается внутри FieldCombobox при рендере
        useFindManyTheoryTopic({
          where: {
            name: { contains: search, mode: 'insensitive' },
            ...(schoolId && { schoolId }),
          },
          take: 20,
          orderBy: { name: 'asc' },
        })
      }
      getLabel={(topic) => (topic as TheoryTopic).name}
      getValue={(topic) => (topic as TheoryTopic).id}
      minChars={1}
      debounce={300}
      emptyMessage="Темы не найдены"
      {...props}
    />
  )
}
