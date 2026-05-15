/**
 * Утилиты для расчета нумерологической матрицы судьбы
 *
 * Матрица судьбы - это система расчетов на основе даты рождения,
 * которая помогает раскрыть таланты, предназначение и жизненные циклы человека.
 *
 * В матрице используются числа от 1 до 22 (энергии Арканов Таро).
 */

/**
 * Интерфейс результата расчета матрицы судьбы
 */
export interface NumerologyMatrix {
  // Основные числа личности
  birthDay: number // День рождения
  birthMonth: number // Месяц рождения
  birthYear: number // Год рождения

  // Ключевые числа матрицы (1-22)
  personalNumber: number // Личное число (сумма дня)
  destinyNumber: number // Число судьбы (сумма всей даты)
  soulNumber: number // Число души (месяц + год)

  // Дополнительные энергии
  talentZone: number[] // Зона талантов (3 числа)
  karmaZone: number[] // Зона кармических уроков (2 числа)

  // Жизненные циклы (периоды по 7 лет)
  lifeCycles: Array<{
    period: string // Возрастной период (например, "0-7 лет")
    energy: number // Энергия периода (1-22)
  }>

  // Расчетная матрица (JSON с полной структурой)
  fullMatrix: {
    base: { day: number; month: number; year: number }
    main: { personal: number; destiny: number; soul: number }
    zones: { talent: number[]; karma: number[] }
    cycles: Array<{ period: string; energy: number }>
  }
}

/**
 * Приводит число к диапазону 1-22 методом нумерологического сложения
 */
function reduceToArcana(num: number): number {
  // Если число уже в диапазоне 1-22, возвращаем как есть
  if (num >= 1 && num <= 22) {
    return num
  }

  // Если число больше 22, складываем цифры
  if (num > 22) {
    const sum = String(num)
      .split('')
      .reduce((acc, digit) => acc + parseInt(digit, 10), 0)

    // Рекурсивно приводим к диапазону 1-22
    return reduceToArcana(sum)
  }

  // Если число меньше 1 (не должно быть), возвращаем 1
  return 1
}

/**
 * Расчет основных чисел из даты рождения
 */
function calculateBaseNumbers(date: Date): {
  day: number
  month: number
  year: number
  daySum: number
  monthSum: number
  yearSum: number
  fullSum: number
} {
  const day = date.getDate()
  const month = date.getMonth() + 1 // 0-indexed
  const year = date.getFullYear()

  // Суммы цифр
  const daySum = reduceToArcana(day)
  const monthSum = reduceToArcana(month)
  const yearSum = reduceToArcana(
    String(year)
      .split('')
      .reduce((acc, digit) => acc + parseInt(digit, 10), 0)
  )

  // Полная сумма всей даты
  const fullSum = reduceToArcana(daySum + monthSum + yearSum)

  return { day, month, year, daySum, monthSum, yearSum, fullSum }
}

/**
 * Расчет зоны талантов (3 ключевых числа)
 */
function calculateTalentZone(personalNumber: number, destinyNumber: number, soulNumber: number): number[] {
  // Зона талантов - комбинация основных чисел
  const talent1 = reduceToArcana(personalNumber + destinyNumber)
  const talent2 = reduceToArcana(destinyNumber + soulNumber)
  const talent3 = reduceToArcana(personalNumber + soulNumber)

  return [talent1, talent2, talent3]
}

/**
 * Расчет кармических уроков
 */
function calculateKarmaZone(destinyNumber: number, soulNumber: number): number[] {
  // Кармические уроки - числа, которые нужно проработать
  const karma1 = reduceToArcana(Math.abs(destinyNumber - soulNumber))
  const karma2 = reduceToArcana(destinyNumber + soulNumber + karma1)

  return [karma1, karma2]
}

/**
 * Расчет жизненных циклов (по 7 лет)
 */
function calculateLifeCycles(
  personalNumber: number,
  destinyNumber: number,
  soulNumber: number
): Array<{ period: string; energy: number }> {
  const cycles = []
  const baseEnergies = [personalNumber, destinyNumber, soulNumber]

  for (let i = 0; i < 12; i++) {
    // 12 циклов по 7 лет = 84 года
    const startAge = i * 7
    const endAge = (i + 1) * 7
    const energy = reduceToArcana(baseEnergies[i % 3] + i)

    cycles.push({
      period: `${startAge}-${endAge} лет`,
      energy,
    })
  }

  return cycles
}

