/**
 * Утилиты для анализа интеграции между 5 уровнями диагностики ИМОТ
 *
 * Интеграция - это ключевой этап методики ИМОТ, где специалист находит
 * точки пересечения между разными уровнями диагностики:
 * - Нумерология
 * - Нейропсихология
 * - Энергетика
 * - Тело
 * - Стиль
 *
 * Цель: выявить глубинные паттерны и создать целостную картину личности.
 */

/**
 * Интерфейс профилей клиента для анализа интеграции
 * Соответствует полям из schema.zmodel
 */
export interface ClientProfiles {
  numerology?: {
    personalityNumber: number | null // personalNumber → personalityNumber
    destinyNumber: number | null
    soulNumber: number | null
    talents: string | null // JSON массив талантов (раньше talentZone)
    karmicLessons: string | null // JSON массив кармических уроков (раньше karmaZone)
  } | null

  neuroPsych?: {
    behaviorPatterns: string | null
    cognitiveStyle: string | null // thinkingStyle → cognitiveStyle
    defenseMechanisms: string | null // defenseProfile → defenseMechanisms
    emotionalPatterns: string | null
  } | null

  energy?: {
    rootChakra: number | null
    sacralChakra: number | null
    solarPlexusChakra: number | null
    heartChakra: number | null
    throatChakra: number | null
    thirdEyeChakra: number | null
    crownChakra: number | null
    moneyChannelLevel: number | null // moneyChannel → moneyChannelLevel
    relationshipEnergy: number | null // relationshipsEnergy → relationshipEnergy
  } | null

  body?: {
    tensionMap: string | null
    psychosomaticIssues: string | null // psychosomatics → psychosomaticIssues
    breathingPatterns: string | null
  } | null

  style?: {
    colorType: string | null
    primaryArchetype: string | null // mainArchetype → primaryArchetype
    secondaryArchetype?: string | null
    authenticityLevel: number | null // authenticity → authenticityLevel
  } | null
}

/**
 * Результат анализа интеграции
 */
export interface IntegrationAnalysis {
  // Общая оценка целостности (0-100)
  overallIntegration: number

  // Точки пересечения между уровнями
  intersections: Array<{
    levels: string[] // Какие уровни пересекаются
    theme: string // Тема пересечения
    description: string // Описание связи
    priority: 'high' | 'medium' | 'low' // Приоритет для работы
  }>

  // Выявленные паттерны
  patterns: Array<{
    pattern: string // Название паттерна
    manifestations: string[] // Как проявляется на разных уровнях
    rootCause: string // Возможная первопричина
  }>

  // Ресурсы (сильные стороны)
  resources: string[]

  // Области для развития (зоны роста)
  growthAreas: string[]

  // Рекомендации по дальнейшей работе
  recommendations: string[]
}

/**
 * Анализ нумерологии и энергетики
 * Связь между числами судьбы и состоянием чакр
 */
function analyzeNumerologyEnergy(
  numerology: NonNullable<ClientProfiles['numerology']>,
  energy: NonNullable<ClientProfiles['energy']>
): Array<{ theme: string; description: string; priority: 'high' | 'medium' | 'low' }> {
  const findings: Array<{ theme: string; description: string; priority: 'high' | 'medium' | 'low' }> = []

  // Личное число и корневая чакра
  const personalNum = numerology.personalityNumber ?? 0
  const rootChakraVal = energy.rootChakra ?? 0
  if (personalNum >= 1 && personalNum <= 5) {
    if (rootChakraVal < 5) {
      findings.push({
        theme: 'Заземление и стабильность',
        description:
          'Личное число указывает на потребность в практичности и стабильности, что совпадает с низкой энергией корневой чакры. Важно работать над укреплением базы.',
        priority: 'high',
      })
    }
  }

  // Число души и сердечная чакра
  const soulNum = numerology.soulNumber ?? 0
  const heartChakraVal = energy.heartChakra ?? 0
  if (soulNum >= 6 && soulNum <= 9) {
    if (heartChakraVal < 6) {
      findings.push({
        theme: 'Эмоциональная открытость',
        description:
          'Число души говорит о важности эмоциональных связей, но энергия сердечной чакры снижена. Рекомендуется работа с принятием себя и открытостью в отношениях.',
        priority: 'high',
      })
    }
  }

  // Таланты и горловая чакра — парсим JSON строку
  const talentZone = parseTalentZone(numerology.talents)
  const throatChakraVal = energy.throatChakra ?? 0
  if (talentZone.some((t) => [3, 5, 7].includes(t))) {
    if (throatChakraVal < 6) {
      findings.push({
        theme: 'Самовыражение и коммуникация',
        description:
          'Таланты указывают на способность к творческому самовыражению, но горловая чакра заблокирована. Важно найти каналы для выражения себя.',
        priority: 'medium',
      })
    }
  }

  // Денежный канал и материальные энергии
  const moneyChannelVal = energy.moneyChannelLevel ?? 0
  const destinyNum = numerology.destinyNumber ?? 0
  if (moneyChannelVal < 5 && destinyNum >= 4 && destinyNum <= 8) {
    findings.push({
      theme: 'Финансовая реализация',
      description:
        'Число судьбы указывает на потенциал материальной реализации, но денежный канал заблокирован. Нужна работа с отношением к деньгам и изобилию.',
      priority: 'high',
    })
  }

  return findings
}

