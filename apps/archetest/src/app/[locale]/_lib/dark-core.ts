/**
 * Индекс «Тёмное ядро» (Фаза 3) — интерпретационный слой ПОВЕРХ normalized.
 *
 * Приближение D-фактора (Dark Factor of Personality) из четырёх уже существующих
 * тёмных шкал ядра: MAC (макиавеллизм), NAR (нарциссическое), ANT (антисоциальное,
 * в контексте триады — психопатия), SAD (бытовой садизм). Новых вопросов не требует.
 *
 * Теория. D — «общая тенденция максимизировать собственную выгоду, пренебрегая,
 * принимая или злонамеренно провоцируя ущерб для других, вместе с убеждениями,
 * которые это оправдывают» (Moshagen, Hilbig & Zettler, 2018, Psychological Review
 * 125, 656–688, doi:10.1037/rev0000111). Отдельные тёмные черты — «flavored
 * manifestations»: общее ядро D плюс уникальный, по сути НЕ-аверсивный «вкус»
 * (Bader et al., 2023, Journal of Personality 91, 1084–1109, doi:10.1111/jopy.12785).
 * Отсюда двухчастный вывод индекса: уровень ядра + вкус каждой шкалы над ядром.
 *
 * ⚠️ Ограничения — обязаны доходить до психолога, а не оставаться в коде:
 *  1. Это НЕ измерение D. D измеряется инструментами D70/D35/D16 (Moshagen, Zettler
 *     & Hilbig, 2020, Psychological Assessment 32, 182–196, doi:10.1037/pas0000778).
 *  2. Композит тетрады коррелирует с полным D на r = .85 — это НИЖЕ медианы
 *     случайных комбинаций из четырёх аверсивных черт (r = .90); авторы прямо
 *     предостерегают считать тетраду главным представлением ядра (Hilbig, Thielmann,
 *     Zettler & Moshagen, 2023, Scientific Reports 13:15293, doi:10.1038/s41598-023-42115-z).
 *     Просадку даёт нарциссическое «восхищение» — отсюда анализ чувствительности.
 *  3. Существует критика: латентные D и антагонизм коррелируют на −.90, инкрементальной
 *     валидности D не показано — «jangle fallacy» (Vize, Miller & Lynam, 2021,
 *     doi:10.1111/jopy.12601; ответ авторов D — Hilbig et al., 2021, JRP 91, 104074).
 *     Шкалы Agreeableness/HEXACO в тесте нет, поэтому проверить это на наших данных
 *     невозможно в принципе.
 *
 * ⚠️ Ярлыка АБСОЛЮТНОГО уровня («высокое тёмное ядро») в этом модуле нет намеренно:
 * normalized — процент от максимума по отвеченным пунктам, а не перцентиль, поэтому
 * утверждение о положении человека в популяции сделать нельзя до накопления норм
 * (5.6.2, N ≈ 200–300). Главный вывод индекса — СТРУКТУРНЫЙ (ровное ядро / выраженный
 * вкус / поляризация): это сравнение внутри профиля, оно корректно уже сейчас.
 *
 * ⚠️ Импорт из scoring-core — ТОЛЬКО `import type`. Value-импорт затянет
 * max-scores-per-question.json (462 КБ) в клиентский бандл кабинета.
 *
 * Как interpretation-rules и armor-radar: чистая функция, вход не мутируется,
 * raw/normalized в БД не затрагиваются. Показывается ТОЛЬКО психологу.
 */
import type { PersonalityTypeCode, ScaleCode } from '../_data/personality-types'
import type { IpsativeScale } from './ipsative'
import { wilsonInterval } from './ipsative'
import type { ScaleConfidence } from './scoring-core'

/**
 * Шкалы тетрады, входящие в приближение D.
 * MAS (мазохизм) исключён осознанно: деструкция направлена на СЕБЯ, а D по
 * определению — максимизация своей выгоды с ущербом ДРУГИМ.
 */
export const DARK_CORE_CODES = ['MAC', 'NAR', 'ANT', 'SAD'] as const

/** Тетрада без нарциссического «восхищения» — анализ чувствительности (Hilbig et al., 2023) */
export const DARK_CORE_CODES_NO_NAR = ['MAC', 'ANT', 'SAD'] as const

