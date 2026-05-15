/**
 * IPC handlers для шаблонов импорта
 */

import type { ImportTemplateCreateData, ImportTemplateUpdateData } from '../../shared/types/import-template'
import * as templatesStore from '../services/templates-store'
import { createHandler } from '../utils/ipc-handler-factory'

/**
 * Регистрация IPC handlers для шаблонов
 */
export function registerTemplatesHandlers(): void {
  // Получить все шаблоны
  createHandler('templates:getAll', () => {
    const userTemplates = templatesStore.getAllTemplates()
    const defaultTemplates = templatesStore.getDefaultTemplates()
    return [...defaultTemplates, ...userTemplates]
  })

  // Получить шаблон по ID
  createHandler('templates:getById', (id: string) => {
    // Сначала ищем в дефолтных
    const defaultTemplates = templatesStore.getDefaultTemplates()
    const defaultTemplate = defaultTemplates.find((t) => t.id === id)
    if (defaultTemplate) {
      return defaultTemplate
    }

    // Затем в пользовательских
    const template = templatesStore.getTemplateById(id)
    if (!template) {
      throw new Error('Шаблон не найден')
    }
    return template
  })

  // Создать шаблон
  createHandler('templates:create', (data: ImportTemplateCreateData) => templatesStore.createTemplate(data))

  // Обновить шаблон
  createHandler('templates:update', (id: string, data: ImportTemplateUpdateData) => {
    // Нельзя редактировать дефолтные шаблоны
    const defaultTemplates = templatesStore.getDefaultTemplates()
    if (defaultTemplates.some((t) => t.id === id)) {
      throw new Error('Нельзя редактировать встроенный шаблон')
    }

    const template = templatesStore.updateTemplate(id, data)
    if (!template) {
      throw new Error('Шаблон не найден')
    }
    return template
  })

  // Удалить шаблон
  createHandler('templates:delete', (id: string) => {
    // Нельзя удалить дефолтные шаблоны
    const defaultTemplates = templatesStore.getDefaultTemplates()
    if (defaultTemplates.some((t) => t.id === id)) {
      throw new Error('Нельзя удалить встроенный шаблон')
    }

    const deleted = templatesStore.deleteTemplate(id)
    if (!deleted) {
      throw new Error('Шаблон не найден')
    }
  })

  // Отметить шаблон как использованный
  createHandler('templates:markAsUsed', (id: string) => templatesStore.markTemplateAsUsed(id))
}