/**
 * Парсинг JSON строки талантов в массив чисел
 */
function parseTalentZone(talents: string | null): number[] {
  if (!talents) {
    return []
  }
  try {
    const parsed = JSON.parse(talents)
    return Array.isArray(parsed) ? parsed.filter((t): t is number => typeof t === 'number') : []
  } catch {
    return []
  }
}

/**
 * Парсинг JSON строки кармических уроков в массив чисел
 */
function parseKarmaZone(karmicLessons: string | null): number[] {
  if (!karmicLessons) {
    return []
  }
  try {
    const parsed = JSON.parse(karmicLessons)
    return Array.isArray(parsed) ? parsed.filter((k): k is number => typeof k === 'number') : []
  } catch {
    return []
  }
}

/**
 * Анализ энергетики и тела
 * Связь между состоянием чакр и телесными зажимами
 */
function analyzeEnergyBody(
  energy: NonNullable<ClientProfiles['energy']>,
  body: NonNullable<ClientProfiles['body']>
): Array<{ theme: string; description: string; priority: 'high' | 'medium' | 'low' }> {
  const findings: Array<{ theme: string; description: string; priority: 'high' | 'medium' | 'low' }> = []

  const tensionMap = body.tensionMap?.toLowerCase() ?? ''
  const breathingPatterns = body.breathingPatterns?.toLowerCase() ?? ''

  // Корневая чакра и тазовая область
  const rootChakraVal = energy.rootChakra ?? 0
  if (rootChakraVal < 5 && tensionMap.includes('таз')) {
    findings.push({
      theme: 'Базовая безопасность и заземление',
      description:
        'Низкая энергия корневой чакры проявляется в зажимах тазовой области. Это указывает на проблемы с чувством безопасности и заземленности.',
      priority: 'high',
    })
  }

  // Солнечное сплетение и диафрагма
  const solarPlexusVal = energy.solarPlexusChakra ?? 0
  if (solarPlexusVal < 5 && tensionMap.includes('диафрагм')) {
    findings.push({
      theme: 'Личная сила и контроль',
      description:
        'Блокировка чакры солнечного сплетения связана с зажимами диафрагмы. Это говорит о проблемах с личными границами и контролем.',
      priority: 'high',
    })
  }

  // Горловая чакра и шея/плечи
  const throatChakraVal = energy.throatChakra ?? 0
  if (throatChakraVal < 5 && (tensionMap.includes('шея') || tensionMap.includes('плеч'))) {
    findings.push({
      theme: 'Самовыражение и коммуникация',
      description:
        'Блокировка горловой чакры проявляется в зажимах шеи и плеч. Это указывает на невысказанные слова и подавленное самовыражение.',
      priority: 'medium',
    })
  }

  // Дыхание и энергетика
  if (breathingPatterns.includes('поверхност')) {
    const lowChakrasCount = [energy.rootChakra ?? 0, energy.sacralChakra ?? 0, energy.solarPlexusChakra ?? 0].filter(
      (c) => c < 5
    ).length

    if (lowChakrasCount >= 2) {
      findings.push({
        theme: 'Дыхание и жизненная энергия',
        description:
          'Поверхностное дыхание связано с низкой энергией нижних чакр. Это базовый паттерн, блокирующий жизненную силу.',
        priority: 'high',
      })
    }
  }

  return findings
}

/**
 * Анализ стиля и остальных уровней
 * Как внешнее самовыражение связано с внутренним состоянием
 */
