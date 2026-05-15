import type { DocumentsStatus, PracticeStatus, ProgressStatus, TheoryStatus } from '@letar/driving-school-db/prisma'
import type { IconType } from 'react-icons'
import { LuBadgeCheck, LuBookOpen, LuCar, LuClipboardCheck, LuFileText, LuPause } from 'react-icons/lu'

import type { StudentProgressSummary } from '../../_actions/progress.action'

/**
 * Этап Kanban-доски для учеников
 */
export type KanbanStage =
  | 'documents' // Документы не готовы
  | 'theory' // Теория в процессе
  | 'practice' // Практика в процессе
  | 'ready' // Готов к экзамену
  | 'completed' // Завершено обучение
  | 'inactive' // Приостановлен/отчислен

/**
 * Конфигурация колонки Kanban
 */
export interface KanbanColumn {
  id: KanbanStage
  title: string
  color: string
  icon: IconType
  description: string
}

/**
 * Конфигурация всех колонок Kanban-доски
 */
export const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'documents',
    title: 'Документы',
    color: 'gray',
    icon: LuFileText,
    description: 'Документы не готовы',
  },
  {
    id: 'theory',
    title: 'Теория',
    color: 'blue',
    icon: LuBookOpen,
    description: 'Изучение теории',
  },
  {
    id: 'practice',
    title: 'Практика',
    color: 'purple',
    icon: LuCar,
    description: 'Практические занятия',
  },
  {
    id: 'ready',
    title: 'Готов к экзамену',
    color: 'orange',
    icon: LuClipboardCheck,
    description: 'Готов к сдаче',
  },
  {
    id: 'completed',
    title: 'Завершено',
    color: 'green',
    icon: LuBadgeCheck,
    description: 'Обучение завершено',
  },
  {
    id: 'inactive',
    title: 'Неактивные',
    color: 'red',
    icon: LuPause,
    description: 'Приостановлены или отчислены',
  },
]

/**
 * Получить конфигурацию колонки по ID
 */
export function getColumnConfig(stage: KanbanStage): KanbanColumn {
  return KANBAN_COLUMNS.find((c) => c.id === stage) ?? KANBAN_COLUMNS[0]
}

/**
 * Определяет этап ученика на основе его прогресса
 */
export function getStudentStage(student: StudentProgressSummary): KanbanStage {
  // Неактивные — приостановлен или отчислен
  if (student.status === 'SUSPENDED' || student.status === 'EXPELLED') {
    return 'inactive'
  }

  // Завершено — обучение окончено
  if (student.status === 'COMPLETED') {
    return 'completed'
  }

  // Документы — документы не готовы
  if (student.documentsStatus !== 'READY') {
    return 'documents'
  }

  // Теория — теория не завершена
  if (student.theoryStatus !== 'COMPLETED') {
    return 'theory'
  }

  // Проверяем практику по категориям
  const hasCategories = student.categories.length > 0
  if (!hasCategories) {
    // Нет категорий — всё ещё на этапе документов/теории
    return 'theory'
  }

  // Проверяем, завершена ли практика по всем категориям
  const allPracticeCompleted = student.categories.every((c) => c.practiceStatus === 'COMPLETED')

  if (!allPracticeCompleted) {
    return 'practice'
  }

  // Всё готово — готов к экзамену
  return 'ready'
}

/**
 * Группирует учеников по этапам Kanban
 */
export function groupStudentsByStage(
  students: StudentProgressSummary[]
): Record<KanbanStage, StudentProgressSummary[]> {
  const groups: Record<KanbanStage, StudentProgressSummary[]> = {
    documents: [],
    theory: [],
    practice: [],
    ready: [],
    completed: [],
    inactive: [],
  }

  for (const student of students) {
    const stage = getStudentStage(student)
    groups[stage].push(student)
  }

  return groups
}

/**
 * Маппинг этапов Kanban на статусы БД для обновления
 */
export interface StageUpdateData {
  status?: ProgressStatus
  documentsStatus?: DocumentsStatus
  theoryStatus?: TheoryStatus
  practiceStatus?: PracticeStatus
}

/**
 * Проверяет, допустим ли переход между этапами
 */
export function isValidTransition(from: KanbanStage, to: KanbanStage): boolean {
  // Нельзя перемещать в inactive (только через отчисление)
  if (to === 'inactive') {
    return false
  }

  // Из inactive можно только восстановить в documents
  if (from === 'inactive' && to !== 'documents') {
    return false
  }

  // Из completed можно только обратно в ready (inactive уже исключён выше)
  if (from === 'completed' && to !== 'ready') {
    return false
  }

  // Остальные переходы допустимы
  return true
}

/**
 * Возвращает данные для обновления статусов при перемещении на этап
 */
export function getStageUpdateData(stage: KanbanStage): StageUpdateData | null {
  switch (stage) {
    case 'documents':
      return {
        status: 'ACTIVE',
        documentsStatus: 'IN_PROGRESS',
      }
    case 'theory':
      return {
        status: 'ACTIVE',
        documentsStatus: 'READY',
        theoryStatus: 'IN_PROGRESS',
      }
    case 'practice':
      return {
        status: 'ACTIVE',
        documentsStatus: 'READY',
        theoryStatus: 'COMPLETED',
        practiceStatus: 'IN_PROGRESS',
      }
    case 'ready':
      return {
        status: 'ACTIVE',
        documentsStatus: 'READY',
        theoryStatus: 'COMPLETED',
        practiceStatus: 'COMPLETED',
      }
    case 'completed':
      return {
        status: 'COMPLETED',
      }
    case 'inactive':
      // Переход в inactive должен происходить через отдельный action
      return null
    default:
      return null
  }
}
