import { closeHistory, history, redo, redoDepth, undo, undoDepth } from '@tiptap/pm/history'
import { EditorState, TextSelection } from '@tiptap/pm/state'
import { Editor, Extension, Node } from '@tiptap/react'

export interface PlainTextSelection {
  from: number
  to: number
  textBefore: string
  textSelected: string
  textAfter: string
}
export interface PlainTextHistoryState {
  canUndo: boolean
  canRedo: boolean
  undoDepth: number
  redoDepth: number
}
export interface PlainTextTransaction {
  before: string
  after: string
  selectionBefore: PlainTextSelection
  selectionAfter: PlainTextSelection
  origin: 'input' | 'insert' | 'external' | 'undo' | 'redo' | 'baseline'
  undoDepthBefore: number
  undoDepthAfter: number
  redoDepthAfter: number
}
export interface PlainTextEditorHandle {
  getText(): string
  getSelection(): PlainTextSelection
  setSelection(from: number, to?: number): void
  insertText(text: string): boolean
  replaceText(text: string, options?: { baseline?: boolean }): void
  focus(): void
  undo(): boolean
  redo(): boolean
  canUndo(): boolean
  canRedo(): boolean
  breakHistory(): void
  captureSession(): unknown
  restoreSession(session: unknown): boolean
}
export interface PlainTextController extends PlainTextEditorHandle {
  setEditable(editable: boolean): void
  setAttributes(attributes: Record<string, string>): void
  destroy(): void
}
export interface PlainTextControllerOptions {
  element: HTMLElement
  text?: string
  editable?: boolean
  attributes?: Record<string, string>
  historyDepth?: number
  onChange?: (text: string) => void
  onBlur?: () => void
  onHistoryChange?: (state: PlainTextHistoryState) => void
  onTransaction?: (transaction: PlainTextTransaction) => void
  onKeyboardHistory?: (direction: 'undo' | 'redo') => void
}

const normalize = (text: string) => text.replace(/\r\n?/g, '\n')
const content = (text: string) => ({
  type: 'doc',
  content: [{ type: 'plainText', ...(text ? { content: [{ type: 'text', text }] } : {}) }],
})
// Токены действуют только в текущем JS-процессе: в JSON/localStorage попадать не должны.
const sessions = new WeakSet<object>()
function selection(text: string, from: number, to: number): PlainTextSelection {
  const start = Math.max(0, Math.min(text.length, from))
  const end = Math.max(start, Math.min(text.length, to))
  return {
    from: start,
    to: end,
    textBefore: text.slice(0, start),
    textSelected: text.slice(start, end),
    textAfter: text.slice(end),
  }
}

