/**
 * Детекция раскладки клавиатуры
 *
 * GetKeyboardLayout — определяет активную раскладку
 * Предупреждает о потенциальных конфликтах AltGr с немецкой/французской раскладками
 */

import koffi from 'koffi'

const user32 = koffi.load('user32.dll')

const GetForegroundWindow = user32.func('void *GetForegroundWindow()')
const GetWindowThreadProcessId = user32.func('uint32 GetWindowThreadProcessId(void *hwnd, _Out_ uint32 *processId)')
const GetKeyboardLayout = user32.func('intptr_t GetKeyboardLayout(uint32 threadId)')

/** Известные раскладки с AltGr-маппингами (код языка = младшие 16 бит HKL) */
const ALTGR_LAYOUTS: Record<number, { name: string; conflicts: string[] }> = {
  0x0407: {
    name: 'Немецкая',
    conflicts: ['AltGr+Q=@', 'AltGr+E=€', 'AltGr+7={', 'AltGr+8=[', 'AltGr+9=]', 'AltGr+0=}'],
  },
  0x040c: { name: 'Французская', conflicts: ['AltGr+0=@', 'AltGr+3=#', 'AltGr+4={', 'AltGr+5=['] },
  0x040e: { name: 'Венгерская', conflicts: ['AltGr+Q=\\', 'AltGr+W=|', 'AltGr+F=[', 'AltGr+G=]'] },
  0x0415: { name: 'Польская', conflicts: ['AltGr+буквы=ąćęłńóśźż'] },
  0x0405: { name: 'Чешская', conflicts: ['AltGr+буквы=ěšřžýáíé'] },
}

/** Раскладки без конфликтов AltGr, но где сам AltGr реально работает */
const SAFE_LAYOUTS: Record<number, string> = {
  0x0419: 'Русская',
  0x0422: 'Украинская',
}

/**
 * Раскладки, где Right Alt физически НЕ синтезирует Ctrl+Alt вовсе (AltGr не определён в
 * драйвере раскладки) — это не «конфликт маппингов», а «RegisterHotKey с MOD_CONTROL|MOD_ALT
 * никогда не сработает», принципиально другая проблема. См. PLAN.md «Сигнализация о
 * несовместимой раскладке при показе overlay».
 */
const NO_ALTGR_LAYOUTS: Record<number, string> = {
  0x0409: 'US English',
}

export interface LayoutInfo {
  /** Код раскладки (HKL) */
  hkl: number
  /** Код языка (младшие 16 бит) */
  langId: number
  /** Название раскладки */
  name: string
  /** Есть ли конфликты с AltGr */
  hasConflicts: boolean
  /** Список конфликтов */
  conflicts: string[]
  /** Определён ли AltGr в этой раскладке вообще (false → хоткеи AltGr физически не сработают) */
  hasAltGr: boolean
}

/** Получить информацию о текущей раскладке */
export function getCurrentLayout(): LayoutInfo {
  const hwnd = GetForegroundWindow()
  const pidBuf = [0]
  const threadId = GetWindowThreadProcessId(hwnd, pidBuf)
  const hkl = Number(GetKeyboardLayout(threadId))

  // Код языка — младшие 16 бит
  const langId = hkl & 0xffff

  const altgrLayout = ALTGR_LAYOUTS[langId]
  if (altgrLayout) {
    return {
      hkl,
      langId,
      name: altgrLayout.name,
      hasConflicts: true,
      conflicts: altgrLayout.conflicts,
      hasAltGr: true,
    }
  }

  const noAltGrName = NO_ALTGR_LAYOUTS[langId]
  if (noAltGrName) {
    return {
      hkl,
      langId,
      name: noAltGrName,
      hasConflicts: false,
      conflicts: [],
      hasAltGr: false,
    }
  }

  const safeName = SAFE_LAYOUTS[langId]
  return {
    hkl,
    langId,
    name: safeName ?? `Неизвестная (0x${langId.toString(16).padStart(4, '0')})`,
    hasConflicts: false,
    conflicts: [],
    hasAltGr: true,
  }
}

/** Залогировать информацию о раскладке при старте */
export function logLayoutInfo(): void {
  const layout = getCurrentLayout()
  console.log(`Раскладка: ${layout.name} (0x${layout.langId.toString(16).padStart(4, '0')})`)

  if (layout.hasConflicts) {
    console.warn(`  ⚠ Раскладка имеет собственные AltGr-маппинги:`)
    console.warn(`    ${layout.conflicts.join(', ')}`)
    console.warn(`    Некоторые хоткеи KamiKeyThe могут конфликтовать`)
  }

  if (!layout.hasAltGr) {
    console.warn(`  ⚠ В этой раскладке AltGr не определён вовсе — хоткеи KamiKeyThe не сработают`)
    console.warn(`    Переключите раскладку на русскую (или другую с AltGr)`)
  }
}
