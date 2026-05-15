/**
 * Рендерер шаблонов договоров с подстановкой плейсхолдеров
 *
 * Использует Handlebars-синтаксис: {{student.fullName}}, {{#if student.isMinor}}...{{/if}}
 */

import Handlebars from 'handlebars'
import type { PlaceholderInfo, RenderResult, TemplateData } from './types'

/**
 * Регистрация кастомных хелперов Handlebars
 */
function registerHelpers() {
  // Форматирование даты
  Handlebars.registerHelper('formatDate', (date: string | Date) => {
    if (!date) {
      return ''
    }
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  })

  // Форматирование денежной суммы
  Handlebars.registerHelper('formatMoney', (amount: number) => {
    if (!amount) {
      return '0'
    }
    return new Intl.NumberFormat('ru-RU').format(amount)
  })

  // Сравнение значений
  Handlebars.registerHelper('eq', (a, b) => a === b)
  Handlebars.registerHelper('ne', (a, b) => a !== b)
  Handlebars.registerHelper('gt', (a, b) => a > b)
  Handlebars.registerHelper('lt', (a, b) => a < b)
}

// Регистрируем хелперы при загрузке модуля
registerHelpers()

/**
 * Извлекает все плейсхолдеры из шаблона
 */
export function extractPlaceholders(template: string): string[] {
  const placeholders: string[] = []

  // Простые плейсхолдеры: {{student.fullName}}
  const simpleRegex = /\{\{([^#/][^}]+)\}\}/g
  let match: RegExpExecArray | null

  while ((match = simpleRegex.exec(template)) !== null) {
    const placeholder = match[1].trim()
    // Исключаем хелперы (formatDate, formatMoney, eq и т.д.)
    if (!placeholder.includes(' ') && !placeholders.includes(placeholder)) {
      placeholders.push(placeholder)
    }
  }

  return placeholders
}

/**
 * Получает значение по пути из объекта
 * Например: getValueByPath(data, 'student.passport.series')
 */
function getValueByPath(obj: unknown, path: string): unknown {
  const keys = path.split('.')
  let current = obj as Record<string, unknown>

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = current[key] as Record<string, unknown>
  }

  return current
}

/**
 * Проверяет наличие всех необходимых данных для шаблона
 */
export function validateTemplateData(template: string, data: TemplateData): { valid: boolean; missing: string[] } {
  const placeholders = extractPlaceholders(template)
  const missing: string[] = []

  for (const placeholder of placeholders) {
    const value = getValueByPath(data, placeholder)
    if (value === undefined || value === null || value === '') {
      missing.push(placeholder)
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  }
}

/**
 * Рендерит шаблон договора с подстановкой данных
 *
 * @param template - HTML шаблон с плейсхолдерами {{student.fullName}}
 * @param data - Данные для подстановки
 * @returns Результат рендеринга с HTML и информацией о плейсхолдерах
 *
 * @example
 * ```typescript
 * const result = renderTemplate(
 *   '<p>Ученик: {{student.fullName}}</p>',
 *   { student: { fullName: 'Иванов Иван Иванович', ... }, ... }
 * )
 * console.log(result.html) // '<p>Ученик: Иванов Иван Иванович</p>'
 * ```
 */
export function renderTemplate(template: string, data: TemplateData): RenderResult {
  // Извлекаем все плейсхолдеры из шаблона
  const allPlaceholders = extractPlaceholders(template)

  // Проверяем какие данные отсутствуют
  const { missing } = validateTemplateData(template, data)

  // Компилируем и рендерим шаблон
  const compiledTemplate = Handlebars.compile(template, {
    noEscape: true, // Не экранировать HTML
    strict: false, // Не выбрасывать ошибку при отсутствии данных
  })

  const html = compiledTemplate(data)

  // Определяем использованные плейсхолдеры (все минус отсутствующие)
  const usedPlaceholders = allPlaceholders.filter((p) => !missing.includes(p))

  return {
    html,
    usedPlaceholders,
    missingPlaceholders: missing,
  }
}

/**
 * Справочник всех доступных плейсхолдеров
 */
export const PLACEHOLDERS: PlaceholderInfo[] = [
  // === Ученик ===
  {
    key: 'student.fullName',
    label: 'ФИО ученика',
    description: 'Полное ФИО ученика',
    group: 'student',
    example: 'Иванов Иван Иванович',
    required: true,
  },
  {
    key: 'student.lastName',
    label: 'Фамилия',
    description: 'Фамилия ученика',
    group: 'student',
    example: 'Иванов',
    required: true,
  },
  {
    key: 'student.firstName',
    label: 'Имя',
    description: 'Имя ученика',
    group: 'student',
    example: 'Иван',
    required: true,
  },
  {
    key: 'student.middleName',
    label: 'Отчество',
    description: 'Отчество ученика',
    group: 'student',
    example: 'Иванович',
    required: false,
  },
  {
    key: 'student.birthdate',
    label: 'Дата рождения',
    description: 'Дата рождения ученика',
    group: 'student',
    example: '01.01.2000',
    required: true,
  },
  {
    key: 'student.age',
    label: 'Возраст',
    description: 'Полных лет',
    group: 'student',
    example: '24',
    required: false,
  },
  {
    key: 'student.phone',
    label: 'Телефон',
    description: 'Номер телефона ученика',
    group: 'student',
    example: '+7 (999) 123-45-67',
    required: false,
  },
  {
    key: 'student.email',
    label: 'Email',
    description: 'Электронная почта ученика',
    group: 'student',
    example: 'ivanov@mail.ru',
    required: false,
  },
  {
    key: 'student.passport.series',
    label: 'Серия паспорта',
    description: 'Серия паспорта (4 цифры)',
    group: 'student',
    example: '45 12',
    required: true,
  },
  {
    key: 'student.passport.number',
    label: 'Номер паспорта',
    description: 'Номер паспорта (6 цифр)',
    group: 'student',
    example: '123456',
    required: true,
  },
  {
    key: 'student.passport.issuedBy',
    label: 'Кем выдан',
    description: 'Орган, выдавший паспорт',
    group: 'student',
    example: 'УФМС России по г. Москве',
    required: true,
  },
  {
    key: 'student.passport.issuedAt',
    label: 'Дата выдачи',
    description: 'Дата выдачи паспорта',
    group: 'student',
    example: '01.01.2020',
    required: true,
  },
  {
    key: 'student.passport.departmentCode',
    label: 'Код подразделения',
    description: 'Код подразделения в паспорте',
    group: 'student',
    example: '770-001',
    required: true,
  },
  {
    key: 'student.registrationAddress',
    label: 'Адрес регистрации',
    description: 'Адрес регистрации (прописка)',
    group: 'student',
    example: 'г. Москва, ул. Примерная, д. 1, кв. 1',
    required: true,
  },
  {
    key: 'student.snils',
    label: 'СНИЛС',
    description: 'Страховой номер индивидуального лицевого счёта',
    group: 'student',
    example: '123-456-789 00',
    required: false,
  },
  {
    key: 'student.isMinor',
    label: 'Несовершеннолетний',
    description: 'Является ли ученик несовершеннолетним',
    group: 'student',
    example: 'true/false',
    required: false,
  },

  // === Законный представитель ===
  {
    key: 'student.representative.fullName',
    label: 'ФИО представителя',
    description: 'ФИО законного представителя',
    group: 'student',
    example: 'Иванова Мария Петровна',
    required: false,
  },
  {
    key: 'student.representative.passport.series',
    label: 'Серия паспорта представителя',
    description: 'Серия паспорта законного представителя',
    group: 'student',
    example: '45 10',
    required: false,
  },

  // === Автошкола ===
  {
    key: 'school.name',
    label: 'Название школы',
    description: 'Краткое название автошколы',
    group: 'school',
    example: 'Автошкола Направа',
    required: true,
  },
  {
    key: 'school.fullName',
    label: 'Полное название',
    description: 'Полное юридическое название',
    group: 'school',
    example: 'ООО «Автошкола Направа»',
    required: true,
  },
  {
    key: 'school.city',
    label: 'Город',
    description: 'Город расположения школы',
    group: 'school',
    example: 'Москва',
    required: false,
  },
  {
    key: 'school.phone',
    label: 'Телефон школы',
    description: 'Контактный телефон школы',
    group: 'school',
    example: '+7 (495) 123-45-67',
    required: false,
  },
  {
    key: 'school.email',
    label: 'Email школы',
    description: 'Электронная почта школы',
    group: 'school',
    example: 'info@driving-school.ru',
    required: false,
  },
  {
    key: 'school.inn',
    label: 'ИНН',
    description: 'Идентификационный номер налогоплательщика',
    group: 'school',
    example: '7707123456',
    required: true,
  },
  {
    key: 'school.ogrn',
    label: 'ОГРН',
    description: 'Основной государственный регистрационный номер',
    group: 'school',
    example: '1027700123456',
    required: true,
  },
  {
    key: 'school.kpp',
    label: 'КПП',
    description: 'Код причины постановки на учёт',
    group: 'school',
    example: '770701001',
    required: true,
  },
  {
    key: 'school.legalAddress',
    label: 'Юридический адрес',
    description: 'Юридический адрес организации',
    group: 'school',
    example: 'г. Москва, ул. Примерная, д. 1',
    required: true,
  },
  {
    key: 'school.actualAddress',
    label: 'Фактический адрес',
    description: 'Фактический адрес организации',
    group: 'school',
    example: 'г. Москва, ул. Примерная, д. 1',
    required: false,
  },
  {
    key: 'school.directorName',
    label: 'ФИО директора',
    description: 'ФИО руководителя организации',
    group: 'school',
    example: 'Иванов Иван Иванович',
    required: true,
  },
  {
    key: 'school.directorPosition',
    label: 'Должность директора',
    description: 'Должность руководителя',
    group: 'school',
    example: 'Генеральный директор',
    required: true,
  },
  {
    key: 'school.basis',
    label: 'Основание',
    description: 'На основании чего действует руководитель',
    group: 'school',
    example: 'Устава',
    required: true,
  },
  {
    key: 'school.licenseNumber',
    label: 'Номер лицензии',
    description: 'Номер лицензии на образовательную деятельность',
    group: 'school',
    example: 'Л035-01234-56/78901234',
    required: true,
  },
  {
    key: 'school.licenseDate',
    label: 'Дата лицензии',
    description: 'Дата выдачи лицензии',
    group: 'school',
    example: '15.01.2020',
    required: false,
  },
  {
    key: 'school.bankName',
    label: 'Название банка',
    description: 'Наименование банка',
    group: 'school',
    example: 'ПАО Сбербанк',
    required: true,
  },
  {
    key: 'school.bankBik',
    label: 'БИК',
    description: 'Банковский идентификационный код',
    group: 'school',
    example: '044525225',
    required: true,
  },
  {
    key: 'school.bankAccount',
    label: 'Расчётный счёт',
    description: 'Номер расчётного счёта',
    group: 'school',
    example: '40702810123456789012',
    required: true,
  },
  {
    key: 'school.corrAccount',
    label: 'Корр. счёт',
    description: 'Корреспондентский счёт',
    group: 'school',
    example: '30101810400000000225',
    required: true,
  },

  // === Договор ===
  {
    key: 'contract.number',
    label: 'Номер договора',
    description: 'Номер договора',
    group: 'contract',
    example: '123/2026',
    required: true,
  },
  {
    key: 'contract.date',
    label: 'Дата договора',
    description: 'Дата заключения договора',
    group: 'contract',
    example: '15 января 2026 г.',
    required: true,
  },
  {
    key: 'contract.category',
    label: 'Категория',
    description: 'Категория прав для обучения',
    group: 'contract',
    example: 'B',
    required: true,
  },
  {
    key: 'contract.price',
    label: 'Стоимость',
    description: 'Стоимость обучения (число)',
    group: 'contract',
    example: '45000',
    required: true,
  },
  {
    key: 'contract.priceWords',
    label: 'Сумма прописью',
    description: 'Стоимость обучения прописью',
    group: 'contract',
    example: 'Сорок пять тысяч',
    required: true,
  },
]

/**
 * Получить плейсхолдеры, сгруппированные по категориям
 */
export function getGroupedPlaceholders(): Record<string, PlaceholderInfo[]> {
  return {
    student: PLACEHOLDERS.filter((p) => p.group === 'student'),
    school: PLACEHOLDERS.filter((p) => p.group === 'school'),
    contract: PLACEHOLDERS.filter((p) => p.group === 'contract'),
  }
}

/**
 * Создаёт тестовые данные для предпросмотра шаблона
 */
export function createTestData(): TemplateData {
  return {
    student: {
      fullName: 'Иванов Иван Иванович',
      lastName: 'Иванов',
      firstName: 'Иван',
      middleName: 'Иванович',
      phone: '+7 (999) 123-45-67',
      email: 'ivanov@mail.ru',
      birthdate: '01.01.2000',
      age: 26,
      passport: {
        series: '45 12',
        number: '123456',
        issuedBy: 'УФМС России по г. Москве',
        issuedAt: '01.01.2020',
        departmentCode: '770-001',
      },
      registrationAddress: 'г. Москва, ул. Примерная, д. 1, кв. 1',
      snils: '123-456-789 00',
      inn: '1234567890',
      isMinor: false,
    },
    school: {
      name: 'Автошкола Направа',
      fullName: 'ООО «Автошкола Направа»',
      city: 'Москва',
      phone: '+7 (495) 123-45-67',
      email: 'info@driving-school.ru',
      inn: '7707123456',
      ogrn: '1027700123456',
      kpp: '770701001',
      legalAddress: 'г. Москва, ул. Примерная, д. 1',
      actualAddress: 'г. Москва, ул. Примерная, д. 1',
      directorName: 'Петров Пётр Петрович',
      directorPosition: 'Генеральный директор',
      basis: 'Устава',
      licenseNumber: 'Л035-01234-56/78901234',
      licenseDate: '15.01.2020',
      bankName: 'ПАО Сбербанк',
      bankBik: '044525225',
      bankAccount: '40702810123456789012',
      corrAccount: '30101810400000000225',
    },
    contract: {
      number: '123/2026',
      date: '15 января 2026 г.',
      category: 'B',
      price: 45000,
      priceWords: 'Сорок пять тысяч',
    },
  }
}
