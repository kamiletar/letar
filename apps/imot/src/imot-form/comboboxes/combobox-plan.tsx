'use client'

import type { TransformationPlan } from '@/generated/prisma'
import { useFindManyTransformationPlan } from '@/lib/hooks'
import { FieldCombobox } from '@letar/forms'
import type { ReactElement } from 'react'
import { transformationStageLabels } from '../labels'

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
 * Combobox для поиска планов трансформации
 *
 * @example
 * ```tsx
 * <ImotForm.Combobox.Plan
 *   name="planId"
 *   label="План трансформации"
 *   clientId={currentClientId}
 * />
 * ```
 */
export function ComboboxPlan({ name, clientId, ...props }: Props): ReactElement {
  return (
    <FieldCombobox
      name={name}
      useQuery={(search: string) =>
        // oxlint-disable-next-line rules-of-hooks -- FieldCombobox вызывает useQuery как хук-фабрику
        useFindManyTransformationPlan({
          where: {
            OR: [{ primaryRequest: { contains: search, mode: 'insensitive' } }],
            ...(clientId && { clientId }),
          },
          include: { client: true },
          take: 20,
          orderBy: { createdAt: 'desc' },
        })
      }
      getLabel={(plan) => {
        const p = plan as TransformationPlan & { client?: { name?: string } }
        const stage = transformationStageLabels[p.currentStage] ?? p.currentStage
        const clientName = p.client?.name ?? 'Без клиента'
        return `${clientName} — ${stage}`
      }}
      getValue={(plan) => (plan as TransformationPlan).id}
      minChars={0}
      debounce={300}
      emptyMessage="Планы не найдены"
      {...props}
    />
  )
}
