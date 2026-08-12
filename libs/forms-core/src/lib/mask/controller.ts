import { applyChange } from './apply-change'
import { format, unformat } from './parts'
import type { ApplyChangeInput, MaskInputType, MaskOptions } from './types'

export interface MaskControllerOptions {
  mask: string
  maskOptions?: MaskOptions
  /** Вызывается после каждого закоммиченного изменения значения (включая undo/redo). */
  onChange?: (value: string) => void
  /** Максимальный размер стека undo (по умолчанию 100 записей). */
  historyLimit?: number
}

interface HistoryEntry {
  value: string
  selectionStart: number
  selectionEnd: number
}

interface PendingEdit {
  inputType: string | undefined
  data: string | null
  selectionStart: number
  selectionEnd: number
}

const AUTOFILL_PROBE_CLASS = 'letar-mask-autofill-probe'
const AUTOFILL_ANIMATION_NAME = 'letarMaskAutofillStart'
let autofillStyleInjected = false

/**
 * CSS-механизм детекта автозаполнения (Safari может не прислать `input` на autofill,
 * `animationstart` с `:-webkit-autofill` — единственный надёжный сигнал, MASK_ENGINE.md §6.5).
 * Стиль общий на документ, подключается один раз при первом `attach()`.
 */
function ensureAutofillStyle(): void {
  if (autofillStyleInjected || typeof document === 'undefined') {
    return
  }
  const style = document.createElement('style')
  style.setAttribute('data-letar-mask', 'autofill-probe')
  style.textContent = `
@keyframes ${AUTOFILL_ANIMATION_NAME} { from { opacity: 0.99999; } to { opacity: 1; } }
.${AUTOFILL_PROBE_CLASS}:-webkit-autofill { animation-name: ${AUTOFILL_ANIMATION_NAME}; }
`
  document.head.appendChild(style)
  autofillStyleInjected = true
}

function mapInputType(nativeType: string | undefined): MaskInputType {
  switch (nativeType) {
    case 'deleteContentBackward':
    case 'deleteWordBackward':
    case 'deleteSoftLineBackward':
    case 'deleteEntireSoftLine':
      return 'deleteBackward'
    case 'deleteContentForward':
    case 'deleteWordForward':
    case 'deleteSoftLineForward':
      return 'deleteForward'
    default:
      return 'insert'
  }
}

/**
 * DOM-контроллер маски — события, каретка, undo, автозаполнение. Без React: `attach()`
 * вешает слушатели на реальный `<input>`, `detach()` снимает.
 *
 * Модель событий (MASK_ENGINE.md §6.3): `keydown` не перехватывает символы (только undo-хоткеи
 * и трекинг), `input` с composition-guard — основной путь, `compositionend` — единственная точка
 * применения маски при IME, `beforeinput` — только historyUndo/historyRedo.
 */
export class MaskController {
  private readonly element: HTMLInputElement
  private mask: string
  private readonly maskOptions: MaskOptions | undefined
  private readonly onChange: ((value: string) => void) | undefined
  private readonly historyLimit: number

  private value = ''
  private composing = false
  private pendingEdit: PendingEdit | null = null
  private compositionStart: HistoryEntry | null = null
  private undoStack: HistoryEntry[] = []
  private redoStack: HistoryEntry[] = []
  private attached = false

  constructor(element: HTMLInputElement, options: MaskControllerOptions) {
    this.element = element
    this.mask = options.mask
    this.maskOptions = options.maskOptions
    this.onChange = options.onChange
    this.historyLimit = options.historyLimit ?? 100
  }

  attach(): void {
    if (this.attached) {
      return
    }
    this.attached = true
    ensureAutofillStyle()
    this.element.classList.add(AUTOFILL_PROBE_CLASS)
    this.element.addEventListener('beforeinput', this.handleBeforeInput)
    this.element.addEventListener('input', this.handleInput)
    this.element.addEventListener('compositionstart', this.handleCompositionStart)
    this.element.addEventListener('compositionend', this.handleCompositionEnd)
    this.element.addEventListener('keydown', this.handleKeyDown)
    this.element.addEventListener('animationstart', this.handleAnimationStart)

    this.value = format(unformat(this.element.value, this.mask, this.maskOptions), this.mask, this.maskOptions)
    if (this.element.value !== this.value) {
      this.element.value = this.value
    }

    // Третий механизм детекта автозаполнения (MASK_ENGINE.md §6.5): браузер мог
    // подставить значение ДО того, как контроллер успел на него подписаться.
    queueMicrotask(() => {
      if (this.attached && this.element.value !== this.value) {
        this.commitFullReplace(this.element.value)
      }
    })
  }

