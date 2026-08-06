/**
 * Реэкспорт хуков для админ-панели.
 *
 * Загрузка изображений переехала в @letar/image-upload (2026-08-04):
 * useImageUpload, useFileDragDrop и useImagePreviewUrl импортируются оттуда.
 */

export {
  type FormActionResult,
  useAdminForm,
  type UseAdminFormOptions,
  type UseAdminFormReturn,
} from './use-admin-form'