/**
 * Порог «выраженного вкуса»: |отклонение шкалы от ядра| в пунктах 0–100.
 * Прагматический, как ARMOR_RADAR_THRESHOLD: ≈¾ полосы getScaleLevel (20 пунктов);
 * ниже этого отклонение сравнимо с шириной интервала Уилсона при реалистичных n.
 * Эмпирически не подкреплён — перепроверить при первых нормах.
 */
export const DARK_CORE_FLAVOR_THRESHOLD = 15

/** Минимум измеренных шкал тетрады, чтобы считать ядро */
export const DARK_CORE_MIN_SCALES = 3

/** Минимум измеренных шкал для варианта без нарциссизма */
export const DARK_CORE_MIN_SCALES_NO_NAR = 2

/**
 * Минимум отвеченных релевантных вопросов, чтобы шкала считалась измеренной.
 * normalized = 0 бывает и при actual_max = 0 («нет данных»), и при честном нуле —
 * различает эти случаи ТОЛЬКО relevantCounts. Порог нужен ещё и потому, что банк
 * асимметричен (SAD — 21 релевантный вопрос, ANT — 987): при n = 1 один ответ
 * двигает normalized на десятки пунктов.
 */
export const DARK_CORE_MIN_N = 3

/**
 * Порог чувствительности к нарциссизму — ВЫВОДИТСЯ, а не назначается.
 * При всех четырёх измеренных шкалах выполняется тождество
 *   core − coreWithoutNarcissism = deviation(NAR) / 3,
 * поэтому флаг «нарциссизм двигает оценку» эквивалентен «вкус NAR выражен».
 */
export const DARK_CORE_SENSITIVITY_DELTA = DARK_CORE_FLAVOR_THRESHOLD / 3

/** Сколько верхних позиций профиля считать «топом» в ipsative-контексте */
export const DARK_CORE_TOP_N = 5

/** Обязательная оговорка о метрике — UI не имеет права показать индекс без неё */
export const DARK_CORE_CAVEAT = 'Приближение, а не измерение D: композит четырёх шкал коррелирует с полным D-фактором '
  + 'на r ≈ .85 (Hilbig et al., 2023), тогда как сам D измеряется инструментами D70/D35/D16. '
  + 'Баллы — процент от максимума по отвеченным вопросам, а не перцентиль: сказать «выше, '
  + 'чем у N% людей» нельзя до накопления нормативной выборки. Отклонение шкалы от ядра — '
  + 'гипотеза для проверки в разговоре, а не находка: постоянный сдвиг шкалы из-за '
  + 'формулировок пунктов неотличим от индивидуального «вкуса».'

export const DARK_CORE_CAVEAT_EN =
  'An approximation, not a measurement of D: the four-scale composite correlates with the '
  + 'full D factor at r ≈ .85 (Hilbig et al., 2023), while D itself is measured with the '
  + 'D70/D35/D16 inventories. Scores are a percentage of the maximum across answered items, '
  + 'not a percentile: “higher than N% of people” cannot be claimed until a normative sample '
  + 'is collected. A scale’s deviation from the core is a hypothesis to explore in conversation, '
  + 'not a finding: a constant scale shift caused by item wording is indistinguishable from an '
  + 'individual “flavor”.'

/** Код шкалы, входящей в тёмное ядро */
export type DarkCoreCode = (typeof DARK_CORE_CODES)[number]

/**
 * Структурный вывод — ГЛАВНЫЙ вывод индекса.
 * Ярлыка абсолютного уровня здесь нет намеренно (см. шапку модуля).
 */
export type DarkCoreStructure = 'even' | 'flavored' | 'polarized' | 'muted' | 'insufficient'

/** Происхождение «вкуса»: разложение Bader (2023) или авторская экстраполяция */
export type DarkFlavorSource = 'bader2023' | 'extrapolated'

/** «Вкус» шкалы — что остаётся от неё, если вычесть общее ядро */
export interface DarkFlavor {
  code: DarkCoreCode
  /** Балл шкалы, 0–100 (normalized) */
  score: number
  /** Отклонение от ядра в пунктах, со знаком */
  deviation: number
  /** |deviation| >= порога */
  pronounced: boolean
  /** Отвеченных релевантных вопросов шкалы */
  n: number
  confidence: ScaleConfidence
  /** 95%-интервал Уилсона по шкале, 0–100 — ориентир точности, не строгая статистика */
  ciLow: number
  ciHigh: number
  /** Название не-аверсивного «вкуса» */
  label: string
  labelEn: string
  /** Что означает превышение над ядром */
  description: string
  descriptionEn: string
  /** Что остаётся от шкалы, если вычесть D */
  residual: string
  residualEn: string
  source: DarkFlavorSource
}

