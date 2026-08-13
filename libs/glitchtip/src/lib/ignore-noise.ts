// Паттерны серверных «ошибок», которые на самом деле не баг приложения, а шум внешнего
// сканирования (боты перебирают несуществующие WordPress-пути вида /wp-editor.php, /xx.php).
// Next.js на каждый такой 404 логирует "Page changed from static to dynamic ... reason: headers"
// через onRequestError — без фильтра каждый новый путь скана плодит отдельный issue в GlitchTip
// (см. apps/time issues 19-41, разбор 2026-08-13).
const IGNORED_MESSAGE_PATTERNS = [/Page changed from static to dynamic at runtime .* reason: headers/]

/**
 * true — событие не нужно отправлять в GlitchTip (известный шум, не ошибка приложения).
 */
export function isIgnorableRequestError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  return IGNORED_MESSAGE_PATTERNS.some((pattern) => pattern.test(message))
}
