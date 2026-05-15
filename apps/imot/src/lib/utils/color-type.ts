/**
 * Утилиты для определения цветотипа внешности
 *
 * Цветотип - это характеристика внешности человека, основанная на
 * естественной палитре цветов кожи, волос и глаз.
 *
 * Используется 4 основных цветотипа по теории сезонов:
 * - SPRING (Весна) - теплый светлый
 * - SUMMER (Лето) - холодный светлый
 * - AUTUMN (Осень) - теплый темный
 * - WINTER (Зима) - холодный темный
 */

import type { ColorType } from '@/generated/prisma'

/**
 * Характеристики внешности для определения цветотипа
 */
export interface ColorAnalysisInput {
  // Тон кожи
  skinTone: 'very-light' | 'light' | 'medium' | 'olive' | 'dark' | 'very-dark'
  skinUndertone: 'warm' | 'cool' | 'neutral' // Подтон (теплый/холодный)

  // Цвет волос
  hairColor: 'platinum-blonde' | 'blonde' | 'light-brown' | 'brown' | 'dark-brown' | 'black' | 'red' | 'auburn'

  // Цвет глаз
  eyeColor: 'blue' | 'light-blue' | 'green' | 'hazel' | 'light-brown' | 'brown' | 'dark-brown' | 'grey'

  // Контрастность (разница между цветом кожи, волос и глаз)
  contrast: 'low' | 'medium' | 'high'

  // Как кожа реагирует на солнце
  sunReaction?: 'burns-easily' | 'tans-slowly' | 'tans-easily' | 'rarely-burns'
}

/**
 * Результат анализа цветотипа
 */
export interface ColorAnalysisResult {
  colorType: ColorType
  confidence: number // Уверенность в результате (0-100)
  description: string
  characteristics: string[]
  recommendedColors: string[]
  avoidColors: string[]
  celebrityExamples: string[]
}

/**
 * Определить теплоту/холодность на основе характеристик
 */
function determineTemperature(input: ColorAnalysisInput): 'warm' | 'cool' {
  let warmPoints = 0
  let coolPoints = 0

  // Подтон кожи - главный фактор
  if (input.skinUndertone === 'warm') {
    warmPoints += 3
  }
  if (input.skinUndertone === 'cool') {
    coolPoints += 3
  }

  // Цвет волос
  const warmHairColors = ['red', 'auburn', 'blonde']
  const coolHairColors = ['platinum-blonde', 'black', 'dark-brown']

  if (warmHairColors.includes(input.hairColor)) {
    warmPoints += 2
  }
  if (coolHairColors.includes(input.hairColor)) {
    coolPoints += 2
  }

  // Цвет глаз
  const warmEyeColors = ['hazel', 'light-brown', 'green']
  const coolEyeColors = ['blue', 'light-blue', 'grey', 'dark-brown']

  if (warmEyeColors.includes(input.eyeColor)) {
    warmPoints += 1
  }
  if (coolEyeColors.includes(input.eyeColor)) {
    coolPoints += 1
  }

  // Реакция на солнце
  if (input.sunReaction === 'tans-easily' || input.sunReaction === 'rarely-burns') {
    warmPoints += 1
  }
  if (input.sunReaction === 'burns-easily') {
    coolPoints += 1
  }

  return warmPoints >= coolPoints ? 'warm' : 'cool'
}

/**
 * Определить светлоту/темноту на основе характеристик
 */
function determineValue(input: ColorAnalysisInput): 'light' | 'dark' {
  let lightPoints = 0
  let darkPoints = 0

  // Тон кожи
  const lightSkinTones = ['very-light', 'light']
  const darkSkinTones = ['dark', 'very-dark', 'olive']

  if (lightSkinTones.includes(input.skinTone)) {
    lightPoints += 3
  }
  if (darkSkinTones.includes(input.skinTone)) {
    darkPoints += 3
  }
  if (input.skinTone === 'medium') {
    // Средний тон - смотрим на другие факторы
    lightPoints += 1
    darkPoints += 1
  }

  // Цвет волос
  const lightHairColors = ['platinum-blonde', 'blonde', 'light-brown']
  const darkHairColors = ['dark-brown', 'black']

  if (lightHairColors.includes(input.hairColor)) {
    lightPoints += 2
  }
  if (darkHairColors.includes(input.hairColor)) {
    darkPoints += 2
  }

  // Контрастность
  if (input.contrast === 'low') {
    lightPoints += 1
  }
  if (input.contrast === 'high') {
    darkPoints += 1
  }

  return lightPoints >= darkPoints ? 'light' : 'dark'
}

