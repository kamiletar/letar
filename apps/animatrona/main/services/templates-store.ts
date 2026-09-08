/**
 * Сервис хранения шаблонов импорта
 *
 * Шаблоны хранятся в JSON файле в userData директории.
 * Это простой подход, который можно позже мигрировать в SQLite.
 */

import { createJsonStore } from '@letar/electron-storage'
import { v4 as uuidv4 } from 'uuid'

import type {
  ImportTemplate,
  ImportTemplateCreateData,
  ImportTemplateUpdateData,
} from '../../shared/types/import-template'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('TemplatesStore')

const TEMPLATES_FILE = 'import-templates.json'

const templatesStore = createJsonStore<ImportTemplate[]>(TEMPLATES_FILE, [], { logger: log })

/**
 * Загрузить шаблоны из файла
 *
 * Копия (spread) — раньше каждый вызов возвращал свежий литерал `[]` на
 * фолбэке, а не переиспользованную ссылку из createJsonStore; вызывающий код
 * (createTemplate и т.п.) мутирует результат на месте (push/splice)
 */
function loadTemplates(): ImportTemplate[] {
  return [...templatesStore.loadSync()]
}

/**
 * Сохранить шаблоны в файл
 */
function saveTemplates(templates: ImportTemplate[]): void {
  templatesStore.saveSync(templates)
}

/**
 * Получить все шаблоны
 */
export function getAllTemplates(): ImportTemplate[] {
  return loadTemplates()
}

/**
 * Получить шаблон по ID
 */
export function getTemplateById(id: string): ImportTemplate | undefined {
  const templates = loadTemplates()
  return templates.find((t) => t.id === id)
}

/**
 * Создать новый шаблон
 */
export function createTemplate(data: ImportTemplateCreateData): ImportTemplate {
  const templates = loadTemplates()

  const newTemplate: ImportTemplate = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  }

  templates.push(newTemplate)
  saveTemplates(templates)

  log.info('Создан шаблон', { name: newTemplate.name })
  return newTemplate
}

/**
 * Обновить шаблон
 */
export function updateTemplate(id: string, data: ImportTemplateUpdateData): ImportTemplate | undefined {
  const templates = loadTemplates()
  const index = templates.findIndex((t) => t.id === id)

  if (index === -1) {
    return undefined
  }

  templates[index] = {
    ...templates[index],
    ...data,
  }

  saveTemplates(templates)
  log.info('Обновлён шаблон', { name: templates[index].name })
  return templates[index]
}

/**
 * Удалить шаблон
 */
export function deleteTemplate(id: string): boolean {
  const templates = loadTemplates()
  const index = templates.findIndex((t) => t.id === id)

  if (index === -1) {
    return false
  }

  const deleted = templates.splice(index, 1)[0]
  saveTemplates(templates)
  log.info('Удалён шаблон', { name: deleted.name })
  return true
}

/**
 * Обновить дату последнего использования
 */
export function markTemplateAsUsed(id: string): void {
  const templates = loadTemplates()
  const template = templates.find((t) => t.id === id)

  if (template) {
    template.lastUsedAt = new Date().toISOString()
    saveTemplates(templates)
  }
}

/**
 * Дефолтные шаблоны (встроенные)
 */
export function getDefaultTemplates(): ImportTemplate[] {
  return [
    {
      id: 'default-fast',
      name: 'Быстрый (GPU)',
      profileId: '', // Будет использован профиль по умолчанию
      vmafSettings: {
        enabled: false,
        targetVmaf: 94,
      },
      audioMaxConcurrent: 2,
      videoMaxConcurrent: 2,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'default-quality',
      name: 'Качество (VMAF)',
      profileId: '',
      vmafSettings: {
        enabled: true,
        targetVmaf: 95,
      },
      audioMaxConcurrent: 2,
      videoMaxConcurrent: 1,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  ]
}