function analyzeStyleIntegration(
  style: NonNullable<ClientProfiles['style']>,
  profiles: ClientProfiles
): Array<{ theme: string; description: string; priority: 'high' | 'medium' | 'low' }> {
  const findings: Array<{ theme: string; description: string; priority: 'high' | 'medium' | 'low' }> = []

  // Низкая аутентичность
  const authenticityVal = style.authenticityLevel ?? 0
  if (authenticityVal < 5) {
    findings.push({
      theme: 'Аутентичность и самовыражение',
      description:
        'Низкий уровень аутентичности указывает на разрыв между внутренним "я" и внешним образом. Важно работать над принятием себя на всех уровнях.',
      priority: 'high',
    })

    // Связь с горловой чакрой
    const throatChakraVal = profiles.energy?.throatChakra ?? 0
    if (profiles.energy && throatChakraVal < 5) {
      findings.push({
        theme: 'Внешнее и внутреннее несоответствие',
        description:
          'Низкая аутентичность в стиле и блокировка горловой чакры указывают на страх самовыражения. Нужна работа с принятием своей уникальности.',
        priority: 'high',
      })
    }
  }

  // Архетип и энергетика
  const powerArchetypes = ['HERO', 'MAGICIAN', 'RULER']
  const solarPlexusVal = profiles.energy?.solarPlexusChakra ?? 0
  if (
    style.primaryArchetype &&
    powerArchetypes.includes(style.primaryArchetype) &&
    profiles.energy &&
    solarPlexusVal < 5
  ) {
    findings.push({
      theme: 'Архетип и личная сила',
      description:
        'Ваш архетип требует проявления силы и лидерства, но энергия чакры солнечного сплетения снижена. Важно развивать уверенность в себе.',
      priority: 'medium',
    })
  }

  return findings
}

/**
 * Выявление общих паттернов
 */
function identifyPatterns(profiles: ClientProfiles): Array<{
  pattern: string
  manifestations: string[]
  rootCause: string
}> {
  const patterns: Array<{
    pattern: string
    manifestations: string[]
    rootCause: string
  }> = []

  // Паттерн контроля и напряжения
  const controlManifestations: string[] = []
  const defenseMechanisms = profiles.neuroPsych?.defenseMechanisms?.toLowerCase() ?? ''
  if (defenseMechanisms.includes('контрол')) {
    controlManifestations.push('Защитные механизмы через контроль')
  }
  const tensionMap = profiles.body?.tensionMap?.toLowerCase() ?? ''
  if (tensionMap.includes('плеч')) {
    controlManifestations.push('Зажим в плечах (несение ответственности)')
  }
  const solarPlexusVal = profiles.energy?.solarPlexusChakra ?? 0
  if (profiles.energy && solarPlexusVal < 5) {
    controlManifestations.push('Блокировка чакры солнечного сплетения')
  }

  if (controlManifestations.length >= 2) {
    patterns.push({
      pattern: 'Паттерн контроля и перенапряжения',
      manifestations: controlManifestations,
      rootCause:
        'Глубинная потребность в безопасности через контроль ситуации. Возможно, связано с детским опытом нестабильности.',
    })
  }

  // Паттерн подавленного самовыражения
  const expressionManifestations: string[] = []
  const throatChakraVal = profiles.energy?.throatChakra ?? 0
  if (profiles.energy && throatChakraVal < 5) {
    expressionManifestations.push('Блокировка горловой чакры')
  }
  if (tensionMap.includes('шея')) {
    expressionManifestations.push('Зажим в шее и горле')
  }
  const authenticityVal = profiles.style?.authenticityLevel ?? 0
  if (profiles.style && authenticityVal < 5) {
    expressionManifestations.push('Низкая аутентичность в стиле')
  }

  if (expressionManifestations.length >= 2) {
    patterns.push({
      pattern: 'Подавленное самовыражение',
      manifestations: expressionManifestations,
      rootCause: 'Страх быть увиденным и услышанным. Возможно, связано с детским опытом критики или непринятия.',
    })
  }

  return patterns
}

/**
 * Определение ресурсов
 */
function identifyResources(profiles: ClientProfiles): string[] {
  const resources: string[] = []

  // Высокие чакры
  if (profiles.energy) {
    const heartVal = profiles.energy.heartChakra ?? 0
    const throatVal = profiles.energy.throatChakra ?? 0
    const thirdEyeVal = profiles.energy.thirdEyeChakra ?? 0
    const crownVal = profiles.energy.crownChakra ?? 0

    if (heartVal >= 7) {
      resources.push('Способность к безусловной любви и принятию')
    }
    if (throatVal >= 7) {
      resources.push('Развитое самовыражение и коммуникация')
    }
    if (thirdEyeVal >= 7) {
      resources.push('Сильная интуиция и ясновидение')
    }
    if (crownVal >= 7) {
      resources.push('Духовная связь и осознанность')
    }
  }

  // Таланты в нумерологии
  const talentZone = profiles.numerology ? parseTalentZone(profiles.numerology.talents) : []
  if (talentZone.length > 0) {
    resources.push(`Врожденные таланты: ${talentZone.map((t) => `энергия ${t}`).join(', ')}`)
  }

  // Высокая аутентичность
  const authenticityVal = profiles.style?.authenticityLevel ?? 0
  if (profiles.style && authenticityVal >= 7) {
    resources.push('Высокая аутентичность - честность с собой и миром')
  }

  return resources
}

/**
 * Определение областей роста
 */