/**
 * ОСНОВНАЯ ФУНКЦИЯ: Определение цветотипа на основе характеристик внешности
 *
 * @param input - Характеристики внешности
 * @returns Результат анализа с рекомендациями
 */
export function calculateColorType(input: ColorAnalysisInput): ColorAnalysisResult {
  const temperature = determineTemperature(input)
  const value = determineValue(input)

  // Определяем цветотип на основе температуры и светлоты
  let colorType: ColorType

  if (temperature === 'warm' && value === 'light') {
    colorType = 'SPRING'
  } else if (temperature === 'cool' && value === 'light') {
    colorType = 'SUMMER'
  } else if (temperature === 'warm' && value === 'dark') {
    colorType = 'AUTUMN'
  } else {
    // cool && dark
    colorType = 'WINTER'
  }

  // Вычисляем уверенность в результате
  const confidence = calculateConfidence(input, colorType)

  // Получаем детальную информацию о цветотипе
  const details = getColorTypeDetails(colorType)

  return {
    colorType,
    confidence,
    ...details,
  }
}

/**
 * Вычислить уверенность в определении цветотипа (0-100)
 */
function calculateConfidence(input: ColorAnalysisInput, _colorType: ColorType): number {
  let confidence = 70 // Базовая уверенность

  // Увеличиваем уверенность, если характеристики явно указывают на цветотип
  if (input.skinUndertone !== 'neutral') {
    confidence += 10
  }
  if (input.contrast !== 'medium') {
    confidence += 10
  }
  if (input.sunReaction) {
    confidence += 10
  }

  return Math.min(confidence, 100)
}

/**
 * Получить детальное описание цветотипа
 */
function getColorTypeDetails(colorType: ColorType): {
  description: string
  characteristics: string[]
  recommendedColors: string[]
  avoidColors: string[]
  celebrityExamples: string[]
} {
  const details = {
    SPRING: {
      description: 'Теплый светлый цветотип. Яркая, свежая внешность с золотистыми оттенками.',
      characteristics: [
        'Теплый золотистый или персиковый оттенок кожи',
        'Светлые волосы с золотистым отливом (блонд, русый, светло-каштановый)',
        'Светлые глаза (голубые, зеленые, светло-карие)',
        'Невысокая контрастность между цветом кожи, волос и глаз',
        'Легко загорает, кожа приобретает золотистый оттенок',
      ],
      recommendedColors: [
        'Теплые яркие оттенки: коралловый, персиковый, абрикосовый',
        'Теплые желтые и золотистые тона',
        'Светлые теплые зеленые: салатовый, яблочный',
        'Теплые голубые: бирюзовый, аквамарин',
        'Кремовый, светло-бежевый, карамельный',
      ],
      avoidColors: [
        'Холодные темные цвета (черный, темно-синий)',
        'Холодные розовые и фиолетовые',
        'Серые и пепельные оттенки',
      ],
      celebrityExamples: ['Блейк Лайвли', 'Николь Кидман', 'Скарлетт Йоханссон', 'Гвинет Пэлтроу'],
    },
    SUMMER: {
      description: 'Холодный светлый цветотип. Нежная, мягкая внешность с холодными оттенками.',
      characteristics: [
        'Холодный розоватый или фарфоровый оттенок кожи',
        'Светлые волосы с пепельным отливом (пепельный блонд, русый)',
        'Светлые холодные глаза (серо-голубые, серые, серо-зеленые)',
        'Низкая или средняя контрастность',
        'Кожа чувствительна к солнцу, легко обгорает',
      ],
      recommendedColors: [
        'Холодные пастельные оттенки: лавандовый, сиреневый, мятный',
        'Холодные розовые и малиновые',
        'Холодные голубые и синие',
        'Серые, серо-голубые, серо-зеленые',
        'Жемчужные, серебристые оттенки',
      ],
      avoidColors: [
        'Теплые яркие цвета (оранжевый, коралловый)',
        'Теплые желтые и золотистые',
        'Черный (слишком резкий)',
      ],
      celebrityExamples: ['Риз Уизерспун', 'Наоми Уоттс', 'Дженнифер Энистон', 'Кэмерон Диаз'],
    },
    AUTUMN: {
      description: 'Теплый темный цветотип. Глубокая, насыщенная внешность с золотыми оттенками.',
      characteristics: [
        'Теплый золотистый или оливковый оттенок кожи',
        'Темные волосы с рыжим или золотистым отливом (каштановый, рыжий, темно-русый)',
        'Теплые глаза (карие, янтарные, зеленые)',
        'Средняя или высокая контрастность',
        'Хорошо загорает, приобретает золотистый загар',
      ],
      recommendedColors: [
        'Теплые земляные оттенки: терракотовый, кирпичный, охра',
        'Теплые зеленые: хаки, оливковый, болотный',
        'Теплые коричневые: шоколад, каштан, верблюжий',
        'Теплые оранжевые и рыжие',
        'Золотистые и бронзовые оттенки',
      ],
      avoidColors: [
        'Холодные яркие цвета (ярко-розовый, неоновый)',
        'Пастельные холодные оттенки',
        'Черный (предпочтителен темно-коричневый)',
      ],
      celebrityExamples: ['Джулия Робертс', 'Анджелина Джоли', 'Дженнифер Лопес', 'Джессика Альба'],
    },
    WINTER: {
      description: 'Холодный темный цветотип. Контрастная, яркая внешность с холодными оттенками.',
      characteristics: [
        'Холодный фарфоровый или оливковый оттенок кожи',
        'Темные волосы с холодным отливом (черный, темно-каштановый)',
        'Контрастные холодные глаза (темно-карие, серые, ярко-голубые)',
        'Высокая контрастность между цветом кожи, волос и глаз',
        'Кожа может быть как очень светлой, так и смуглой',
      ],
      recommendedColors: [
        'Холодные яркие цвета: фуксия, изумрудный, ультрамарин',
        'Черный, белый, серебристый',
        'Холодные насыщенные: сапфировый, винный, пурпурный',
        'Холодные красные: малиновый, алый',
        'Ледяные пастельные оттенки',
      ],
      avoidColors: ['Теплые оранжевые и персиковые', 'Теплые коричневые и бежевые', 'Приглушенные земляные оттенки'],
      celebrityExamples: ['Меган Фокс', 'Моника Беллуччи', 'Энн Хэтэуэй', 'Сандра Баллок'],
    },
  }

  return details[colorType]
}

