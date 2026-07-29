/**
 * Ключ дорожки (аудио/субтитры) для группировки по эпизодам
 */

/**
 * Строит ключ дорожки вида `language:title`. Если title пуст — фолбэк на dubGroup,
 * затем на 'default'.
 */
export function resolveTrackKey(language: string, title?: string | null, dubGroup?: string | null): string {
  return `${language}:${title || dubGroup || 'default'}`
}
