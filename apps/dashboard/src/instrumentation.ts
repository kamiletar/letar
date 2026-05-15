/* eslint-disable no-console -- Instrumentation requires console output */
/**
 * Next.js Instrumentation
 * Этот файл выполняется при запуске сервера
 *
 * NOTE: Мониторинг запускается через API endpoint /api/monitoring
 * потому что instrumentation не поддерживает native модули (dockerode, ssh2).
 * Автозапуск реализован через первый запрос к /api/monitoring/auto-start
 */

export async function register() {
  // Instrumentation регистрируется, но мониторинг запускается через API
  if (process.env.NODE_ENV === 'production') {
    console.log('[Instrumentation] Dashboard server starting...')
    console.log('[Instrumentation] Monitoring will auto-start on first API request')
  }
}