/**
 * ОСНОВНАЯ ФУНКЦИЯ: Расчет полной матрицы судьбы по дате рождения
 *
 * @param birthdate - Дата рождения (Date или ISO string)
 * @returns Полная нумерологическая матрица
 */
export function calculateNumerology(birthdate: Date | string): NumerologyMatrix {
  // Преобразуем в Date, если это строка
  const date = typeof birthdate === 'string' ? new Date(birthdate) : birthdate

  // Проверка валидности даты
  if (isNaN(date.getTime())) {
    throw new Error('Некорректная дата рождения')
  }

  // Проверка разумного диапазона дат (1900-2100)
  const year = date.getFullYear()
  if (year < 1900 || year > 2100) {
    throw new Error('Дата рождения должна быть между 1900 и 2100 годами')
  }

  // Расчет базовых чисел
  const base = calculateBaseNumbers(date)

  // Ключевые числа матрицы
  const personalNumber = base.daySum // Личное число
  const destinyNumber = base.fullSum // Число судьбы
  const soulNumber = reduceToArcana(base.monthSum + base.yearSum) // Число души

  // Зоны матрицы
  const talentZone = calculateTalentZone(personalNumber, destinyNumber, soulNumber)
  const karmaZone = calculateKarmaZone(destinyNumber, soulNumber)

  // Жизненные циклы
  const lifeCycles = calculateLifeCycles(personalNumber, destinyNumber, soulNumber)

  // Полная матрица (для JSON поля в БД)
  const fullMatrix = {
    base: {
      day: base.day,
      month: base.month,
      year: base.year,
    },
    main: {
      personal: personalNumber,
      destiny: destinyNumber,
      soul: soulNumber,
    },
    zones: {
      talent: talentZone,
      karma: karmaZone,
    },
    cycles: lifeCycles.map((c) => ({ period: c.period, energy: c.energy })),
  }

  return {
    birthDay: base.day,
    birthMonth: base.month,
    birthYear: base.year,
    personalNumber,
    destinyNumber,
    soulNumber,
    talentZone,
    karmaZone,
    lifeCycles,
    fullMatrix,
  }
}

/**
 * Получить интерпретацию числа (Аркана)
 * Возвращает краткое описание энергии числа от 1 до 22
 */
export function getArcanaInterpretation(arcana: number): string {
  const interpretations: Record<number, string> = {
    1: 'Маг - Воля, действие, начало',
    2: 'Верховная Жрица - Интуиция, тайна, мудрость',
    3: 'Императрица - Творчество, изобилие, материнство',
    4: 'Император - Структура, власть, стабильность',
    5: 'Иерофант - Традиции, обучение, духовность',
    6: 'Влюбленные - Выбор, любовь, гармония',
    7: 'Колесница - Движение, победа, контроль',
    8: 'Сила - Мужество, энергия, страсть',
    9: 'Отшельник - Мудрость, одиночество, поиск',
    10: 'Колесо Фортуны - Судьба, цикличность, удача',
    11: 'Справедливость - Баланс, закон, истина',
    12: 'Повешенный - Жертвенность, ожидание, новый взгляд',
    13: 'Смерть - Трансформация, конец, новое начало',
    14: 'Умеренность - Баланс, терпение, синтез',
    15: 'Дьявол - Искушение, зависимость, материальное',
    16: 'Башня - Разрушение, откровение, освобождение',
    17: 'Звезда - Надежда, вдохновение, духовность',
    18: 'Луна - Иллюзии, подсознание, страхи',
    19: 'Солнце - Радость, успех, ясность',
    20: 'Суд - Возрождение, призвание, пробуждение',
    21: 'Мир - Завершение, целостность, гармония',
    22: 'Шут - Спонтанность, начало пути, свобода',
  }

  return interpretations[arcana] || `Аркан ${arcana}`
}

/**
 * Форматировать матрицу для отображения
 * Возвращает человекочитаемую строку с описанием матрицы
 */
export function formatMatrixDescription(matrix: NumerologyMatrix): string {
  return `
МАТРИЦА СУДЬБЫ

Дата рождения: ${matrix.birthDay}.${matrix.birthMonth}.${matrix.birthYear}

Основные числа:
- Личное число: ${matrix.personalNumber} (${getArcanaInterpretation(matrix.personalNumber)})
- Число судьбы: ${matrix.destinyNumber} (${getArcanaInterpretation(matrix.destinyNumber)})
- Число души: ${matrix.soulNumber} (${getArcanaInterpretation(matrix.soulNumber)})

Зона талантов: ${matrix.talentZone.join(', ')}
Кармические уроки: ${matrix.karmaZone.join(', ')}

Жизненные циклы:
${matrix.lifeCycles
  .slice(0, 3)
  .map((c) => `  ${c.period}: Энергия ${c.energy}`)
  .join('\n')}
  `.trim()
}

