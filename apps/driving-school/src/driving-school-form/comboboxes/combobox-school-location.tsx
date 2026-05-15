'use client'

import { useFindManyTeam } from '@/lib/hooks'
import type { Team, TeamLocationData } from '@letar/driving-school-db/models'
import { FieldCombobox } from '@letar/forms'
import type { ReactElement } from 'react'

/** Team с включённой locationData */
type TeamWithLocation = Team & { locationData: TeamLocationData | null }

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  /** Фильтрация по организации */
  organizationId?: string
}

/**
 * Combobox для поиска филиалов школы (Team)
 *
 * @example
 * ```tsx
 * <DrivingSchoolForm.Combobox.SchoolLocation
 *   name="teamId"
 *   label="Филиал"
 *   organizationId={currentOrgId}
 * />
 * ```
 */
export function ComboboxSchoolLocation({ name, organizationId, ...props }: Props): ReactElement {
  return (
    <FieldCombobox
      name={name}
      useQuery={(search: string) =>
        // oxlint-disable-next-line react-hooks/rules-of-hooks -- хук вызывается внутри FieldCombobox при рендере
        useFindManyTeam({
          where: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { locationData: { address: { contains: search, mode: 'insensitive' } } },
            ],
            ...(organizationId && { organizationId }),
          },
          include: {
            locationData: true,
          },
          take: 20,
          orderBy: { name: 'asc' },
        })
      }
      getLabel={(team) => {
        const t = team as TeamWithLocation
        const address = t.locationData?.address
        return address ? `${t.name} — ${address}` : t.name
      }}
      getValue={(team) => (team as Team).id}
      minChars={1}
      debounce={300}
      emptyMessage="Филиалы не найдены"
      {...props}
    />
  )
}
