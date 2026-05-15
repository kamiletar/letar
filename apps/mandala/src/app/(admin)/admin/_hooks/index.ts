/**
 * Реэкспорт хуков для админ-панели.
 */

export {
  useAdminForm,
  type FormActionResult,
  type UseAdminFormOptions,
  type UseAdminFormReturn,
} from './use-admin-form'
export { useFileDragDrop, type UseFileDragDropOptions, type UseFileDragDropReturn } from './use-file-drag-drop'
export {
  useImagePreview,
  useImageUpload,
  type ImageCategory,
  type UploadResult,
  type UseImagePreviewOptions,
  type UseImagePreviewReturn,
  type UseImageUploadOptions,
  type UseImageUploadReturn,
} from './use-image-upload'
