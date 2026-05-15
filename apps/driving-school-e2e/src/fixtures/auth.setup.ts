/**
 * Константы для storage state файлов авторизации
 *
 * ⚠️ ВАЖНО: Вся логика создания пользователей, профилей и логина
 * выполняется в globalSetup.ts. Этот файл только экспортирует константы
 * для использования в тестах и playwright.config.ts.
 *
 * НЕ добавляй setup тесты сюда — это создаёт race conditions!
 */

import { testInstructor, testOwner, testSchoolAdmin, testStudent } from './test-data'

// Реэкспортируем для обратной совместимости с существующими тестами
export { testInstructor, testOwner, testSchoolAdmin, testStudent }

// Пути к файлам состояния авторизации
export const INSTRUCTOR_STORAGE_STATE = 'playwright/.auth/instructor.json'
export const STUDENT_STORAGE_STATE = 'playwright/.auth/student.json'
export const SCHOOL_ADMIN_STORAGE_STATE = 'playwright/.auth/school-admin.json'
export const OWNER_STORAGE_STATE = 'playwright/.auth/owner.json'
