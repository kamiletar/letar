'use client'

import { useTranslations } from 'next-intl'
import { useCallback } from 'react'
import type { ScaleConfidence } from '../_lib/scoring-core'

/** Подпись получают только шкалы с малым числом ответов; на остальных она была бы шумом */
const LABELED: ReadonlySet<ScaleConfidence> = new Set<ScaleConfidence>(['insufficient', 'low'])

/**
 * Подпись точности шкалы для клиентского UI («Недостаточно данных» / «Низкая точность»).
 * Общая для профиля и блока состояний. В кабинете психолога подписи другие — там это
 * «покрытие банка» (`cabinet.darkCore.confidence`), не путать.
 */
export function useScaleConfidenceLabel(): (conf: ScaleConfidence | undefined) => string | null {
  const t = useTranslations('scaleConfidence')
  return useCallback((conf) => (conf && LABELED.has(conf) ? t(conf) : null), [t])
}
