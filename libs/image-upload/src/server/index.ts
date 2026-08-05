// === Раздача загруженных файлов (Node-only) ===
// Отдельная точка входа: серверный код не должен тянуть за собой
// React/Chakra из основного `src/index.ts`.
export {
  createUploadsRoute,
  type CreateUploadsRouteOptions,
  DEFAULT_CACHE_CONTROL,
  DEFAULT_MIME_TYPES,
  parseRange,
  type ResolveFailure,
  type ResolveResult,
  resolveUploadPath,
  type UploadFileContext,
} from './serve-uploads'

// === Обработка изображений при загрузке (sharp) ===
export {
  processUploadImage,
  type ProcessUploadImageBlurOptions,
  type ProcessUploadImageOptions,
  type ProcessUploadImageResizeOptions,
  type ProcessUploadImageResult,
} from './process-upload-image'

// === CRUD-репозиторий модели Image (схема «Image в БД») ===
export { type CreateImageRecordInput, createImageRepository, type ImageRepositoryDelegate } from './image-repository'

// === POST/DELETE /api/upload (схема «Image в БД», файл сохраняется как есть) ===
export {
  createImageUploadRoute,
  type CreateImageUploadRouteOptions,
  type ImageUploadRouteImage,
  type ImageUploadRouteRepository,
} from './image-upload-route'