function identifyGrowthAreas(profiles: ClientProfiles): string[] {
  const growthAreas: string[] = []

  // Низкие чакры
  if (profiles.energy) {
    const rootVal = profiles.energy.rootChakra ?? 0
    const sacralVal = profiles.energy.sacralChakra ?? 0
    const solarPlexusVal = profiles.energy.solarPlexusChakra ?? 0

    if (rootVal < 5) {
      growthAreas.push('Укрепление базы и заземления')
    }
    if (sacralVal < 5) {
      growthAreas.push('Раскрытие творчества и удовольствия')
    }
    if (solarPlexusVal < 5) {
      growthAreas.push('Развитие личной силы и уверенности')
    }
  }

  // Кармические уроки
  const karmaZone = profiles.numerology ? parseKarmaZone(profiles.numerology.karmicLessons) : []
  if (karmaZone.length > 0) {
    growthAreas.push('Проработка кармических уроков')
  }

  // Стиль
  const authenticityVal = profiles.style?.authenticityLevel ?? 0
  if (profiles.style && authenticityVal < 5) {
    growthAreas.push('Развитие аутентичности и самопринятия')
  }

  return growthAreas
}

/**
 * ОСНОВНАЯ ФУНКЦИЯ: Анализ интеграции между всеми уровнями диагностики
 *
 * @param profiles - Профили клиента по всем 5 уровням
 * @returns Полный анализ интеграции с рекомендациями
 */
export function analyzeIntegration(profiles: ClientProfiles): IntegrationAnalysis {
  const intersections: IntegrationAnalysis['intersections'] = []

  // Анализ пересечений между уровнями
  if (profiles.numerology && profiles.energy) {
    const findings = analyzeNumerologyEnergy(profiles.numerology, profiles.energy)
    intersections.push(
      ...findings.map((f) => ({
        levels: ['numerology', 'energy'],
        theme: f.theme,
        description: f.description,
        priority: f.priority,
      }))
    )
  }

  if (profiles.energy && profiles.body) {
    const findings = analyzeEnergyBody(profiles.energy, profiles.body)
    intersections.push(
      ...findings.map((f) => ({
        levels: ['energy', 'body'],
        theme: f.theme,
        description: f.description,
        priority: f.priority,
      }))
    )
  }

  if (profiles.style) {
    const findings = analyzeStyleIntegration(profiles.style, profiles)
    intersections.push(
      ...findings.map((f) => ({
        levels: ['style', 'overall'],
        theme: f.theme,
        description: f.description,
        priority: f.priority,
      }))
    )
  }

  // Выявление паттернов
  const patterns = identifyPatterns(profiles)

  // Ресурсы и области роста
  const resources = identifyResources(profiles)
  const growthAreas = identifyGrowthAreas(profiles)

  // Общая оценка интеграции (0-100)
  const profilesCount = Object.values(profiles).filter((p) => p !== null && p !== undefined).length
  const overallIntegration = Math.round((profilesCount / 5) * 100)

  // Рекомендации
  const recommendations: string[] = [
    'Начать работу с областями высокого приоритета',
    'Использовать выявленные ресурсы как опору в процессе трансформации',
    'Работать одновременно на всех уровнях для достижения синергии',
  ]

  if (intersections.filter((i) => i.priority === 'high').length >= 3) {
    recommendations.push('Рекомендуется индивидуальная сессия для глубокой проработки выявленных паттернов')
  }

  return {
    overallIntegration,
    intersections,
    patterns,
    resources,
    growthAreas,
    recommendations,
  }
}

/**
 * Форматировать результаты анализа интеграции для отображения
 */
export function formatIntegrationReport(analysis: IntegrationAnalysis): string {
  const report = `
АНАЛИЗ ИНТЕГРАЦИИ

Общая целостность: ${analysis.overallIntegration}%

ТОЧКИ ПЕРЕСЕЧЕНИЯ (${analysis.intersections.length}):
${analysis.intersections
  .map((i, idx) => `${idx + 1}. ${i.theme} [${i.priority}]\n   ${i.description}\n   Уровни: ${i.levels.join(', ')}`)
  .join('\n\n')}

ВЫЯВЛЕННЫЕ ПАТТЕРНЫ (${analysis.patterns.length}):
${analysis.patterns
  .map(
    (p, idx) => `${idx + 1}. ${p.pattern}\n   Проявления: ${p.manifestations.join('; ')}\n   Причина: ${p.rootCause}`
  )
  .join('\n\n')}

РЕСУРСЫ:
${analysis.resources.map((r) => `• ${r}`).join('\n')}

ОБЛАСТИ РОСТА:
${analysis.growthAreas.map((a) => `• ${a}`).join('\n')}

РЕКОМЕНДАЦИИ:
${analysis.recommendations.map((r, idx) => `${idx + 1}. ${r}`).join('\n')}
  `.trim()

  return report
}