/**
 * Ipsative-контекст: единственный законный сегодня ответ на вопрос «насколько выражено».
 * Сравнение ВНУТРИ профиля человека, не с другими людьми.
 */
export interface DarkCoreProfileContext {
  /** Средний ранг измеренных тёмных шкал (1 — самая выраженная в профиле) */
  meanRank: number
  /** Ранги измеренных тёмных шкал, по возрастанию */
  ranks: { code: DarkCoreCode; rank: number }[]
  /** Сколько тёмных шкал попало в топ-topN профиля */
  inTopN: number
  topN: number
  /** Всего шкал в переданном ранжировании */
  totalScales: number
  /** Среднее normalized по профилю — ipsative-ориентир, НЕ перцентиль */
  profileMean: number
  /** core − profileMean: ядро выше/ниже собственного фона человека, в пунктах */
  coreVsProfile: number
}

/**
 * Результат индекса. Порядок полей значим: структурный вывод стоит выше числа —
 * это сигнал тому, кто пишет компонент (число не должно быть заголовком блока).
 */
export interface DarkCoreIndex {
  /** ГЛАВНЫЙ вывод */
  structure: DarkCoreStructure
  label: string
  labelEn: string
  description: string
  descriptionEn: string
  attention: string
  attentionEn: string

  /** Вкусы измеренных шкал, отсортированы по |deviation| убыв., тай-брейк — код по алфавиту */
  flavors: DarkFlavor[]
  /** Ведущий вкус (положительный выброс, либо отрицательный при structure = 'muted') */
  leadingFlavor: DarkFlavor | null

  /** Уровень ядра, 0–100. null — измеренных шкал меньше минимума */
  core: number | null
  coreCiLow: number | null
  coreCiHigh: number | null
  /** Размах между измеренными шкалами, в пунктах */
  spread: number | null

  /** Анализ чувствительности (Hilbig et al., 2023) */
  coreWithoutNarcissism: number | null
  narcissismDelta: number | null
  narcissismDrivesEstimate: boolean

  includedCodes: DarkCoreCode[]
  missingCodes: DarkCoreCode[]

  /** Минимум по измеренным шкалам — композит не надёжнее худшего компонента */
  confidence: ScaleConfidence
  weakestCode: DarkCoreCode | null

  /** null, если ipsative-ранжирование не передано */
  profile: DarkCoreProfileContext | null

  /** Копия DARK_CORE_CAVEAT — чтобы UI не мог отрендерить индекс без оговорки */
  caveat: string
  caveatEn: string
}

export interface DarkCoreInput {
  normalized: Partial<Record<ScaleCode, number>>
  relevantCounts: Partial<Record<ScaleCode, number>>
  confidence: Partial<Record<ScaleCode, ScaleConfidence>>
  /** Ipsative-ранжирование профиля (computeIpsativeRanking). Нет → profile: null */
  ranking?: readonly IpsativeScale[]
}

export interface DarkCoreOptions {
  flavorThreshold?: number
  minScales?: number
  minN?: number
  topN?: number
}

/**
 * «Вкусы» по Bader et al. (2023): не-аверсивный остаток черты после вычитания D.
 * Формулировки согласованы с описаниями шкал в personality-types.ts
 * (Гроссмейстер / Факел / Бунтарь / Гладиатор).
 */
const FLAVORS: Record<
  DarkCoreCode,
  Omit<DarkFlavor, 'code' | 'score' | 'deviation' | 'pronounced' | 'n' | 'confidence' | 'ciLow' | 'ciHigh'>
