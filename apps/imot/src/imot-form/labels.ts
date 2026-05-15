/**
 * Русские названия для всех ENUM'ов IMOT
 */

// Пол (Gender)
export const genderLabels: Record<string, string> = {
  MALE: 'Мужской',
  FEMALE: 'Женский',
  OTHER: 'Другой',
}

// Роль пользователя (UserRole)
export const userRoleLabels: Record<string, string> = {
  CLIENT: 'Клиент',
  SPECIALIST: 'Специалист',
  ADMIN: 'Администратор',
}

// Статус сессии (SessionStatus)
export const sessionStatusLabels: Record<string, string> = {
  SCHEDULED: 'Запланирована',
  IN_PROGRESS: 'В процессе',
  COMPLETED: 'Завершена',
  CANCELLED: 'Отменена',
}

// Этап трансформации (TransformationStage)
export const transformationStageLabels: Record<string, string> = {
  DIAGNOSTICS: 'Диагностика',
  INTEGRATION: 'Интеграция',
  STRATEGY: 'Стратегия',
  PRACTICE: 'Практика',
  RESULT: 'Результат',
}

// Цветотип (ColorType)
export const colorTypeLabels: Record<string, string> = {
  SPRING: 'Весна (тёплые светлые тона)',
  SUMMER: 'Лето (холодные светлые тона)',
  AUTUMN: 'Осень (тёплые глубокие тона)',
  WINTER: 'Зима (холодные яркие тона)',
}

// Архетип (Archetype) — 12 архетипов личности
export const archetypeLabels: Record<string, string> = {
  INNOCENT: 'Невинный',
  EVERYMAN: 'Славный малый',
  HERO: 'Герой',
  OUTLAW: 'Бунтарь',
  EXPLORER: 'Искатель',
  CREATOR: 'Творец',
  RULER: 'Правитель',
  MAGICIAN: 'Маг',
  LOVER: 'Любовник',
  CAREGIVER: 'Заботливый',
  JESTER: 'Шут',
  SAGE: 'Мудрец',
}

// Тип чакры (ChakraType) — 7 чакр энергетической системы
export const chakraTypeLabels: Record<string, string> = {
  ROOT: 'Муладхара (корневая)',
  SACRAL: 'Свадхистхана (сакральная)',
  SOLAR_PLEXUS: 'Манипура (солнечное сплетение)',
  HEART: 'Анахата (сердечная)',
  THROAT: 'Вишудха (горловая)',
  THIRD_EYE: 'Аджна (третий глаз)',
  CROWN: 'Сахасрара (коронная)',
}
