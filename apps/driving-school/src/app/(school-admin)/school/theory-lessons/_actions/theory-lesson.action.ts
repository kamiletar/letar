/**
 * Server Actions для работы с теоретическими занятиями
 *
 * @module theory-lesson
 *
 * Структура модуля:
 * - theory-lesson.types.ts — типы данных
 * - theory-lesson-queries.action.ts — получение данных (get*)
 * - theory-lesson-crud.action.ts — создание, обновление, удаление
 * - theory-lesson-status.action.ts — управление статусом (cancel, reschedule, start, complete)
 *
 * @example
 * ```ts
 * import {
 *   getTheoryLessonAction,
 *   createTheoryLessonAction,
 *   cancelTheoryLessonAction,
 *   type TheoryLessonSummary,
 * } from '../_actions/theory-lesson.action'
 * ```
 */

// Типы
export type {
  SchoolClassroom,
  SchoolInstructor,
  TheoryLessonAttendance,
  TheoryLessonDetails,
  TheoryLessonSummary,
} from './theory-lesson.types'

// Queries (получение данных)
export {
  getSchoolClassroomsAction,
  getSchoolInstructorsAction,
  getTheoryLessonAction,
  getTheoryLessonsForGroupAction,
  getTheoryLessonsForSchoolAction,
} from './theory-lesson-queries.action'

// CRUD (создание, обновление, удаление)
export {
  createTheoryLessonAction,
  deleteTheoryLessonAction,
  updateTheoryLessonAction,
} from './theory-lesson-crud.action'

// Status (управление статусом)
export {
  cancelTheoryLessonAction,
  completeTheoryLessonAction,
  rescheduleTheoryLessonAction,
  startTheoryLessonAction,
} from './theory-lesson-status.action'

// Generate (массовая генерация расписания)
export { generateTheoryScheduleAction, previewTheoryScheduleAction } from './theory-lesson-generate.action'
export type { GenerateScheduleInput, ScheduleSlotPreview } from './theory-lesson-generate.action'
