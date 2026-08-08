/**
 * Бэкап секретов Traefik на s3 (PLAN-INFRA.md §48 M2).
 *
 * Заведён 2026-08-08, сразу после переезда s3 с NPM на Traefik. До этого утверждение
 * «на s3 бэкапить нечего — там нет прод-БД» было верным и записано в
 * `.claude/docs/backup-architecture.md`. M2 сделало его ложным, и это ровно тот случай, когда
 * пробел создаётся не забывчивостью, а изменением состава системы: бэкапов «не хватало» ноль
 * секунд назад, а теперь не хватает.
 *
 * Архивируются три вещи, и все три обязательны:
 *
 * - `/home/deploy/lego/acme-dns-accounts.json` — три per-name аккаунта acme-dns
 *   (`media`/`ipfs`/`gateway`). ⛔ **Невосстановимо без владельца:** регистрация в acme-dns
 *   закрыта, а новый аккаунт выдал бы новые `fulldomain` — то есть потребовал бы переделать три
 *   `CNAME` у регистратора вручную. Восстановление упирается и в человека, и во внешний сервис
 *   одновременно — сочетание, превращающее часовой инцидент в дневной.
 * - `infra/traefik/acme/acme.json` — приватные ключи всех сертификатов s3. Восстановимо
 *   перевыпуском, но упирается в лимит Let's Encrypt на дубликаты (5/неделю на набор имён).
 * - `infra/traefik/auth/` — `basicAuth` дашборда. Восстановимо генерацией новой пары.
 *
 * ⚠️ Почему НЕ переиспользован `backupAcmeDns`: он требует наличия базы acme-dns
 * (`infra/acme-dns/data/`), а сам acme-dns живёт на **s2**. На s3 такой базы нет и не будет,
 * поэтому его запуск здесь честно падал бы с «нечего бэкапить». Общая у них только механика
 * упаковки — она и вынесена в `tar-backup.ts`.
 */

import path from 'path'
import { createTarBackup, listTarBackups, type TarBackupInfo, type TarBackupResult } from './tar-backup'

const WORKSPACE_PATH = process.env.WORKSPACE_PATH || '/home/deploy/letar'

/**
 * Файл аккаунтов lego на s3. Лежит ВНЕ workspace, поэтому монтируется в контейнер агента
 * отдельной строкой (`docker-compose.s3.yml`). Забыть про монтирование — получать
 * «нечего бэкапить» на каждом прогоне; именно поэтому источник обязательный, а не опциональный:
 * молчаливо пустой архив выглядел бы как защита.
 */
const LEGO_ACCOUNTS_FILE = process.env.ACME_DNS_ACCOUNTS_FILE || '/home/deploy/lego/acme-dns-accounts.json'

const TRAEFIK_ACME_FILE = path.join(WORKSPACE_PATH, 'infra/traefik/acme/acme.json')
const TRAEFIK_AUTH_DIR = path.join(WORKSPACE_PATH, 'infra/traefik/auth')

const BACKUPS_DIR = process.env.TRAEFIK_BACKUP_DIR || path.join(WORKSPACE_PATH, 'backups/traefik')

const PREFIX = 'traefik'

export type TraefikBackupResult = TarBackupResult
export type TraefikBackupInfo = TarBackupInfo

export async function backupTraefik(type: 'manual' | 'auto' = 'manual'): Promise<TraefikBackupResult> {
  return createTarBackup({
    prefix: PREFIX,
    type,
    backupsDir: BACKUPS_DIR,
    sources: [
      {
        label: 'аккаунты acme-dns (media/ipfs/gateway)',
        path: LEGO_ACCOUNTS_FILE,
        hint: 'проверить, смонтирован ли /home/deploy/lego в контейнер агента на s3',
      },
      {
        label: 'сертификаты Traefik',
        path: TRAEFIK_ACME_FILE,
        hint: 'создаётся Traefik при первом выпуске; пусто — значит сертификатов ещё нет',
      },
      {
        label: 'basicAuth дашборда',
        path: TRAEFIK_AUTH_DIR,
        hint: 'каталог ./auth рядом с docker-compose.yml Traefik',
      },
    ],
  })
}

export async function getTraefikBackupsList(): Promise<TraefikBackupInfo[]> {
  return listTarBackups(PREFIX, BACKUPS_DIR)
}
