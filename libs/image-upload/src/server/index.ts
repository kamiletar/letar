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
