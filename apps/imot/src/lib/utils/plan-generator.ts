/**
 * Утилиты для генерации плана трансформации на основе диагностики
 *
 * План трансформации - это структурированная программа работы клиента,
 * созданная на основе полной диагностики по 5 уровням и анализа интеграции.
 *
 * Включает 5 этапов:
 * 1. DIAGNOSTICS - Диагностика
 * 2. INTEGRATION - Интеграция
 * 3. STRATEGY - Стратегия
 * 4. PRACTICE - Практика
 * 5. RESULT - Результат
 */

import type { TransformationStage } from '@/generated/prisma'
import type { ClientProfiles, IntegrationAnalysis } from './integration-analysis'

/**
 * Интерфейс сгенерированного плана трансформации
 */
export interface GeneratedPlan {
  // Текущий этап
  currentStage: TransformationStage

  // Описания для каждого этапа
  diagnosticsDescription: string
  integrationDescription: string
  strategyDescription: string
  practiceDescription: string
  expectedResults: string

  // Ключевые точки (JSON)
  keyPoints: string[]

  // Приоритеты работы (JSON)
  priorities: string[]

  // Рекомендуемая длительность (недели)
  estimatedDuration: number

  // Рекомендуемые практики (массив названий)
  recommendedPractices: Array<{
    title: string
    description: string
    level: string // К какому уровню относится
    frequency: string // Как часто выполнять
  }>
}

/**
 * Генерация описания этапа диагностики
 */
function generateDiagnosticsDescription(profiles: ClientProfiles): string {
  const completedProfiles = Object.entries(profiles)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key]) => {
      const names: Record<string, string> = {
        numerology: 'Нумерология',
        neuroPsych: 'Нейропсихология',
        energy: 'Энергетика',
        body: 'Тело',
        style: 'Стиль',
      }
      return names[key] || key
    })

  let description = `Проведена комплексная диагностика по методике ИМОТ.\n\n`
  description += `Заполнены профили: ${completedProfiles.join(', ')}.\n\n`

  // Краткая сводка по каждому уровню
  if (profiles.numerology) {
    description += `**Нумерология:** Определены ключевые числа личности (${
      profiles.numerology.personalityNumber ?? '-'
    }, ${profiles.numerology.destinyNumber ?? '-'}, ${
      profiles.numerology.soulNumber ?? '-'
    }), выявлены таланты и кармические уроки.\n\n`
  }

  if (profiles.energy) {
    const avgChakra =
      ((profiles.energy.rootChakra ?? 0) +
        (profiles.energy.sacralChakra ?? 0) +
        (profiles.energy.solarPlexusChakra ?? 0) +
        (profiles.energy.heartChakra ?? 0) +
        (profiles.energy.throatChakra ?? 0) +
        (profiles.energy.thirdEyeChakra ?? 0) +
        (profiles.energy.crownChakra ?? 0)) /
      7

    description += `**Энергетика:** Проведен анализ 7 чакр (средний уровень: ${avgChakra.toFixed(1)}/10). `

    if (avgChakra < 5) {
      description += `Выявлены значительные энергетические блоки, требующие проработки.\n\n`
    } else if (avgChakra < 7) {
      description += `Обнаружены отдельные блоки, есть потенциал для развития.\n\n`
    } else {
      description += `Общий энергетический уровень высокий, есть ресурс для трансформации.\n\n`
    }
  }

  if (profiles.neuroPsych) {
    description += `**Нейропсихология:** Выявлены основные паттерны поведения, стиль мышления и защитные механизмы.\n\n`
  }

  if (profiles.body) {
    description += `**Тело:** Составлена карта телесных зажимов, выявлены психосоматические проявления.\n\n`
  }

  if (profiles.style) {
    description += `**Стиль:** Определен цветотип (${profiles.style.colorType ?? 'не определен'}), архетип (${
      profiles.style.primaryArchetype ?? 'не определен'
    })`
    if (profiles.style.authenticityLevel) {
      description += `, уровень аутентичности: ${profiles.style.authenticityLevel}/10`
    }
    description += `.\n\n`
  }

  return description.trim()
}

/**
 * Генерация описания этапа интеграции
 */
function generateIntegrationDescription(analysis: IntegrationAnalysis, _profiles: ClientProfiles): string {
  let description = `На основе диагностики проведен анализ интеграции между всеми уровнями.\n\n`

  description += `**Общая целостность:** ${analysis.overallIntegration}%\n\n`

  // Ключевые пересечения
  const highPriorityIntersections = analysis.intersections.filter((i) => i.priority === 'high')

  if (highPriorityIntersections.length > 0) {
    description += `**Ключевые точки пересечения (высокий приоритет):**\n\n`
    highPriorityIntersections.slice(0, 3).forEach((intersection, idx) => {
      description += `${idx + 1}. **${intersection.theme}**\n   ${intersection.description}\n\n`
    })
  }

  // Паттерны
  if (analysis.patterns.length > 0) {
    description += `**Выявленные паттерны:**\n\n`
    analysis.patterns.slice(0, 2).forEach((pattern, idx) => {
      description += `${idx + 1}. **${pattern.pattern}**\n   Первопричина: ${pattern.rootCause}\n\n`
    })
  }

  // Ресурсы
  if (analysis.resources.length > 0) {
    description += `**Ваши ресурсы:**\n`
    analysis.resources.slice(0, 3).forEach((resource) => {
      description += `• ${resource}\n`
    })
    description += `\n`
  }

  return description.trim()
}

