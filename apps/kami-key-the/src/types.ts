/** Запись в карте символов: клавиша → Unicode символ */
export interface KeyMapping {
  /** Virtual key code (Win32 VK_*) */
  vk: number
  /** Unicode символ для AltGr+клавиша */
  char: string
  /** Unicode символ для AltGr+Shift+клавиша (второй слой) */
  shiftChar?: string
  /** Описание для логов */
  label: string
  /** Описание shift-варианта для логов */
  shiftLabel?: string
}

/** Именованный профиль раскладки */
export interface LayoutProfile {
  /** Имя раскладки (например, «Типографика», «Математика») */
  name: string
  /** Маппинги клавиш для этой раскладки */
  mappings: KeyMapping[]
}

/** Профиль приложения — привязка раскладки к процессу */
export interface AppProfile {
  /** Имя процесса (notepad.exe) или паттерн */
  process: string
  /** Имя раскладки для этого приложения (null/undefined = текущая) */
  layout?: string
}

/** Полный конфиг приложения (JSON в %APPDATA%) */
export interface KeymapConfig {
  /** Версия формата конфига */
  version: number
  /** Порт HTTP-сервера редактора: 0 = автопоиск, 1024-65535 = фиксированный */
  editorPort: number
  /** Имя активной раскладки */
  activeLayout: string
  /** Именованные раскладки */
  layouts: LayoutProfile[]
  /** Специальные действия (общие для всех раскладок) */
  specialActions: SpecialAction[]
  /** Per-app профили (опционально, обратно совместимо) */
  appProfiles?: AppProfile[]
  /** Список процессов, для которых хоткеи отключены */
  excludedProcesses?: string[]
}

/** Специальное действие (не символ, а последовательность клавиш) */
export interface SpecialAction {
  /** Virtual key code триггера */
  vk: number
  /** Модификаторы (MOD_CONTROL | MOD_ALT | MOD_SHIFT) */
  modifiers: number
  /** Описание для логов */
  label: string
  /** Идентификатор действия */
  action: string
}
