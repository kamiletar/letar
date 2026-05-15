/**
 * Типы для очереди экспорта
 *
 * Реэкспорт из shared для использования в main process
 */

import type { ExportTask } from '../../../shared/types/export-queue'

export * from '../../../shared/types/export-queue'

/** События очереди экспорта (только для main process) */
export interface ExportQueueEvents {
  /** Прогресс задачи обновился */
  progress: (task: ExportTask) => void
  /** Задача завершена успешно */
  completed: (task: ExportTask) => void
  /** Задача провалилась */
  failed: (task: ExportTask) => void
  /** Очередь изменилась (добавление/удаление/изменение статуса) */
  updated: (tasks: ExportTask[]) => void
}
