'use client'

import { useFindManyOrganization } from '@/lib/hooks'
import type { Organization } from '@letar/driving-school-db/models'
import { FieldCombobox } from '@letar/forms'
import type { ReactElement } from 'react'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

/**
 * Combobox для поиска автошкол
 *
 * @example
 * ```tsx
 * <DrivingSchoolForm.Combobox.School
 *   name="organizationId"
 *   label="Автошкола"
 * />
 * ```
 */
export function ComboboxSchool({ name, ...props }: Props): ReactElement {
  return (
    <FieldCombobox
      name={name}
      useQuery={(search: string) =>
        // oxlint-disable-next-line react-hooks/rules-of-hooks -- хук вызывается внутри FieldCombobox при рендере
        useFindManyOrganization({
          where: {
            name: { contains: search, mode: 'insensitive' },
          },
          take: 20,
          orderBy: { name: 'asc' },
        })
      }
      getLabel={(org) => (org as Organization).name}
      getValue={(org) => (org as Organization).id}
      minChars={2}
      debounce={300}
      emptyMessage="Автошколы не найдены"
      {...props}
    />
  )
}
