import { getGrowthPractices } from '../_data/growth-practices'
import { PERSONALITY_TYPES, type PersonalityTypeCode, replaceTypeCodes } from '../_data/personality-types'
import type { ScaleConfidence } from './scoring-core'

export interface ResultReportInput {
  scores: Partial<Record<PersonalityTypeCode, number>>
  relevantCounts?: Partial<Record<PersonalityTypeCode, number>> | null
  confidence?: Partial<Record<PersonalityTypeCode, ScaleConfidence>> | null
  locale: string
  showClinical?: boolean
}

/** Единый снимок таблицы и расшифровок; пропуск не превращается в нулевой балл. */
export function buildResultReport(
  { scores, relevantCounts, confidence, locale, showClinical = false }: ResultReportInput,
) {
  const isRu = locale === 'ru'
  return PERSONALITY_TYPES.map((type) => {
    const count = relevantCounts?.[type.code]
    const answered = count !== undefined && Number.isFinite(count) && count >= 0 ? count : null
    const value = scores[type.code]
    const score = value !== undefined && Number.isFinite(value) && value >= 0 && value <= 100
        && (relevantCounts === null || relevantCounts === undefined ? value > 0 : answered !== null && answered > 0)
      ? value
      : null
    return {
      code: type.code,
      label: `${isRu ? type.label : type.labelEn} ${isRu ? type.archetype : type.archetypeEn}`,
      clinical: showClinical ? (isRu ? type.clinical : type.clinicalEn) : null,
      description: isRu ? type.description : type.descriptionEn,
      whenHigh: score !== null && score >= 40 ? (isRu ? type.whenHigh : type.whenHighEn) : null,
      beta: type.beta ?? false,
      score,
      answered,
      confidence: score !== null ? confidence?.[type.code] ?? null : null,
      practices: score === null
        ? []
        : getGrowthPractices(type.code).map((practice) =>
          replaceTypeCodes(isRu ? practice.text : practice.textEn, isRu, showClinical)
        ),
    }
  })
}

export type ResultReportRow = ReturnType<typeof buildResultReport>[number]
