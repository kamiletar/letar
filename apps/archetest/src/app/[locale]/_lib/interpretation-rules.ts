/**
 * Кросс-шкальные правила — интерпретационный слой ПОВЕРХ raw-баллов.
 *
 * Принцип (PLAN 5.1): raw хранится неизменным (воспроизводимость, динамика клиента,
 * пересчёт при уточнении правил). Правила корректируют только ОТОБРАЖЕНИЕ
 * (adjustedDisplay) и добавляют интерпретационные метки-профили.
 *
 * Пороги согласованы с уровнями значимости quiz.action (getScaleLevel):
 * «высокий» = ≥ 60 (significant+), «низкий» = < 40 (minimal/moderate).
 */
import type { PersonalityTypeCode } from '../_data/personality-types'

/** Порог «высокого» балла (уровень significant и выше) */
export const HIGH_THRESHOLD = 60
/** Порог «низкого» балла (ниже уровня significant) */
export const LOW_THRESHOLD = 40

/** Сработавшее правило — для объяснимости в UI и кабинете психолога */
export interface AppliedRule {
  id: string
  /** Какие шкалы скорректированы для отображения (код → множитель) */
  adjustments: Partial<Record<PersonalityTypeCode, number>>
  reason: string
  reasonEn: string
}

/** Интерпретационная метка-профиль (не архетип шкалы — сочетание шкал) */
export interface ProfileLabel {
  id: string
  label: string
  labelEn: string
  description: string
  descriptionEn: string
}

export interface InterpretationResult {
  /** Баллы для отображения: копия normalized с применёнными корректировками */
  adjustedDisplay: Record<PersonalityTypeCode, number>
  appliedRules: AppliedRule[]
  profileLabels: ProfileLabel[]
}

/**
 * Применить кросс-шкальные правила к нормализованным баллам.
 * Вход НЕ мутируется.
 */
export function applyInterpretationRules(normalized: Record<PersonalityTypeCode, number>): InterpretationResult {
  const adjusted: Record<PersonalityTypeCode, number> = { ...normalized }
  const appliedRules: AppliedRule[] = []
  const profileLabels: ProfileLabel[] = []

  const high = (code: PersonalityTypeCode) => (normalized[code] ?? 0) >= HIGH_THRESHOLD
  const low = (code: PersonalityTypeCode) => (normalized[code] ?? 0) < LOW_THRESHOLD

  // ── Правило 1: ASD×DIR — «мотив: передача фактов» ─────────────────────────
  // Жёсткие/прямые формулировки при высоких систематизации И прямоте отражают
  // буквальность коммуникации, а не антисоциальность/садизм → вес PSY(ANT)/SAD
  // для отображения снижается на 80%. Триггер именно сочетание (решение 2026-07-03):
  // высокий ASD с низким DIR — «Маскирующий», правило не применяется.
  if (high('ASD') && high('DIR')) {
    adjusted.ANT = round1(adjusted.ANT * 0.2)
    adjusted.SAD = round1(adjusted.SAD * 0.2)
    appliedRules.push({
      id: 'asd-dir-truth-motive',
      adjustments: { ANT: 0.2, SAD: 0.2 },
      reason:
        'Высокие систематизация и прямота: резкие ответы отражают мотив «передача фактов», а не враждебность — вес шкал Психопатия/Садизм снижен для отображения',
      reasonEn:
        'High systematizing and directness: blunt answers reflect a "conveying facts" motive, not hostility — Psychopathy/Sadism display weights reduced',
    })
    profileLabels.push({
      id: 'radically-honest',
      label: 'Радикально честный',
      labelEn: 'Radically Honest',
      description: 'Правда без обёртки — способ уважать собеседника, а не ранить его',
      descriptionEn: 'Truth without wrapping — a way of respecting the interlocutor, not wounding them',
    })
  }

  // ── Правило 2: Маскирующий (ASD высокий, DIR низкий) ──────────────────────
  if (high('ASD') && low('DIR')) {
    profileLabels.push({
      id: 'masking',
      label: 'Маскирующий',
      labelEn: 'Masking',
      description:
        'Черты спектра при подавленной прямоте — признак камуфлирования; маскинг энергозатратен и повышает риск выгорания',
      descriptionEn:
        'Spectrum traits with suppressed directness suggest camouflaging; masking is costly and raises burnout risk',
    })
  }

  // ── Правило 3: Стратег (MAC + SZD) ─────────────────────────────────────────
  // Холодный расчёт + дистанция = стратегическое мышление, не психопатия
  if (high('MAC') && high('SZD')) {
    profileLabels.push({
      id: 'strategist',
      label: 'Стратег',
      labelEn: 'Strategist',
      description: 'Расчёт и эмоциональная дистанция складываются в стратегическое мышление, а не в антисоциальность',
      descriptionEn: 'Calculation plus emotional distance add up to strategic thinking, not antisociality',
    })
  }

  // ── Правило 4: NAR-фасеты (NARQ: admiration/rivalry) ──────────────────────
  // Нарциссизм двумерен: сочетание с эмоциональной нестабильностью/дистимией —
  // уязвимый профиль; без тревожно-депрессивного фона — грандиозный
  if (high('NAR')) {
    if (high('BOR') || high('DPR')) {
      profileLabels.push({
        id: 'nar-vulnerable',
        label: 'Уязвимая грандиозность',
        labelEn: 'Vulnerable Grandiosity',
        description:
          'Высокая самооценка, которая держится на хрупком основании: чувствительность к критике и колебания ценности себя',
        descriptionEn: 'High self-regard resting on fragile ground: sensitivity to criticism and swings of self-worth',
      })
    } else if (low('AVD') && low('DEP') && low('DPR')) {
      profileLabels.push({
        id: 'nar-grandiose',
        label: 'Грандиозный профиль',
        labelEn: 'Grandiose Profile',
        description: 'Устойчивая уверенность и стремление к признанию без тревожно-депрессивного фона',
        descriptionEn: 'Stable confidence and drive for recognition without an anxious-depressive background',
      })
    }
  }

  return { adjustedDisplay: adjusted, appliedRules, profileLabels }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