> = {
  MAC: {
    label: 'Расчётливость',
    labelEn: 'Planfulness',
    description:
      'Макиавеллизм выше общего ядра: тёмная тенденция реализуется через план, а не через импульс. Ходы просчитаны, выдержка высокая, результат отложен во времени.',
    descriptionEn:
      'Machiavellianism above the common core: the aversive tendency plays out through planning rather than impulse. Moves are calculated, restraint is high, payoff is deferred.',
    residual:
      'Долгосрочный расчёт, стратегическое планирование, выдержка ради отложенной выгоды. Без ядра это управленческая компетенция, а не манипуляция.',
    residualEn:
      'Long-range calculation, strategic planning, restraint for deferred gain. Without the core this is a managerial competence, not manipulation.',
    source: 'bader2023',
  },
  NAR: {
    label: 'Стремление к восхищению',
    labelEn: 'Admiration seeking',
    description:
      'Нарциссизм выше общего ядра: заметен агентный компонент — потребность в признании и энергия самопрезентации. Именно этот компонент, по Hilbig et al. (2023), хуже всего представляет ядро.',
    descriptionEn:
      'Narcissism above the common core: the agentic component stands out — a need for recognition and self-presentation drive. Per Hilbig et al. (2023), this is exactly the component that represents the core worst.',
    residual:
      'Потребность в признании, энергия самопрезентации, умение заявить о себе. Без ядра это амбиция и видимость, а не эксплуатация.',
    residualEn:
      'A need for recognition, self-presentation energy, the ability to make oneself visible. Without the core this is ambition and visibility, not exploitation.',
    source: 'bader2023',
  },
  ANT: {
    label: 'Расторможенность',
    labelEn: 'Disinhibition',
    description:
      'Антисоциальная шкала выше общего ядра: тормоз между импульсом и действием слабее, чем общий тёмный фон. Тенденция реализуется быстро и ситуативно, а не по плану.',
    descriptionEn:
      'The antisocial scale above the common core: the brake between impulse and action is weaker than the general dark baseline. The tendency plays out fast and situationally, not by plan.',
    residual:
      'Слабый тормоз между импульсом и действием, низкая переносимость скуки, скорость реакции. Без ядра это спонтанность и быстрые решения в неопределённости.',
    residualEn:
      'A weak brake between impulse and action, low boredom tolerance, speed of reaction. Without the core this is spontaneity and fast decisions under uncertainty.',
    source: 'bader2023',
  },
  SAD: {
    label: 'Азарт интенсивности',
    labelEn: 'Intensity appetite',
    description:
      'Садизм выше общего ядра: выражена тяга к высокой интенсивности и прямому столкновению. Разложения Bader для садизма нет — это экстраполяция того же принципа, требует осторожности.',
    descriptionEn:
      'Sadism above the common core: a pronounced appetite for high intensity and direct confrontation. Bader’s decomposition does not cover sadism — this is an extrapolation of the same principle and needs caution.',
    residual:
      'Тяга к высокой интенсивности, устойчивость к чужому дискомфорту и жёсткому материалу. Без ядра это соревновательный азарт и переносимость тяжёлого.',
    residualEn:
      'An appetite for high intensity, tolerance for others’ discomfort and for harsh material. Without the core this is competitive drive and the capacity to stay with difficult content.',
    source: 'extrapolated',
  },
}

const STRUCTURES: Record<
  DarkCoreStructure,
  Omit<
    DarkCoreIndex,
    | 'structure'
    | 'flavors'
    | 'leadingFlavor'
    | 'core'
    | 'coreCiLow'
    | 'coreCiHigh'
    | 'spread'
    | 'coreWithoutNarcissism'
    | 'narcissismDelta'
    | 'narcissismDrivesEstimate'
    | 'includedCodes'
    | 'missingCodes'
    | 'confidence'
    | 'weakestCode'
    | 'profile'
    | 'caveat'
    | 'caveatEn'
  >
