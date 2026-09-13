/**
 * Актуальная версия релиза для скачивания — единый источник для hero и секции «Скачать».
 * Обновлять вручную при каждом новом релизе (см. GitHub Releases kamiletar/letar,
 * тег kami-key-the-v*).
 *
 * ⚠️ С релиза 1.7.4 имя ассета — с дефисами (`KamiKeyThe-Setup-X.Y.Z.exe`), не с точками
 * (`KamiKeyThe.Setup.X.Y.Z.exe`, как раньше у 1.7.2). Дефисы обязательны для совпадения с
 * `latest.yml`, который читает автообновление (`main/updater.ts`) — см. CHANGELOG.md
 * kami-key-the 1.7.4 за разбором.
 */
export const DOWNLOAD_VERSION = '1.7.4'
export const DOWNLOAD_SIZE = '107.4 MB'
export const DOWNLOAD_URL =
  `https://github.com/kamiletar/letar/releases/download/kami-key-the-v${DOWNLOAD_VERSION}/KamiKeyThe-Setup-${DOWNLOAD_VERSION}.exe`
