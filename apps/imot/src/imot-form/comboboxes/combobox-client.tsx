'use client'

import type { Client } from '@/generated/prisma'
import { useFindManyClient } from '@/lib/hooks'
import { FieldCombobox } from '@letar/forms'
import type { ReactElement } from 'react'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  /** Фильтрация по специалисту */
  specialistId?: string
}

/**
 * Combobox для поиска клиентов
 *
 * @example
 * ```tsx
 * <ImotForm.Combobox.Client
 *   name="clientId"
 *   label="Клиент"
 *   specialistId={currentSpecialistId}
 * />
 * ```
 */
export function ComboboxClient({ name, specialistId, ...props }: Props): ReactElement {
  return (
    <FieldCombobox
      name={name}
      useQuery={(search: string) =>
        // oxlint-disable-next-line rules-of-hooks -- FieldCombobox вызывает useQuery как хук-фабрику
        useFindManyClient({
          where: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
            ...(specialistId && { specialistId }),
          },
          take: 20,
          orderBy: { name: 'asc' },
        })
      }
      getLabel={(client) => (client as Client).name ?? (client as Client).email ?? 'Без имени'}
      getValue={(client) => (client as Client).id}
      minChars={2}
      debounce={300}
      emptyMessage="Клиенты не найдены"
      {...props}
    />
  )
}