/**
 * Интерфейс данных нумерологического профиля для БД
 */
export interface NumerologyProfileData {
  lifePathNumber: number
  destinyNumber: number
  soulNumber: number
  personalityNumber: number
  maturityNumber: number
  currentCycle: string
  cycleDescription: string
  talents: string
  gifts: string
  purpose: string
  karmicLessons: string
  karmicDebts: string
  matrixData: string
  notes: string
}

/**
 * Генерация данных нумерологического профиля из даты рождения
 * для автоматического заполнения профиля клиента
 *
 * @param birthdate - Дата рождения
 * @returns Объект с данными для создания NumerologyProfile
 */
export function generateNumerologyProfileData(birthdate: Date | string): NumerologyProfileData {
  // Расчет матрицы
  const matrix = calculateNumerology(birthdate)

  // Определяем текущий возраст для определения жизненного цикла
  const today = new Date()
  const birth = typeof birthdate === 'string' ? new Date(birthdate) : birthdate
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  // Защита от отрицательного возраста
  if (age < 0) {
    age = 0
  }

  // Находим текущий жизненный цикл
  const currentCycleIndex = Math.max(0, Math.min(Math.floor(age / 7), matrix.lifeCycles.length - 1))
  const currentCycle =
    matrix.lifeCycles && matrix.lifeCycles.length > 0 && matrix.lifeCycles[currentCycleIndex]
      ? matrix.lifeCycles[currentCycleIndex]
      : { period: '0-7 лет', energy: matrix.personalNumber }

  // Формируем описание текущего цикла
  const cycleDescription = currentCycle
    ? `Энергия ${currentCycle.energy}: ${getArcanaInterpretation(currentCycle.energy)}`
    : 'Не определен'

  // Формируем описание талантов
  const talents = matrix.talentZone.map((t) => `${t} - ${getArcanaInterpretation(t)}`).join(', ')

  // Формируем описание даров (используем ключевые числа)
  const gifts = [
    `Личное (${matrix.personalNumber}): ${getArcanaInterpretation(matrix.personalNumber)}`,
    `Судьбы (${matrix.destinyNumber}): ${getArcanaInterpretation(matrix.destinyNumber)}`,
    `Души (${matrix.soulNumber}): ${getArcanaInterpretation(matrix.soulNumber)}`,
  ].join(', ')

  // Формируем описание предназначения
  const purpose = `Основное предназначение связано с энергией ${matrix.destinyNumber} - ${getArcanaInterpretation(
    matrix.destinyNumber
  )}`

  // Формируем описание кармических уроков
  const karmicLessons = matrix.karmaZone.map((k) => `${k} - ${getArcanaInterpretation(k)}`).join(', ')

  // Проверяем наличие кармических долгов (числа 13, 14, 16, 19)
  const karmicDebtNumbers = [13, 14, 16, 19]
  const foundKarmicDebts = [
    matrix.personalNumber,
    matrix.destinyNumber,
    matrix.soulNumber,
    ...matrix.talentZone,
  ].filter((n) => karmicDebtNumbers.includes(n))

  const karmicDebts =
    foundKarmicDebts.length > 0
      ? foundKarmicDebts.map((d) => `${d} - ${getArcanaInterpretation(d)}`).join(', ')
      : 'Кармические долги отсутствуют'

  // Полная матрица в JSON
  const matrixData = JSON.stringify(matrix.fullMatrix, null, 2)

  // Автоматически сгенерированная заметка
  const notes = `Автоматически сгенерировано из даты рождения: ${birth.toLocaleDateString('ru-RU')}`

  return {
    lifePathNumber: matrix.personalNumber, // Число жизненного пути = личное число
    destinyNumber: matrix.destinyNumber,
    soulNumber: matrix.soulNumber,
    personalityNumber: matrix.personalNumber,
    maturityNumber: reduceToArcana(matrix.personalNumber + matrix.destinyNumber), // Число зрелости
    currentCycle: currentCycle.period,
    cycleDescription,
    talents,
    gifts,
    purpose,
    karmicLessons,
    karmicDebts,
    matrixData,
    notes,
  }
}
