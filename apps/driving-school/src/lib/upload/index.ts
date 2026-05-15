/**
 * Централизованные утилиты для upload routes
 *
 * @example
 * ```ts
 * import { extractAndValidateFile, saveFileToDisk, generateFilename } from '@/lib/upload'
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

export {
  extractAndValidateFile,
  validateFile,
  type FileValidationOptions,
  type FileValidationResult,
} from './validate-file'

export { deleteFileFromDisk, deleteOldFile, ensureUploadDir, generateFilename, saveFileToDisk } from './save-file'