  detach(): void {
    if (!this.attached) {
      return
    }
    this.attached = false
    this.element.classList.remove(AUTOFILL_PROBE_CLASS)
    this.element.removeEventListener('beforeinput', this.handleBeforeInput)
    this.element.removeEventListener('input', this.handleInput)
    this.element.removeEventListener('compositionstart', this.handleCompositionStart)
    this.element.removeEventListener('compositionend', this.handleCompositionEnd)
    this.element.removeEventListener('keydown', this.handleKeyDown)
    this.element.removeEventListener('animationstart', this.handleAnimationStart)
  }

  getValue(): string {
    return this.value
  }

  /** Меняет активную маску (например, выбор маски по стране в `Field.Phone`) и переформатирует. */
  setMask(mask: string): void {
    if (this.mask === mask) {
      return
    }
    this.mask = mask
    this.commitFullReplace(this.value)
  }

  /**
   * Программная установка значения извне (гидрация формы, сброс) — полное
   * переформатирование прямым присвоением `.value`, не через `setRangeText`, и
   * не попадает в undo-стек пользователя (это не его правка).
   */
  setValue(raw: string): void {
    const formatted = format(unformat(raw, this.mask, this.maskOptions), this.mask, this.maskOptions)
    this.value = formatted
    if (this.element.value !== formatted) {
      this.element.value = formatted
    }
  }

  private readonly handleBeforeInput = (event: InputEvent): void => {
    if (this.composing) {
      // insertCompositionText не отменяем по спецификации (w3c/input-events#115) —
      // никогда не preventDefault и не трогаем value/каретку здесь.
      return
    }
    if (event.inputType === 'historyUndo') {
      event.preventDefault()
      this.undo()
      return
    }
    if (event.inputType === 'historyRedo') {
      event.preventDefault()
      this.redo()
      return
    }
    this.pendingEdit = {
      inputType: event.inputType,
      data: event.data,
      selectionStart: this.element.selectionStart ?? this.value.length,
      selectionEnd: this.element.selectionEnd ?? this.value.length,
    }
  }

  private readonly handleInput = (event: InputEvent): void => {
    if (this.composing || event.isComposing) {
      return // маска применится в compositionend
    }

    const nativeValue = this.element.value
    const edit = this.pendingEdit
    this.pendingEdit = null

    if (edit === null || edit.inputType === undefined) {
      // Автозаполнение или программная замена без beforeinput — значение заменено целиком
      // (первый механизм детекта автозаполнения, MASK_ENGINE.md §6.5).
      this.commitFullReplace(nativeValue)
      return
    }

    this.commit(this.toApplyChangeInput(edit, nativeValue))
  }

  private readonly handleCompositionStart = (): void => {
    this.composing = true
    this.compositionStart = {
      value: this.value,
      selectionStart: this.element.selectionStart ?? this.value.length,
      selectionEnd: this.element.selectionEnd ?? this.value.length,
    }
  }

  private readonly handleCompositionEnd = (event: CompositionEvent): void => {
    this.composing = false
    this.pendingEdit = null
    const start = this.compositionStart
    this.compositionStart = null
    if (!start) {
      return
    }
    this.commit({
      previousValue: start.value,
      inputType: 'insert',
      addedValue: event.data ?? '',
      changeStart: start.selectionStart,
      changeEnd: start.selectionEnd,
      mask: this.mask,
      options: this.maskOptions,
    })
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    // Запасной путь: не все браузеры шлют beforeinput с historyUndo/historyRedo единообразно.
    const key = event.key.toLowerCase()
    const isUndo = (event.ctrlKey || event.metaKey) && !event.shiftKey && key === 'z'
    const isRedo = (event.ctrlKey || event.metaKey)
      && (key === 'y' || (key === 'z' && event.shiftKey))
    if (isUndo) {
      event.preventDefault()
      this.undo()
    } else if (isRedo) {
      event.preventDefault()
      this.redo()
    }
  }