> = {
  even: {
    label: 'Ровное ядро',
    labelEn: 'Even core',
    description:
      'Измеренные тёмные шкалы держатся близко к общему уровню — ни одна не выделяется. Это конфигурация, в которой приближение общего ядра наиболее осмысленно.',
    descriptionEn:
      'The measured dark scales stay close to the common level — none stands out. This is the configuration in which approximating the common core makes the most sense.',
    attention:
      'Читать как общую тенденцию, а не как набор отдельных черт: содержательной разницы между шкалами здесь нет.',
    attentionEn:
      'Read this as a general tendency rather than a set of distinct traits: there is no meaningful difference between the scales here.',
  },
  flavored: {
    label: 'Ядро с выраженным вкусом',
    labelEn: 'Core with a pronounced flavor',
    description:
      'Общий уровень плюс одна шкала заметно выше остальных. По Bader et al. (2023) это тот же общий фактор со специфическим «вкусом», а не отдельная самостоятельная черта.',
    descriptionEn:
      'A common level plus one scale noticeably above the rest. Per Bader et al. (2023) this is the same general factor with a specific “flavor”, not a separate standalone trait.',
    attention:
      'В работе имеет смысл цепляться за «вкус» — форму, в которой тенденция проявляется, — а не за ярлык черты. Это гипотеза для разговора, а не вывод.',
    attentionEn:
      'In practice it is worth working with the “flavor” — the form the tendency takes — rather than with a trait label. This is a hypothesis for conversation, not a conclusion.',
  },
  polarized: {
    label: 'Разнонаправленные вкусы',
    labelEn: 'Divergent flavors',
    description:
      'Две или более шкалы выше общего уровня одновременно, причём в разных направлениях. Среднее в этом случае — плохое резюме профиля.',
    descriptionEn:
      'Two or more scales sit above the common level at once, in different directions. In this case the average is a poor summary of the profile.',
    attention: 'Читать шкалы по отдельности: единый показатель ядра здесь скрывает больше, чем показывает.',
    attentionEn: 'Read the scales separately: a single core figure hides more than it reveals here.',
  },
  muted: {
    label: 'Ядро с приглушённым компонентом',
    labelEn: 'Core with a muted component',
    description:
      'Одна шкала заметно ниже остальных при отсутствии выбросов вверх. Если приглушён нарциссизм — конфигурация ближе всего к «чистому» общему ядру: именно нарциссическое восхищение сильнее прочего размывает приближение (Hilbig et al., 2023).',
    descriptionEn:
      'One scale sits noticeably below the others with no upward outliers. If narcissism is the muted one, the configuration is closest to a “pure” common core: narcissistic admiration is what blurs the approximation most (Hilbig et al., 2023).',
    attention:
      'Проверить, не связано ли снижение с малым числом отвеченных вопросов по этой шкале — смотрите n и интервал рядом с ней.',
    attentionEn:
      'Check whether the drop is driven by a small number of answered items on that scale — see its n and interval alongside.',
  },
  insufficient: {
    label: 'Данных недостаточно',
    labelEn: 'Insufficient data',
    description:
      'Измерено меньше трёх шкал тетрады, поэтому индекс не рассчитывается. Общий фактор из одной-двух шкал не выделяется — это были бы просто отдельные шкалы под новым именем.',
    descriptionEn:
      'Fewer than three tetrad scales are measured, so the index is not computed. A general factor cannot be extracted from one or two scales — that would just be individual scales under a new name.',
    attention:
      'Читать отвеченные тёмные шкалы напрямую в профиле. Индекс появится, когда клиент ответит на большее число релевантных вопросов.',
    attentionEn:
      'Read the answered dark scales directly in the profile. The index will appear once the client answers more relevant items.',
  },
}

const CONFIDENCE_ORDER: ScaleConfidence[] = ['insufficient', 'low', 'moderate', 'high']

/** Слабейшая достоверность из списка. Пустой список → 'insufficient'. */
export function minConfidence(list: readonly ScaleConfidence[]): ScaleConfidence {
  let worst = CONFIDENCE_ORDER.length - 1
  for (const c of list) {
    const idx = CONFIDENCE_ORDER.indexOf(c)
    if (idx >= 0 && idx < worst) {
      worst = idx
    }
  }
  return list.length === 0 ? 'insufficient' : CONFIDENCE_ORDER[worst]
}

/**
 * Измерена ли шкала. Экспортируется, чтобы UI не писал `score > 0` —
 * это условие не отличает «нет данных» от честного нуля.
 */
export function isDarkScaleMeasured(
  code: DarkCoreCode,
  relevantCounts: Partial<Record<ScaleCode, number>>,
  minN: number = DARK_CORE_MIN_N,
): boolean {
  return (relevantCounts[code] ?? 0) >= minN
}

