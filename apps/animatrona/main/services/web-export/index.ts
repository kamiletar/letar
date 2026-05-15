/**
 * Web Export Service
 *
 * Экспорт контента для Web Player с поддержкой:
 * - Embedded режима (копирование файлов)
 * - Referenced режима (только CID ссылки)
 */

export { bundleAssets } from './asset-bundler'
export { generateManifest } from './manifest-generator'
export { WebExportManager } from './web-export-manager'
