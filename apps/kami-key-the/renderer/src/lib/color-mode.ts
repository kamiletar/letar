/**
 * Синхронизация класса `dark`/`light` на `<html>` с системной темой Windows.
 *
 * Electron транслирует системную тему в `prefers-color-scheme` сам (через nativeTheme) — здесь
 * только подписка на медиазапрос браузерной стороны. Вызывать синхронно до первого рендера,
 * чтобы не было вспышки неверной темой.
 */

/** Применить текущую системную тему и подписаться на её смену. Возвращает функцию отписки. */
export function syncColorModeWithSystem(): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)')

  const apply = (isDark: boolean) => {
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.classList.toggle('light', !isDark)
  }

  apply(media.matches)

  const handler = (e: MediaQueryListEvent) => apply(e.matches)
  media.addEventListener('change', handler)
  return () => media.removeEventListener('change', handler)
}