/**
 * Приближение D-фактора из имеющихся тёмных шкал.
 *
 * Вход НЕ мутируется. Функция ВСЕГДА возвращает заполненный объект — в том числе
 * при нехватке данных (structure: 'insufficient', core: null, тексты на обоих языках).
 * Вызывающий компонент не должен изобретать условие показа сам: гейт —
 * `structure !== 'insufficient'`.
 */
export function computeDarkCore(input: DarkCoreInput, options?: DarkCoreOptions): DarkCoreIndex {
  const flavorThreshold = options?.flavorThreshold ?? DARK_CORE_FLAVOR_THRESHOLD
  const minScales = options?.minScales ?? DARK_CORE_MIN_SCALES
  const minN = options?.minN ?? DARK_CORE_MIN_N
  const topN = options?.topN ?? DARK_CORE_TOP_N

  const { normalized, relevantCounts, confidence, ranking } = input

  const includedCodes: DarkCoreCode[] = []
  const missingCodes: DarkCoreCode[] = []
  for (const code of DARK_CORE_CODES) {
    if (isDarkScaleMeasured(code, relevantCounts, minN)) {
      includedCodes.push(code)
    } else {
      missingCodes.push(code)
    }
  }

  const confidences = includedCodes.map((code) => confidence[code] ?? 'insufficient')
  const aggregateConfidence = minConfidence(confidences)
  const weakestCode = pickWeakestCode(includedCodes, confidence)

  // Данных не хватает — индекс не считается, но объект возвращается заполненным
  if (includedCodes.length < minScales) {
    return {
      structure: 'insufficient',
      ...STRUCTURES.insufficient,
      flavors: [],
      leadingFlavor: null,
      core: null,
      coreCiLow: null,
      coreCiHigh: null,
      spread: null,
      coreWithoutNarcissism: computeSubsetMean(DARK_CORE_CODES_NO_NAR, normalized, relevantCounts, minN),
      narcissismDelta: null,
      narcissismDrivesEstimate: false,
      includedCodes,
      missingCodes,
      confidence: aggregateConfidence,
      weakestCode,
      profile: null,
      caveat: DARK_CORE_CAVEAT,
      caveatEn: DARK_CORE_CAVEAT_EN,
    }
  }

  const scores = includedCodes.map((code) => normalized[code] ?? 0)
  const core = round1(scores.reduce((sum, s) => sum + s, 0) / scores.length)
  const spread = round1(Math.max(...scores) - Math.min(...scores))

  // Границы ядра — среднее границ шкал. Объединять n нельзя: один вопрос
  // релевантен нескольким шкалам, будет двойной счёт. Среднее границ
  // консервативнее независимого случая, а шкалы тетрады по теории D
  // положительно коррелируют — то есть ошибка идёт в безопасную сторону.
  const bounds = includedCodes.map((code) => wilsonInterval((normalized[code] ?? 0) / 100, relevantCounts[code] ?? 0))
  const coreCiLow = round1((bounds.reduce((sum, b) => sum + b.low, 0) / bounds.length) * 100)
  const coreCiHigh = round1((bounds.reduce((sum, b) => sum + b.high, 0) / bounds.length) * 100)

  const flavors: DarkFlavor[] = includedCodes.map((code, i) => {
    const score = normalized[code] ?? 0
    const deviation = round1(score - core)
    return {
      code,
      score,
      deviation,
      pronounced: Math.abs(deviation) >= flavorThreshold,
      n: relevantCounts[code] ?? 0,
      confidence: confidence[code] ?? 'insufficient',
      ciLow: round1(bounds[i].low * 100),
      ciHigh: round1(bounds[i].high * 100),
      ...FLAVORS[code],
    }
  })
  flavors.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation) || a.code.localeCompare(b.code))

  // Анализ чувствительности: тот же расчёт без нарциссического «восхищения»
  const coreWithoutNarcissism = computeSubsetMean(DARK_CORE_CODES_NO_NAR, normalized, relevantCounts, minN)
  const narcissismDelta = coreWithoutNarcissism !== null && includedCodes.includes('NAR')
    ? round1(core - coreWithoutNarcissism)
    : null
  const narcissismDrivesEstimate = narcissismDelta !== null && Math.abs(narcissismDelta) >= flavorThreshold / 3

  const structure = classifyStructure(flavors, flavorThreshold)
  const leadingFlavor = pickLeadingFlavor(flavors, structure, flavorThreshold)

  return {
    structure,
    ...STRUCTURES[structure],
    flavors,
    leadingFlavor,
    core,
    coreCiLow,
    coreCiHigh,
    spread,
    coreWithoutNarcissism,
    narcissismDelta,
    narcissismDrivesEstimate,
    includedCodes,
    missingCodes,
    confidence: aggregateConfidence,
    weakestCode,
    profile: ranking ? buildProfileContext(ranking, includedCodes, core, topN) : null,
    caveat: DARK_CORE_CAVEAT,
    caveatEn: DARK_CORE_CAVEAT_EN,
  }
}