/**
 * Генерация стратегии трансформации
 */
function generateStrategyDescription(analysis: IntegrationAnalysis, _profiles: ClientProfiles): string {
  let description = `Индивидуальная стратегия трансформации разработана с учетом выявленных паттернов и приоритетов.\n\n`

  // Приоритетные направления
  description += `**Приоритетные направления работы:**\n\n`

  const growthAreas = analysis.growthAreas.slice(0, 3)
  growthAreas.forEach((area, idx) => {
    description += `${idx + 1}. ${area}\n`
  })
  description += `\n`

  // Подход к работе
  description += `**Подход:**\n`
  description += `Работа ведется одновременно на всех уровнях (нумерология, энергетика, тело, психика, стиль) для достижения синергетического эффекта. `
  description += `Упор делается на использование ваших сильных сторон как опоры для трансформации.\n\n`

  // Ожидаемый результат
  description += `**Ожидаемый результат:**\n`
  description += `Достижение целостности и гармонии на всех уровнях, раскрытие потенциала, устойчивые изменения в жизни.\n\n`

  return description.trim()
}

/**
 * Генерация описания практик
 */
function generatePracticeDescription(recommendedPractices: GeneratedPlan['recommendedPractices']): string {
  let description = `Подобраны практики для работы на всех уровнях трансформации.\n\n`

  // Группируем по уровням
  const practicesByLevel: Record<string, typeof recommendedPractices> = {}

  recommendedPractices.forEach((practice) => {
    if (!practicesByLevel[practice.level]) {
      practicesByLevel[practice.level] = []
    }
    practicesByLevel[practice.level].push(practice)
  })

  // Описываем по группам
  Object.entries(practicesByLevel).forEach(([level, practices]) => {
    const levelNames: Record<string, string> = {
      numerology: 'Нумерология',
      neuroPsych: 'Нейропсихология',
      energy: 'Энергетика',
      body: 'Тело',
      style: 'Стиль',
      overall: 'Общие',
    }

    description += `**${levelNames[level] || level}:**\n`
    practices.forEach((practice) => {
      description += `• ${practice.title} (${practice.frequency})\n`
    })
    description += `\n`
  })

  description += `Практики выполняются регулярно с ведением дневника наблюдений.\n\n`

  return description.trim()
}

/**
 * Генерация ожидаемых результатов
 */
function generateExpectedResults(analysis: IntegrationAnalysis, _profiles: ClientProfiles): string {
  let description = `После прохождения всех этапов плана трансформации ожидаются следующие результаты:\n\n`

  description += `**Внутренние изменения:**\n`
  description += `• Осознанность - глубокое понимание себя на всех уровнях\n`
  description += `• Целостность - внутренняя и внешняя гармония\n`
  description += `• Энергия - раскрытие жизненной силы\n`
  description += `• Любовь к себе - принятие себя на всех уровнях\n\n`

  description += `**Внешние проявления:**\n`
  description += `• Самовыражение - аутентичность в проявлении\n`
  description += `• Реализация - воплощение в деньгах, отношениях, деле\n`
  description += `• Улучшение качества жизни во всех сферах\n\n`

  // Специфичные результаты на основе областей роста
  if (analysis.growthAreas.length > 0) {
    description += `**Конкретно для вас:**\n`
    analysis.growthAreas.slice(0, 3).forEach((area) => {
      description += `• Улучшение в области: ${area}\n`
    })
    description += `\n`
  }

  return description.trim()
}

/**
 * Генерация рекомендуемых практик на основе анализа
 */
