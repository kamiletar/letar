/**
 * Хелперы для работы с SQLite базой данных в тестах.
 *
 * Использует sql.js (WASM версия SQLite) для:
 * - Создания чистой тестовой БД из template
 * - Seed тестовых данных
 * - Проверки состояния после тестов
 */
/**
 * Создать чистую тестовую БД из template
 *
 * @returns Путь к созданной тестовой БД
 */
export declare function createTestDatabase(): Promise<string>
/**
 * Удалить тестовую БД
 */
export declare function deleteTestDatabase(dbPath: string): void
/**
 * Очистить все тестовые БД
 */
export declare function cleanupAllTestDatabases(): void
/**
 * Добавить тестовое аниме в БД
 */
export declare function seedAnime(
  dbPath: string,
  anime: {
    id: string
    name: string
    originalName?: string
    shikimoriId?: number
    year?: number
    status?: string
  }
): Promise<void>
/**
 * Добавить тестовый эпизод в БД
 */
export declare function seedEpisode(
  dbPath: string,
  episode: {
    id: string
    animeId: string
    seasonNumber?: number
    number: number
    name?: string
    filePath?: string
  }
): Promise<void>
/**
 * Получить количество аниме в БД
 */
export declare function getAnimeCount(dbPath: string): Promise<number>
/**
 * Получить количество эпизодов в БД
 */
export declare function getEpisodeCount(dbPath: string): Promise<number>
/**
 * Найти аниме по имени
 */
export declare function findAnimeByName(
  dbPath: string,
  name: string
): Promise<{
  id: string
  name: string
  shikimoriId: number | null
} | null>
/**
 * Получить все аниме
 */
export declare function getAllAnime(dbPath: string): Promise<
  Array<{
    id: string
    name: string
    shikimoriId: number | null
  }>
>
// # sourceMappingURL=db.helpers.d.ts.map
