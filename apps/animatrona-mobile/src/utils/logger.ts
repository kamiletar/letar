/**
 * Dev-логгер — печатает в консоль только в debug-сборке (`__DEV__`).
 *
 * Не для версионных строк (index.js, PlayerScreen.tsx) — та печать обязана
 * работать всегда, см. CLAUDE.md «⚠️ ОБЯЗАТЕЛЬНО: Версионирование в логах».
 */

/* eslint-disable no-console -- единственная точка, где console.* разрешён в этом приложении */
export const logger = {
  log: (...args: unknown[]) => {
    if (__DEV__) { console.log(...args) }
  },
  info: (...args: unknown[]) => {
    if (__DEV__) { console.info(...args) }
  },
  debug: (...args: unknown[]) => {
    if (__DEV__) { console.debug(...args) }
  },
}
/* eslint-enable no-console */