/**
 * Классификация структуры. Порядок ветвления критичен: ветвимся по ПОЛОЖИТЕЛЬНЫМ
 * отклонениям. Наивное «max|deviation| >= порога → выраженный вкус» ломается —
 * при 90/30/30/30 центрирование даёт +45, −15, −15, −15, и правило «два и более
 * превышают порог → поляризация» дало бы неверный вердикт.
 */
function classifyStructure(flavors: DarkFlavor[], threshold: number): DarkCoreStructure {
  const positives = flavors.filter((f) => f.deviation >= threshold)
  if (positives.length >= 2) {
    return 'polarized'
  }
  if (positives.length === 1) {
    return 'flavored'
  }
  if (flavors.some((f) => f.deviation <= -threshold)) {
    return 'muted'
  }
  return 'even'
}

/** Ведущий вкус: положительный выброс, либо отрицательный при 'muted' */
function pickLeadingFlavor(flavors: DarkFlavor[], structure: DarkCoreStructure, threshold: number): DarkFlavor | null {
  if (structure === 'flavored' || structure === 'polarized') {
    return flavors.find((f) => f.deviation >= threshold) ?? null
  }
  if (structure === 'muted') {
    return flavors.find((f) => f.deviation <= -threshold) ?? null
  }
  return null
}

/** Среднее normalized по подмножеству кодов — только по измеренным, иначе null */
function computeSubsetMean(
  codes: readonly DarkCoreCode[],
  normalized: Partial<Record<ScaleCode, number>>,
  relevantCounts: Partial<Record<ScaleCode, number>>,
  minN: number,
): number | null {
  const measured = codes.filter((code) => isDarkScaleMeasured(code, relevantCounts, minN))
  if (measured.length < DARK_CORE_MIN_SCALES_NO_NAR) {
    return null
  }
  const sum = measured.reduce((acc, code) => acc + (normalized[code] ?? 0), 0)
  return round1(sum / measured.length)
}

/** Шкала с худшей достоверностью среди измеренных */
function pickWeakestCode(
  codes: DarkCoreCode[],
  confidence: Partial<Record<ScaleCode, ScaleConfidence>>,
): DarkCoreCode | null {
  let weakest: DarkCoreCode | null = null
  let weakestIdx = CONFIDENCE_ORDER.length
  for (const code of codes) {
    const idx = CONFIDENCE_ORDER.indexOf(confidence[code] ?? 'insufficient')
    if (idx < weakestIdx) {
      weakestIdx = idx
      weakest = code
    }
  }
  return weakest
}

/** Ipsative-контекст: где тёмные шкалы стоят внутри профиля этого человека */
function buildProfileContext(
  ranking: readonly IpsativeScale[],
  includedCodes: DarkCoreCode[],
  core: number,
  topN: number,
): DarkCoreProfileContext | null {
  if (ranking.length === 0) {
    return null
  }
  const included = new Set<PersonalityTypeCode>(includedCodes)
  const ranks = ranking
    .filter((entry) => included.has(entry.code))
    .map((entry) => ({ code: entry.code as DarkCoreCode, rank: entry.rank }))
    .sort((a, b) => a.rank - b.rank)

  if (ranks.length === 0) {
    return null
  }

  const profileMean = round1(ranking.reduce((sum, e) => sum + e.normalized, 0) / ranking.length)

  return {
    meanRank: round1(ranks.reduce((sum, r) => sum + r.rank, 0) / ranks.length),
    ranks,
    inTopN: ranks.filter((r) => r.rank <= topN).length,
    topN,
    totalScales: ranking.length,
    profileMean,
    coreVsProfile: round1(core - profileMean),
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
