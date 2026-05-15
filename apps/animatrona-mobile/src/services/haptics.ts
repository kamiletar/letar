/**
 * Тактильная обратная связь через TurboModule HapticsModule
 *
 * Использует View.performHapticFeedback() на Android.
 * Safe-call `?.` — не крашится если модуль недоступен.
 */

import NativeHapticsModule from '../../specs/NativeHapticsModule'

export const Haptics = {
  /** Лёгкий клик (VIRTUAL_KEY) — кнопки, тапы */
  light: () => NativeHapticsModule?.light(),
  /** Ощутимый тап (KEYBOARD_TAP) — lock/unlock, переключение эпизодов */
  medium: () => NativeHapticsModule?.medium(),
  /** Длинная вибрация (LONG_PRESS) — удаление, деструктивные действия */
  heavy: () => NativeHapticsModule?.heavy(),
}