/**
 * Получить рекомендации по макияжу для цветотипа
 */
export function getMakeupRecommendations(colorType: ColorType): {
  foundation: string
  lips: string
  eyes: string
  cheeks: string
} {
  const recommendations = {
    SPRING: {
      foundation: 'Теплые бежевые и персиковые оттенки с золотистым подтоном',
      lips: 'Коралловые, персиковые, теплые розовые помады',
      eyes: 'Золотистые, бронзовые, теплые коричневые тени',
      cheeks: 'Персиковые, абрикосовые румяна',
    },
    SUMMER: {
      foundation: 'Холодные розоватые и фарфоровые оттенки',
      lips: 'Холодные розовые, ягодные, сливовые помады',
      eyes: 'Серые, серо-голубые, холодные фиолетовые тени',
      cheeks: 'Холодные розовые, сиреневые румяна',
    },
    AUTUMN: {
      foundation: 'Теплые золотистые, оливковые оттенки',
      lips: 'Терракотовые, кирпичные, бронзовые помады',
      eyes: 'Бронзовые, медные, теплые зеленые тени',
      cheeks: 'Терракотовые, коралловые румяна',
    },
    WINTER: {
      foundation: 'Холодные фарфоровые или оливковые оттенки',
      lips: 'Яркие холодные красные, винные, фуксия помады',
      eyes: 'Черные, серебристые, холодные синие тени',
      cheeks: 'Холодные розовые, малиновые румяна',
    },
  }

  return recommendations[colorType]
}

/**
 * Создать упрощенный опросник для быстрого определения цветотипа
 * Возвращает набор вопросов с вариантами ответов
 */
export function getColorTypeQuestionnaire(): Array<{
  question: string
  options: Array<{ label: string; value: string }>
}> {
  return [
    {
      question: 'Какой у вас натуральный цвет волос?',
      options: [
        { label: 'Платиновый блонд', value: 'platinum-blonde' },
        { label: 'Золотистый блонд', value: 'blonde' },
        { label: 'Светло-каштановый', value: 'light-brown' },
        { label: 'Каштановый', value: 'brown' },
        { label: 'Темно-каштановый', value: 'dark-brown' },
        { label: 'Черный', value: 'black' },
        { label: 'Рыжий', value: 'red' },
      ],
    },
    {
      question: 'Какой цвет украшений вам больше идет?',
      options: [
        { label: 'Золото (теплое)', value: 'warm' },
        { label: 'Серебро (холодное)', value: 'cool' },
        { label: 'Оба одинаково', value: 'neutral' },
      ],
    },
    {
      question: 'Как ваша кожа реагирует на солнце?',
      options: [
        { label: 'Быстро обгорает, не загорает', value: 'burns-easily' },
        { label: 'Загорает медленно, может обгореть', value: 'tans-slowly' },
        { label: 'Легко загорает', value: 'tans-easily' },
        { label: 'Почти не обгорает', value: 'rarely-burns' },
      ],
    },
  ]
}
