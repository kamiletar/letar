/**
 * Реэкспорт хуков для админ-панели.
 *
 * Загрузка изображений переехала в @letar/image-upload (2026-08-04):
 * useImageUpload, useFileDragDrop и useImagePreviewUrl импортируются оттуда.
 */

export {
  useAdminForm,
  type FormActionResult,
  type UseAdminFormOptions,
  type UseAdminFormReturn,
} from './use-admin-form'
