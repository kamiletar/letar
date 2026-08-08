/**
 * Бэкап acme-dns (PLAN-INFRA.md §48).
 *
 * От acme-dns зависит продление **всех** сертификатов зоны `letar.best`. Если он тихо
 * умрёт, выяснится это через 90 дней в худший момент — поэтому бэкап тут не «на всякий
 * случай», а часть работоспособности TLS.
 *
 * Архивируются две вещи, и обе обязательны:
 *
 * - `infra/acme-dns/data/` — база выданных поддоменов;
 * - `/home/deploy/lego/acme-dns-accounts.json` — файл аккаунтов lego. **Восстановить его
 *   нельзя:** регистрация в acme-dns закрыта (`disable_registration = true`), а даже с
 *   открытой новый аккаунт дал бы новый `fulldomain`, то есть потребовал бы правки боевой
 *   `CNAME`-записи в зоне.
 *
 * Отсутствие любого из двух — ошибка, а не повод сделать бэкап из того, что нашлось:
 * молчаливо неполный архив опаснее отсутствующего, потому что выглядит как защита.
 *
 * ⚠️ Архив содержит секрет уровня прод-БД (кто владеет файлом аккаунтов — тот подменяет
 * ACME-челленджи всей зоны) и **не шифруется** — ровно как `nginx_*.tar.gz` (приватные ключи
 * всех сертификатов) и `maddy_*.tar.gz` (DKIM). Это осознанное следование существующей
 * политике, а не недосмотр: шифровать один бэкап из трёх — непоследовательно, а в момент
 * аварии добавляет зависимость от age-ключа. Вопрос «шифровать ли бэкапы на покое» — общий,
 * заведён отдельно в §48; решать его надо сразу для всех трёх, не точечно здесь.
 *
 * Механика упаковки/ротации/списка — общая, вынесена в `tar-backup.ts` (2026-08-08).
 * Снимок базы снимается обычным tar, без `sqlite3 .backup`. Это допустимо именно здесь:
 * acme-dns пишет в базу только при обновлении TXT-записи, то есть считанные разы в 90 дней,
 * и вероятность поймать момент записи ничтожна. Для БД приложений так делать нельзя.
 */

import path from 'path'
import { createTarBackup, listTarBackups, type TarBackupInfo, type TarBackupResult } from './tar-backup'

const WORKSPACE_PATH = process.env.WORKSPACE_PATH || '/home/deploy/letar'

/** База acme-dns — bind-mount из `infra/acme-dns/docker-compose.yml` */
const ACME_DNS_DATA_DIR = path.join(WORKSPACE_PATH, 'infra/acme-dns/data')

/**
 * Файл аккаунтов lego. Лежит ВНЕ workspace, поэтому в контейнер агента монтируется
 * отдельной строкой (`docker-compose.production.yml`). Забыть про монтирование — значит
 * получать «файл не найден» на каждом прогоне.
 */
const LEGO_ACCOUNTS_FILE = process.env.ACME_DNS_ACCOUNTS_FILE || '/home/deploy/lego/acme-dns-accounts.json'

/** Каталог бэкапов — отдельный, чтобы проверка свежести смотрела ровно на них */
const BACKUPS_DIR = path.join(WORKSPACE_PATH, 'backups/acme-dns')

const PREFIX = 'acme-dns'

export type AcmeDnsBackupResult = TarBackupResult
export type AcmeDnsBackupInfo = TarBackupInfo

/** Создаёт бэкап acme-dns: база + файл аккаунтов lego в один tar.gz. */
export async function backupAcmeDns(type: 'manual' | 'auto' = 'manual'): Promise<AcmeDnsBackupResult> {
  return createTarBackup({
    prefix: PREFIX,
    type,
    backupsDir: BACKUPS_DIR,
    sources: [
      {
        label: 'база acme-dns',
        path: ACME_DNS_DATA_DIR,
      },
      {
        label: 'файл аккаунтов lego',
        path: LEGO_ACCOUNTS_FILE,
        hint: 'проверить, смонтирован ли /home/deploy/lego в контейнер агента',
      },
    ],
  })
}

/** Возвращает список бэкапов acme-dns (файлы acme-dns_*.tar.gz) */
export async function getAcmeDnsBackupsList(): Promise<AcmeDnsBackupInfo[]> {
  return listTarBackups(PREFIX, BACKUPS_DIR)
}
