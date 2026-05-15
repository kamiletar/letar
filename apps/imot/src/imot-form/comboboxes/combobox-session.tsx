'use client'

import type { TherapySession } from '@/generated/prisma'
import { useFindManySession } from '@/lib/hooks'
import { FieldCombobox } from '@letar/forms'
import type { ReactElement } from 'react'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  /** Фильтрация по клиенту */
  clientId?: string
}

/**
 * Combobox для поиска сессий
 *
 * @example
 * ```tsx
 * <ImotForm.Combobox.Session
 *   name="sessionId"
 *   label="Сессия"
 *   clientId={currentClientId}
 * />
 * ```
 */
export function ComboboxSession({ name, clientId, ...props }: Props): ReactElement {
  return (
    <FieldCombobox
      name={name}
      useQuery={(search: string) =>
        // oxlint-disable-next-line rules-of-hooks -- FieldCombobox вызывает useQuery как хук-фабрику
        useFindManySession({
          where: {
            OR: [{ notes: { contains: search, mode: 'insensitive' } }],
            ...(clientId && { clientId }),
          },
          include: { client: true },
          take: 20,
          orderBy: { scheduledAt: 'desc' },
        })
      }
      getLabel={(session) => {
        const s = session as TherapySession & { client?: { name?: string } }
        const date = s.scheduledAt ? new Date(s.scheduledAt).toLocaleDateString('ru-RU') : ''
        const clientName = s.client?.name ?? 'Без клиента'
        return `${date} — ${clientName}`
      }}
      getValue={(session) => (session as TherapySession).id}
      minChars={0}
      debounce={300}
      emptyMessage="Сессии не найдены"
      {...props}
    />
  )
}
