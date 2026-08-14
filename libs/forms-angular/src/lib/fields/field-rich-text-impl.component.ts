import { type AfterViewInit, Component, type ElementRef, Input, type OnDestroy, signal, ViewChild } from '@angular/core'
import type { FormControl } from '@angular/forms'
import { type Content, Editor } from '@tiptap/core'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import { FieldBase } from '../core/field-base'
import {
  DEFAULT_RICH_TEXT_BUTTONS,
  RICH_TEXT_ACTIONS,
  RICH_TEXT_BUTTON_LABELS,
  type RichTextButton,
} from '../core/rich-text-actions'

/** Headless-пакет не тянет иконку-либу — кнопки на текстовых глифах, как `FieldRating` (★/☆) и Vue-версия. */
const GLYPH: Record<RichTextButton, string> = {
  bold: 'B',
  italic: 'I',
  underline: 'U',
  strike: 'S',
  code: '{}',
  heading1: 'H1',
  heading2: 'H2',
  heading3: 'H3',
  bulletList: '•',
  orderedList: '1.',
  blockquote: '❝',
  link: '🔗',
  undo: '↶',
  redo: '↷',
}

function toCssSize(value: string | number | undefined): string | undefined {
  if (value === undefined) {
    return undefined
  }
  return typeof value === 'number' ? `${value}px` : value
}

/** Безопасный парсинг JSON-содержимого Tiptap — не роняет редактор на битом значении из БД. */
function safeParseJSON(value: string): Content {
  try {
    return JSON.parse(value) as Content
  } catch {
    console.warn('FieldRichText: некорректный JSON, используется пустой документ')
    return ''
  }
}

/**
 * FieldRichText (Angular) — реальная реализация WYSIWYG-редактора, подгружаемая лениво из
 * `field-rich-text.component.ts` (см. архитектурный комментарий там). Не импортируется напрямую
 * из `index.ts` — экспортируется только тип `RichTextButton` через обёртку.
 *
 * Использует `@tiptap/core` напрямую (не `@tiptap/vue-3`/`@tiptap/react` — у Tiptap нет
 * официального Angular-биндинга), в отличие от `field-rich-text-impl.ts` (`@letar/forms-vue`).
 * `Editor` из `@tiptap/core` framework-agnostic: конструктору достаточно передать DOM-узел
 * (`element`) — он монтирует `contenteditable` сам, без обёрточного компонента пакета.
 * Управляемое Angular-состояние (активность кнопок тулбара) не эмитится реактивно самим Tiptap —
 * `onTransaction` инкрементирует сигнал-«тик» (`editorTick`), от которого читает `isActive()`;
 * тот же приём, что `FieldBase.hasError`/`errorMessage` используют `ctrl.events.subscribe()`
 * вместо computed напрямую от `control()`.
 *
 * Синхронизация с внешними изменениями `FormControl.value` (программный reset формы) —
 * `ctrl.valueChanges`, порт `watch(options.getValue, ...)` из `use-rich-text-field.ts` (Vue):
 * пропускается, если содержимое фактически не изменилось (не тревожит курсор).
 */
@Component({
  selector: 'letar-field-rich-text-impl',
  standalone: true,
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        <div class="letar-field__richtext" [attr.data-field-name]="name" (focusout)="ctrl.markAsTouched()">
          @if (showToolbar) {
            <div class="letar-field__richtext-toolbar" role="toolbar">
              @for (button of toolbarButtons; track button) {
                <button
                  type="button"
                  class="letar-field__richtext-btn"
                  [attr.aria-label]="buttonLabels[button]"
                  [attr.aria-pressed]="isActive(button)"
                  [attr.data-active]="isActive(button)"
                  (click)="runAction(button)"
                >{{ glyph[button] }}</button>
              }
            </div>
          }
          <div
            #contentEl
            class="letar-field__richtext-content"
            [style.minHeight]="cssMinHeight()"
            [style.maxHeight]="cssMaxHeight()"
            [style.overflowY]="maxHeight ? 'auto' : null"
          ></div>
        </div>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldRichTextImplComponent extends FieldBase implements AfterViewInit, OnDestroy {
  @Input()
  minHeight: string | number = '150px'
  @Input()
  maxHeight?: string | number
  @Input()
  showToolbar = true
  @Input()
  toolbarButtons: RichTextButton[] = DEFAULT_RICH_TEXT_BUTTONS
  @Input()
  outputFormat: 'html' | 'json' = 'html'

  @ViewChild('contentEl')
  private readonly contentRef?: ElementRef<HTMLDivElement>

  protected readonly glyph = GLYPH
  protected readonly buttonLabels = RICH_TEXT_BUTTON_LABELS
  private readonly editorTick = signal(0)

  private editor?: Editor
  private valueSubscription?: { unsubscribe: () => void }

  ngAfterViewInit(): void {
    const ctrl = this.control()
    const host = this.contentRef?.nativeElement
    if (!ctrl || !host) {
      return
    }
    this.initEditor(ctrl, host)
  }

  ngOnDestroy(): void {
    this.valueSubscription?.unsubscribe()
    this.editor?.destroy()
  }

  private initEditor(ctrl: FormControl, host: HTMLDivElement): void {
    const initial = (ctrl.value as string | undefined) ?? ''

    this.editor = new Editor({
      element: host,
      extensions: [
        StarterKit.configure({
          link: { openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } },
        }),
        Placeholder.configure({ placeholder: this.resolvedPlaceholder() ?? 'Начните вводить текст...' }),
      ],
      content: this.outputFormat === 'json' && initial ? safeParseJSON(initial) : initial,
      onUpdate: ({ editor }) => {
        ctrl.setValue(this.outputFormat === 'json' ? JSON.stringify(editor.getJSON()) : editor.getHTML())
      },
      onTransaction: () => this.editorTick.update((v) => v + 1),
    })
    this.editorTick.set(1)

    this.valueSubscription = ctrl.valueChanges.subscribe((value: string) => {
      const instance = this.editor
      if (!instance) {
        return
      }
      const currentContent = this.outputFormat === 'json' ? JSON.stringify(instance.getJSON()) : instance.getHTML()
      if (value !== currentContent) {
        const content = this.outputFormat === 'json' && value ? safeParseJSON(value) : value || ''
        instance.commands.setContent(content, { emitUpdate: false })
      }
    })
  }

  protected isActive(button: RichTextButton): boolean {
    this.editorTick()
    if (!this.editor) {
      return false
    }
    return RICH_TEXT_ACTIONS[button].isActive?.(this.editor) ?? false
  }

  protected runAction(button: RichTextButton): void {
    if (!this.editor) {
      return
    }
    RICH_TEXT_ACTIONS[button].run(this.editor)
  }

  protected cssMinHeight(): string | undefined {
    return toCssSize(this.minHeight)
  }

  protected cssMaxHeight(): string | undefined {
    return toCssSize(this.maxHeight)
  }
}
