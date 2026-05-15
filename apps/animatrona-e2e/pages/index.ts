/**
 * Экспорт всех Page Objects.
 *
 * @example
 * ```ts
 * import { LibraryPage, PlayerPage } from '../../pages'
 *
 * const library = new LibraryPage(ctx.page)
 * await library.openImportWizard()
 * ```
 */

export { BasePage } from './base.page'
export { ImportWizardPage } from './import-wizard.page'
export { LibraryPage } from './library.page'
export { PlayerPage } from './player.page'
export { SettingsPage } from './settings.page'
export { TranscodePage } from './transcode.page'
