/**
 * Утилиты для upload routes: валидация файла из FormData и сохранение на диск.
 *
 * @example
 * ```ts
 * import { extractAndValidateFile, generateFilename, saveFileToDisk } from '@letar/upload-validation'
 *
 * const { file, error } = await extractAndValidateFile(request, 'file', {
 *   maxSize: 5 * 1024 * 1024,
 *   allowedTypes: 'image/',
 * })
 * if (error) return error
 *
 * const filename = generateFilename(file.name)
 * const { path, buffer } = await saveFileToDisk(file, 'avatars', filename)
 * ```
 */

export { deleteFileFromDisk, deleteOldFile, ensureUploadDir, generateFilename, saveFileToDisk } from './lib/save-file'
export {
  extractAndValidateFile,
  extractAndValidateFiles,
  type FileValidationFailure,
  type FileValidationOptions,
  type FileValidationResult,
  validateFile,
} from './lib/validate-file'
