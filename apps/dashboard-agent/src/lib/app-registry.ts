/**
 * HTTP-адреса приложений монорепо, известных dashboard-agent (для вызовов между
 * контейнерами внутри `kami-network`). Вынесен из `cron.ts`, чтобы им мог пользоваться
 * и `lib/dashboard-alert.ts` без циклической зависимости между модулями.
 *
 * Сами данные (порт/host) теперь живут в едином `APP_REGISTRY` в `./server-config` —
 * этот файл только реэкспортирует производные `APP_PORTS`/`APP_HOSTS` и собирает URL.
 * Раньше здесь дублировался второй параллельный реестр (см. PLAN.md Backlog «Регистрация
 * нового приложения разбросана по 3 местам»).
 */

import { APP_HOSTS, APP_PORTS } from './server-config'

export { APP_HOSTS, APP_PORTS }

/**
 * Получение URL приложения
 * Использует APP_HOSTS для Docker container names вместо localhost
 */
export function getAppUrl(app: string, endpoint: string): string {
  const port = APP_PORTS[app]
  const host = APP_HOSTS[app] ?? 'localhost'
  if (!port) {
    throw new Error(`Неизвестное приложение: ${app}`)
  }
  return `http://${host}:${port}${endpoint}`
}
