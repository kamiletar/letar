/**
 * Реестр адресов приложений монорепо, известных dashboard-agent (для HTTP-вызовов
 * между контейнерами внутри `kami-network`). Вынесен из `cron.ts`, чтобы им мог
 * пользоваться и `lib/dashboard-alert.ts` без циклической зависимости между модулями.
 */

// Карта портов приложений
export const APP_PORTS: Record<string, number> = {
  dashboard: 3002,
  'driving-school': 3003,
  mandala: 3004,
  kami: 3005,
  dsperevod: 3019,
  'dashboard-agent': 3100,
}

// Карта хостов приложений (Docker container names внутри kami-network)
// dashboard-agent обращается к себе через localhost, к другим через имя контейнера
export const APP_HOSTS: Record<string, string> = {
  dashboard: process.env.DASHBOARD_HOST ?? 'dashboard-app',
  'driving-school': process.env.DRIVING_SCHOOL_HOST ?? 'driving-school-app',
  mandala: process.env.MANDALA_HOST ?? 'mandala-app',
  kami: process.env.KAMI_HOST ?? 'kami-app',
  dsperevod: process.env.DSPEREVOD_HOST ?? 'dsperevod-app',
  'dashboard-agent': 'localhost', // self-reference
}

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