function generateRecommendedPractices(
  analysis: IntegrationAnalysis,
  profiles: ClientProfiles
): GeneratedPlan['recommendedPractices'] {
  const practices: GeneratedPlan['recommendedPractices'] = []

  // Практики для нижних чакр (если заблокированы)
  if (profiles.energy) {
    if ((profiles.energy.rootChakra ?? 0) < 5) {
      practices.push({
        title: 'Заземление через тело',
        description: 'Босиком по земле 15-20 минут, телесные практики (йога, танец), визуализация корней.',
        level: 'energy',
        frequency: 'Ежедневно',
      })
    }

    if ((profiles.energy.sacralChakra ?? 0) < 5) {
      practices.push({
        title: 'Раскрытие творчества',
        description: 'Свободное творчество (рисование, танец, пение), работа с удовольствием и радостью.',
        level: 'energy',
        frequency: '3-4 раза в неделю',
      })
    }

    if ((profiles.energy.solarPlexusChakra ?? 0) < 5) {
      practices.push({
        title: 'Укрепление личной силы',
        description: 'Практика границ, работа с "нет", силовые физические упражнения, визуализация личной силы.',
        level: 'energy',
        frequency: 'Ежедневно',
      })
    }

    if ((profiles.energy.throatChakra ?? 0) < 5) {
      practices.push({
        title: 'Развитие самовыражения',
        description: 'Голосовые практики (пение, мантры), говорение правды, ведение блога или дневника.',
        level: 'energy',
        frequency: '3-4 раза в неделю',
      })
    }
  }

  // Практики для тела (если есть зажимы)
  if (profiles.body) {
    practices.push({
      title: 'Телесная терапия',
      description: 'Работа с зажимами через массаж, остеопатию, телесно-ориентированную терапию.',
      level: 'body',
      frequency: '1-2 раза в неделю',
    })

    if (profiles.body.breathingPatterns?.toLowerCase().includes('поверхност')) {
      practices.push({
        title: 'Дыхательные практики',
        description: 'Полное йоговское дыхание, холотропное дыхание, осознанное дыхание в течение дня.',
        level: 'body',
        frequency: 'Ежедневно',
      })
    }
  }

  // Практики для стиля (если низкая аутентичность)
  if (profiles.style && (profiles.style.authenticityLevel ?? 0) < 5) {
    practices.push({
      title: 'Развитие аутентичности',
      description: 'Эксперименты с образами, работа с самопринятием, практика "Я разрешаю себе быть собой".',
      level: 'style',
      frequency: 'Ежедневно',
    })
  }

  // Общие практики
  practices.push({
    title: 'Ведение дневника трансформации',
    description: 'Записывать наблюдения, инсайты, изменения. Отслеживать прогресс на всех уровнях.',
    level: 'overall',
    frequency: 'Ежедневно',
  })

  practices.push({
    title: 'Медитация осознанности',
    description: '15-20 минут ежедневной медитации для развития осознанности и присутствия в моменте.',
    level: 'overall',
    frequency: 'Ежедневно',
  })

  return practices
}

/**
 * ОСНОВНАЯ ФУНКЦИЯ: Генерация плана трансформации
 *
 * @param profiles - Профили клиента по всем 5 уровням
 * @param analysis - Результат анализа интеграции
 * @returns Полный план трансформации
 */
export function generatePlan(profiles: ClientProfiles, analysis: IntegrationAnalysis): GeneratedPlan {
  // Определяем текущий этап (начинаем с интеграции, если диагностика завершена)
  const profilesCount = Object.values(profiles).filter((p) => p !== null && p !== undefined).length

  let currentStage: TransformationStage = 'DIAGNOSTICS'
  if (profilesCount >= 3) {
    currentStage = 'INTEGRATION' // Достаточно профилей для интеграции
  }

  // Генерируем описания этапов
  const diagnosticsDescription = generateDiagnosticsDescription(profiles)
  const integrationDescription = generateIntegrationDescription(analysis, profiles)
  const strategyDescription = generateStrategyDescription(analysis, profiles)

  // Генерируем рекомендуемые практики
  const recommendedPractices = generateRecommendedPractices(analysis, profiles)

  const practiceDescription = generatePracticeDescription(recommendedPractices)
  const expectedResults = generateExpectedResults(analysis, profiles)

  // Ключевые точки
  const keyPoints: string[] = [
    ...analysis.intersections
      .filter((i) => i.priority === 'high')
      .slice(0, 3)
      .map((i) => i.theme),
    ...analysis.patterns.slice(0, 2).map((p) => p.pattern),
  ]

  // Приоритеты
  const priorities = analysis.growthAreas.slice(0, 5)

  // Оценка длительности (недели)
  // Базово: 12 недель (3 месяца)
  // +4 недели за каждый блокированный уровень высокого приоритета
  const highPriorityCount = analysis.intersections.filter((i) => i.priority === 'high').length
  const estimatedDuration = 12 + highPriorityCount * 4

  return {
    currentStage,
    diagnosticsDescription,
    integrationDescription,
    strategyDescription,
    practiceDescription,
    expectedResults,
    keyPoints,
    priorities,
    estimatedDuration,
    recommendedPractices,
  }
}

/**
 * Форматировать план для отображения
 */
export function formatPlanSummary(plan: GeneratedPlan): string {
  return `
ПЛАН ТРАНСФОРМАЦИИ

Текущий этап: ${plan.currentStage}
Ожидаемая длительность: ${plan.estimatedDuration} недель

КЛЮЧЕВЫЕ ТОЧКИ:
${plan.keyPoints.map((p) => `• ${p}`).join('\n')}

ПРИОРИТЕТЫ:
${plan.priorities.map((p, idx) => `${idx + 1}. ${p}`).join('\n')}

РЕКОМЕНДУЕМЫЕ ПРАКТИКИ: ${plan.recommendedPractices.length}
  `.trim()
}
