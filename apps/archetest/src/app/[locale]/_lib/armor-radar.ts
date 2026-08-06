/**
 * Индекс «Броня и Радар» (этап 5.5) — интерпретационный слой ПОВЕРХ normalized.
 *
 * Кросс-шкальная метка из двух экспериментальных шкал (как interpretation-rules:
 * чистая функция, вход не мутируется, raw/normalized не затрагиваются):
 *   • Броня  = RES_PHYS — переносимость телесного дискомфорта, приглушённость сигналов тела
 *   • Радар  = RES_AFF  — со-переживание чужих состояний вплоть до личного дистресса
 *
 * Клинически интересна именно КОМБИНАЦИЯ. Особый паттерн — высокая броня + высокий радар:
 * человек глушит собственную боль, но впитывает чужую → риск соматизации и выгорания
 * замечается поздно. Показывается ТОЛЬКО в кабинете психолога, обе шкалы — «бета».
 */

/** Порог «высокого» по оси (середина шкалы 0–100) */
export const ARMOR_RADAR_THRESHOLD = 50

/** Квадрант индекса «Броня и Радар» */
export type ArmorRadarQuadrant = 'lightning-rod' | 'fortress' | 'bare-nerve' | 'even'

export interface ArmorRadarIndex {
  /** Балл брони (RES_PHYS), 0–100 */
  physical: number
  /** Балл радара (RES_AFF), 0–100 */
  affective: number
  quadrant: ArmorRadarQuadrant
  label: string
  labelEn: string
  /** Что означает сочетание — язык для психолога */
  description: string
  descriptionEn: string
  /** На что обратить внимание */
  attention: string
  attentionEn: string
}

const QUADRANTS: Record<ArmorRadarQuadrant, Omit<ArmorRadarIndex, 'physical' | 'affective' | 'quadrant'>> = {
  'lightning-rod': {
    label: 'Громоотвод',
    labelEn: 'Lightning Rod',
    description:
      'Высокая броня и высокий радар: собственную боль и усталость глушит, но чужие состояния впитывает как проводник. Много несёт молча.',
    descriptionEn:
      'High armor and high radar: mutes own pain and fatigue, yet absorbs others’ states like a conductor. Carries a lot silently.',
    attention:
      'Риск соматизации и выгорания замечается поздно — сигналы тела приглушены, а чужой заряд идёт насквозь. Стоит проверять телесные симптомы и границы «моё/чужое».',
    attentionEn:
      'Somatization and burnout risk get noticed late — body signals are muted while others’ charge passes through. Worth checking bodily symptoms and the “mine/theirs” boundary.',
  },
  fortress: {
    label: 'Крепость',
    labelEn: 'Fortress',
    description:
      'Высокая броня при низком радаре: выносит физический дискомфорт и держит эмоциональную дистанцию. Опора в кризисах, не тонет в чужом.',
    descriptionEn:
      'High armor with low radar: endures physical discomfort and keeps emotional distance. An anchor in crises, does not drown in others’ states.',
    attention:
      'Может поздно замечать и свои телесные сигналы, и эмоциональный подтекст рядом. Рост — договорные «техосмотры» тела и явная сверка состояний близких словами.',
    attentionEn:
      'May be late to notice both own body signals and the emotional undertone nearby. Growth — scheduled body “check-ups” and explicitly checking loved ones’ states in words.',
  },
  'bare-nerve': {
    label: 'Оголённый нерв',
    labelEn: 'Bare Nerve',
    description:
      'Низкая броня при высоком радаре: тонко чувствует и собственное тело, и чужие состояния. Очень чуткий контакт, но проницаемость высокая.',
    descriptionEn:
      'Low armor with high radar: finely attuned to both own body and others’ states. Very sensitive contact, but high permeability.',
    attention:
      'Быстро перегружается в насыщенных контекстах. Рост — дозирование эмоциональной нагрузки, восстановление как рабочая задача, защита от чужих эмоций.',
    attentionEn:
      'Overloads quickly in intense contexts. Growth — dosing emotional load, recovery as a real task, shielding from others’ emotions.',
  },
  even: {
    label: 'Ровный фон',
    labelEn: 'Even Keel',
    description:
      'Броня и радар в среднем диапазоне: ни выраженного заглушения телесных сигналов, ни повышенной проницаемости к чужим состояниям.',
    descriptionEn:
      'Armor and radar in the mid range: neither pronounced muting of body signals nor heightened permeability to others’ states.',
    attention: 'Выраженного кросс-паттерна нет — интерпретировать шкалы по отдельности.',
    attentionEn: 'No pronounced cross-pattern — interpret the scales separately.',
  },
}

/**
 * Классифицировать сочетание брони (RES_PHYS) и радара (RES_AFF).
 * Оси делятся по середине шкалы; «Ровный фон» — когда ни одна ось не выражена.
 */
export function computeArmorRadar(
  physical: number,
  affective: number,
  threshold: number = ARMOR_RADAR_THRESHOLD,
): ArmorRadarIndex {
  const armorHigh = physical >= threshold
  const radarHigh = affective >= threshold

  let quadrant: ArmorRadarQuadrant
  if (armorHigh && radarHigh) {
    quadrant = 'lightning-rod'
  } else if (armorHigh && !radarHigh) {
    quadrant = 'fortress'
  } else if (!armorHigh && radarHigh) {
    quadrant = 'bare-nerve'
  } else {
    quadrant = 'even'
  }

  return { physical, affective, quadrant, ...QUADRANTS[quadrant] }
}