  private readonly handleAnimationStart = (event: AnimationEvent): void => {
    if (event.animationName !== AUTOFILL_ANIMATION_NAME) {
      return
    }
    // Второй механизм детекта автозаполнения — Safari может не прислать `input` на autofill.
    if (this.element.value !== this.value) {
      this.commitFullReplace(this.element.value)
    }
  }

  private toApplyChangeInput(edit: PendingEdit, nativeValue: string): ApplyChangeInput {
    const inputType = mapInputType(edit.inputType)
    return {
      previousValue: this.value,
      inputType,
      addedValue: inputType === 'insert' ? this.extractAddedValue(edit, nativeValue) : '',
      changeStart: edit.selectionStart,
      changeEnd: edit.selectionEnd,
      mask: this.mask,
      options: this.maskOptions,
    }
  }

  /** `event.data` покрывает большинство insert-вариантов; иначе — диф хвоста против старого значения. */
  private extractAddedValue(edit: PendingEdit, nativeValue: string): string {
    if (edit.data !== null && edit.data !== undefined) {
      return edit.data
    }
    const survivingTail = this.value.slice(edit.selectionEnd)
    if (survivingTail.length <= nativeValue.length && nativeValue.endsWith(survivingTail)) {
      return nativeValue.slice(edit.selectionStart, nativeValue.length - survivingTail.length)
    }
    return ''
  }

  private commitFullReplace(rawlikeValue: string): void {
    this.commit({
      previousValue: this.value,
      inputType: 'insert',
      addedValue: rawlikeValue,
      changeStart: 0,
      changeEnd: this.value.length,
      mask: this.mask,
      options: this.maskOptions,
    })
  }

  private commit(input: ApplyChangeInput): void {
    const before = this.snapshot()
    const result = applyChange(input)
    this.pushHistory(before)
    this.redoStack = []
    this.writeValue(result.value, result.selectionStart, result.selectionEnd)
  }

  private writeValue(value: string, selectionStart: number, selectionEnd: number): void {
    this.value = value
    if (this.element.value !== value) {
      // setRangeText сохраняет нативный undo-стек лучше, чем прямое присвоение .value
      // (MASK_ENGINE.md §3.1) — используется для всех правок, инициированных пользователем.
      this.element.setRangeText(value, 0, this.element.value.length, 'end')
    }
    this.element.setSelectionRange(selectionStart, selectionEnd)
    // Мобильный Chrome иногда сбрасывает каретку сразу после записи — переустанавливаем
    // ещё раз следующим тиком. Не трогаем, если пользователь тем временем выделил всё значение.
    setTimeout(() => {
      if (!this.attached || this.element.value !== value) {
        return
      }
      const allSelected = this.element.selectionStart === 0 && this.element.selectionEnd === value.length
      if (!allSelected) {
        this.element.setSelectionRange(selectionStart, selectionEnd)
      }
    }, 0)
    this.onChange?.(value)
  }

  private snapshot(): HistoryEntry {
    return {
      value: this.value,
      selectionStart: this.element.selectionStart ?? this.value.length,
      selectionEnd: this.element.selectionEnd ?? this.value.length,
    }
  }

  private pushHistory(entry: HistoryEntry): void {
    this.undoStack.push(entry)
    if (this.undoStack.length > this.historyLimit) {
      this.undoStack.shift()
    }
  }

  private undo(): void {
    const entry = this.undoStack.pop()
    if (!entry) {
      return
    }
    this.redoStack.push(this.snapshot())
    this.restore(entry)
  }

  private redo(): void {
    const entry = this.redoStack.pop()
    if (!entry) {
      return
    }
    this.undoStack.push(this.snapshot())
    this.restore(entry)
  }

  private restore(entry: HistoryEntry): void {
    this.value = entry.value
    if (this.element.value !== entry.value) {
      this.element.setRangeText(entry.value, 0, this.element.value.length, 'end')
    }
    this.element.setSelectionRange(entry.selectionStart, entry.selectionEnd)
    this.onChange?.(entry.value)
  }
}
