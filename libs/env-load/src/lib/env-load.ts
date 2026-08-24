import { config } from 'dotenv'

/**
 * Каскадная загрузка .env-файлов в порядке приоритета (как Next.js): раньше
 * указанный файл побеждает — dotenv не перезаписывает уже установленные переменные.
 * По умолчанию — .env.local → .env; для приложений без `.env` (только Docker-прод,
 * см. .claude/rules/env-files.md) передать `['.env.local', '.env.docker']`.
 */
export function loadEnvCascade(baseDir?: string, files: string[] = ['.env.local', '.env']): void {
  const resolve = (name: string) => (baseDir ? `${baseDir}/${name}` : name)

  for (const file of files) {
    config({ path: resolve(file), quiet: true })
  }
}
