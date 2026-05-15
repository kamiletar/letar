/**
 * Модуль для работы с категориями водительских прав
 */

export {
  // Константы
  ALL_LICENSE_CATEGORIES,
  BUS_CATEGORIES,
  CAR_CATEGORIES,
  MOTORCYCLE_CATEGORIES,
  TRAILER_CATEGORIES,
  TRAM_TROLLEYBUS_CATEGORIES,
  TRUCK_CATEGORIES,
  // Функции фильтрации
  filterConnectionsByCategory,
  filterLessonsByCategory,
  getBaseCategory,
  getCategoriesForDisplay,
  getCategoryDescription,
  // Функции отображения
  getCategoryDisplayName,
  // Функции проверки
  instructorTeachesCategory,
  isTrailerCategory,
  // Функции валидации
  isValidCategory,
  schoolTeachesCategory,
  type CategoryDisplayItem,
  // Типы
  type ConnectionWithCategory,
  type InstructorWithCategories,
  type LessonWithCategory,
  type SchoolWithCategories,
} from './license-categories'