/** Одна текстовая нода: HTML и блоковое форматирование отсутствуют в схеме документа. */
export function createPlainTextController(options: PlainTextControllerOptions): PlainTextController {
  // eslint-disable-next-line prefer-const -- События конструктора проверяют ещё не назначенный экземпляр.
  let editor: Editor
  let origin: PlainTextTransaction['origin'] = 'input'
  let composing = false
  let compositionBefore: { text: string; selection: PlainTextSelection; depth: number } | null = null
  let previousText = normalize(options.text ?? '')
  let previousSelection = selection(previousText, 0, 0)
  let previousDepth = 0
  const getSelection = () =>
    selection(editor.state.doc.textContent, editor.state.selection.from - 1, editor.state.selection.to - 1)
  const publishHistory = () =>
    options.onHistoryChange?.({
      canUndo: undoDepth(editor.state) > 0,
      canRedo: redoDepth(editor.state) > 0,
      undoDepth: undoDepth(editor.state),
      redoDepth: redoDepth(editor.state),
    })
  const publish = () => {
    const nextText = editor.state.doc.textContent
    const nextSelection = getSelection()
    const depth = undoDepth(editor.state)
    if (!composing && nextText !== previousText) {
      options.onChange?.(nextText)
      options.onTransaction?.({
        before: previousText,
        after: nextText,
        selectionBefore: previousSelection,
        selectionAfter: nextSelection,
        origin,
        undoDepthBefore: previousDepth,
        undoDepthAfter: depth,
        redoDepthAfter: redoDepth(editor.state),
      })
    }
    if (!composing) {
      previousText = nextText
      previousSelection = nextSelection
      previousDepth = depth
      publishHistory()
    }
  }
  const runHistory = (direction: 'undo' | 'redo') => {
    if (composing || !editor.isEditable) { return false }
    origin = direction
    const result = (direction === 'undo' ? undo : redo)(editor.state, editor.view.dispatch, editor.view)
    origin = 'input'
    return result
  }
  const keyboardHistory = (direction: 'undo' | 'redo') => {
    if (options.onKeyboardHistory) {
      options.onKeyboardHistory(direction)
      return true
    }
    return runHistory(direction)
  }
  const depth = Math.max(1, Math.min(100, options.historyDepth ?? 50))
  const documentNode = Node.create({ name: 'doc', topNode: true, content: 'plainText' })
  const textNode = Node.create({ name: 'text', group: 'inline' })
  const bodyNode = Node.create({
    name: 'plainText',
    content: 'text*',
    group: 'block',
    code: true,
    whitespace: 'pre',
    marks: '',
    defining: true,
    parseHTML: () => [{ tag: 'div[data-plain-text]' }],
    renderHTML: () => ['div', { 'data-plain-text': '' }, 0],
  })
  const editing = Extension.create({
    name: 'plainTextEditing',
    addProseMirrorPlugins: () => [history({ depth, newGroupDelay: 500 })],
    addKeyboardShortcuts: () => ({
      Enter: () => {
        editor.view.dispatch(editor.state.tr.insertText('\n'))
        return true
      },
      'Shift-Enter': () => {
        editor.view.dispatch(editor.state.tr.insertText('\n'))
        return true
      },
      'Mod-z': () => keyboardHistory('undo'),
      'Mod-Shift-z': () => keyboardHistory('redo'),
      'Mod-y': () => keyboardHistory('redo'),
    }),
  })
  const breakHistory = () => editor.view.dispatch(closeHistory(editor.state.tr))
  const insertText = (text: string) => {
    if (composing || !editor.isEditable) { return false }
    origin = 'insert'
    editor.view.dispatch(closeHistory(editor.state.tr).insertText(normalize(text)))
    breakHistory()
    origin = 'input'
    return true
  }
  editor = new Editor({
    element: options.element,
    extensions: [documentNode, textNode, bodyNode, editing],
    content: content(previousText),
    editable: options.editable ?? true,
    enableInputRules: false,
    enablePasteRules: false,
    editorProps: {
      attributes: { role: 'textbox', 'aria-multiline': 'true', ...options.attributes },
      handlePaste: (_view, event) => {
        if (!event.clipboardData) { return false }
        event.preventDefault()
        return insertText(event.clipboardData.getData('text/plain'))
      },
      handleDrop: (_view, event) => {
        // Внешнее перетаскивание не превращает HTML/файлы в разметку.
        event.preventDefault()
        return true
      },
      handleDOMEvents: {
        beforeinput: (_view, event) => {
          if (
            !composing && editor.isEditable
            && (event.inputType === 'insertParagraph' || event.inputType === 'insertLineBreak')
          ) {
            event.preventDefault()
            editor.view.dispatch(editor.state.tr.insertText('\n'))
            return true
          }
          if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
            event.preventDefault()
            keyboardHistory(event.inputType === 'historyUndo' ? 'undo' : 'redo')
            return true
          }
          return false
        },
        compositionstart: () => {
          composing = true
          compositionBefore = { text: previousText, selection: previousSelection, depth: previousDepth }
          return false
        },
        compositionend: () => {
          composing = false
          queueMicrotask(() => {
            if (editor.isDestroyed) { return }
            if (compositionBefore) {
              previousText = compositionBefore.text
              previousSelection = compositionBefore.selection
              previousDepth = compositionBefore.depth
              compositionBefore = null
            }
            publish()
          })
          return false
        },
      },
    },
    onTransaction: () => {
      if (editor) { publish() }
    },
    onBlur: options.onBlur,
  })
  publishHistory()
  return {
    getText: () => editor.state.doc.textContent,
    getSelection,
    setSelection(from, to = from) {
      const range = selection(editor.state.doc.textContent, from, to)
      editor.view.dispatch(
        editor.state.tr.setSelection(TextSelection.create(editor.state.doc, range.from + 1, range.to + 1)),
      )
    },
    insertText,
    replaceText(text, replaceOptions) {
      const next = normalize(text)
      if (replaceOptions?.baseline) {
        const doc = editor.schema.nodeFromJSON(content(next))
        editor.view.updateState(EditorState.create({ schema: editor.schema, doc, plugins: editor.state.plugins }))
        origin = 'baseline'
        publish()
        origin = 'input'
      } else if (next !== editor.state.doc.textContent && !composing) {
        origin = 'external'
        editor.view.dispatch(closeHistory(editor.state.tr).insertText(next, 1, editor.state.doc.content.size - 1))
        breakHistory()
        origin = 'input'
      }
    },
    undo: () => runHistory('undo'),
    redo: () => runHistory('redo'),
    canUndo: () => undoDepth(editor.state) > 0,
    canRedo: () => redoDepth(editor.state) > 0,
    breakHistory,
    captureSession() {
      const token = Object.freeze({ state: editor.state })
      sessions.add(token)
      return token
    },
    restoreSession(session) {
      if (composing || !session || typeof session !== 'object' || !sessions.has(session)) { return false }
      const captured = session as { state: EditorState }
      if (captured.state.doc.childCount !== 1 || captured.state.doc.firstChild?.type.name !== 'plainText') {
        return false
      }
      // История хранит Steps/Slices с NodeType исходной схемы. Используем ту же схему,
      // но плагины/замыкания нового экземпляра, чтобы не обращаться к уничтоженному view.
      const state = captured.state.reconfigure({ plugins: editor.state.plugins })
      editor.schema = state.schema
      editor.extensionManager.schema = state.schema
      editor.view.updateState(state)
      previousText = state.doc.textContent
      previousSelection = getSelection()
      previousDepth = undoDepth(state)
      options.onChange?.(previousText)
      publishHistory()
      return true
    },
    focus: () => editor.view.focus(),
    setEditable: (editable) => editor.setEditable(editable),
    setAttributes: (attributes) =>
      editor.setOptions({
        editorProps: {
          ...editor.options.editorProps,
          attributes: { role: 'textbox', 'aria-multiline': 'true', ...attributes },
        },
      }),
    destroy: () => editor.destroy(),
  }
}
