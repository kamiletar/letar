/** Определение одного символа-токена маски (встроенного или пользовательского). */
export interface MaskTokenDefinition {
  /** Разрешён ли символ на позиции этого токена */
  pattern: (char: string) => boolean
  /** Необязательное преобразование введённого символа (транслитерация, регистр и т.п.) */
  transform?: (char: string) => string | undefined
}

/** Символ маски (ключ, например `'9'`) → его определение */
export type MaskTokenMap = Record<string, MaskTokenDefinition>

export interface MaskOptions {
  /** Пользовательские токены поверх встроенных (`9`, `a`, `*`) */
  customTokens?: MaskTokenMap
  /**
   * Переопределение карты допустимых позиций каретки — нужно числовым форматам
   * (`Field.Currency`, `Field.Number`), где допустимая позиция не совпадает с общим правилом
   * «рядом с input-символом».
   */
  caretBoundary?: (value: string, mask: string) => boolean[]
}

/** Разобранный слот маски: литерал (статичный символ) или позиция ввода. */
export type MaskSlot =
  | { kind: 'literal'; char: string }
  | { kind: 'input'; token: string; optional: boolean }

export type ParsedMask = MaskSlot[]

/** Роль символа в `formatToParts` — для рендера видимого шаблона поверх значения. */
export type MaskPartType = 'input' | 'literal' | 'placeholder'

export interface MaskPart {
  type: MaskPartType
  /** Реальный символ (input/literal) либо символ токена-подсказки (placeholder) */
  char: string
  /** true — символ подтверждён (часть `format()`), false — часть незаполненного хвоста шаблона */
  filled: boolean
}

export type MaskInputType = 'insert' | 'deleteBackward' | 'deleteForward'

export interface ApplyChangeInput {
  previousValue: string
  inputType: MaskInputType
  /** Вставляемые символы; `''` для чистого удаления */
  addedValue: string
  /** Начало выделения/каретки ДО изменения (позиция в `previousValue`) */
  changeStart: number
  /** Конец выделения ДО изменения; равен `changeStart`, если выделения не было */
  changeEnd: number
  mask: string
  options?: MaskOptions
}

export interface ApplyChangeResult {
  value: string
  selectionStart: number
  selectionEnd: number
}
