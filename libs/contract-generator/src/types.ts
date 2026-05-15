/**
 * Типы для генерации договоров автошколы
 */

/**
 * Паспортные данные
 */
export interface PassportData {
  series: string // "45 12"
  number: string // "123456"
  issuedBy: string // "УФМС России по г. Москве"
  issuedAt: string // "01.01.2020"
  departmentCode: string // "770-001"
}

/**
 * Данные законного представителя (для несовершеннолетних)
 */
export interface RepresentativeData {
  fullName: string
  passport: PassportData
  relationship: string // "мать", "отец", "опекун"
}

/**
 * Данные ученика для подстановки в договор
 */
export interface StudentData {
  // ФИО
  fullName: string // "Иванов Иван Иванович"
  lastName: string // "Иванов"
  firstName: string // "Иван"
  middleName: string // "Иванович"

  // Контакты
  phone?: string // "+7 (999) 123-45-67"
  email?: string // "ivanov@mail.ru"

  // Личные данные
  birthdate: string // "01.01.2000"
  age: number // 24

  // Паспортные данные
  passport: PassportData

  // Адрес
  registrationAddress: string // "г. Москва, ул. Примерная, д. 1, кв. 1"

  // Доп. документы
  snils?: string // "123-456-789 00"
  inn?: string // "1234567890"

  // Несовершеннолетний
  isMinor: boolean
  representative?: RepresentativeData
}

/**
 * Данные автошколы для подстановки в договор
 */
export interface SchoolData {
  // Основная информация
  name: string // "Автошкола Направа"
  fullName: string // "ООО «Автошкола Направа»"

  // Контакты
  phone?: string
  email?: string
  city?: string

  // Юридические реквизиты
  inn: string // "7707123456"
  ogrn: string // "1027700123456"
  kpp: string // "770701001"
  legalAddress: string // "г. Москва, ул. Примерная, д. 1"
  actualAddress: string // "г. Москва, ул. Примерная, д. 1"

  // Руководитель
  directorName: string // "Иванов Иван Иванович"
  directorPosition: string // "Генеральный директор"
  basis: string // "Устава"

  // Лицензия
  licenseNumber: string // "Л035-01234-56/78901234"
  licenseDate: string // "15.01.2020"

  // Банковские реквизиты
  bankName: string // "ПАО Сбербанк"
  bankBik: string // "044525225"
  bankAccount: string // "40702810123456789012"
  corrAccount: string // "30101810400000000225"
}

/**
 * Данные договора для подстановки
 */
export interface ContractData {
  number: string // "123/2026"
  date: string // "15 января 2026 г."
  category: string // "B"
  price: number // 45000
  priceWords: string // "Сорок пять тысяч"
}

/**
 * Все данные для подстановки в шаблон
 */
export interface TemplateData {
  student: StudentData
  school: SchoolData
  contract: ContractData
}

/**
 * Результат рендеринга шаблона
 */
export interface RenderResult {
  html: string // Итоговый HTML
  usedPlaceholders: string[] // Использованные плейсхолдеры
  missingPlaceholders: string[] // Недостающие плейсхолдеры
}

/**
 * Информация о плейсхолдере для UI
 */
export interface PlaceholderInfo {
  key: string // "student.fullName"
  label: string // "ФИО ученика"
  description: string // "Полное ФИО ученика для договора"
  group: 'student' | 'school' | 'contract'
  example: string // "Иванов Иван Иванович"
  required: boolean
}
