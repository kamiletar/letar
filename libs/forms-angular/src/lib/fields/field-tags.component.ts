import { Component, effect, Input, signal } from '@angular/core'
import { FieldBase } from '../core/field-base'

/**
 * Тег-инпут — Angular-эквивалент `FieldTags` (`@letar/forms-vue`), значение `string[]`. Enter
 * добавляет тег из черновика, Backspace на пустом черновике удаляет последний тег. Черновик ввода
 * не связан с `FormControl` (сам инпут — не поле формы, только источник текста для следующего
 * тега) — держится в своём сигнале `draft`, как и список тегов `tagsValue`, синхронизируемый через
 * `effect()` + `ctrl.events.subscribe()` (тот же приём, что `FieldListboxComponent`/
 * `FieldCheckboxCardComponent`).
 */
@Component({
  selector: 'letar-field-tags',
  standalone: true,
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        <div class="letar-field__tags" [attr.data-field-name]="name">
          @for (tag of tagsValue(); track tag; let i = $index) {
            <span class="letar-field__tag">
              {{ tag }}
              <button type="button" [attr.aria-label]="'Удалить ' + tag" (click)="removeTag(ctrl, i)">×</button>
            </span>
          }
          <input
            class="letar-field__control letar-field__tags-input"
            [value]="draft()"
            [placeholder]="tagsValue().length === 0 ? resolvedPlaceholder() : undefined"
            (input)="onInput($event)"
            (keydown)="onKeydown($event, ctrl)"
            (blur)="ctrl.markAsTouched()"
          />
        </div>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldTagsComponent extends FieldBase {
  @Input()
  maxTags?: number
  @Input()
  minTagLength = 1

  readonly tagsValue = signal<string[]>([])
  readonly draft = signal('')

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const sync = () => {
        const value = ctrl.value as string[] | undefined
        this.tagsValue.set(Array.isArray(value) ? value : [])
      }
      sync()
      const subscription = ctrl.events.subscribe(sync)
      onCleanup(() => subscription.unsubscribe())
    })
  }

  onInput(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value)
  }

  onKeydown(event: KeyboardEvent, ctrl: { setValue: (value: string[]) => void; markAsTouched: () => void }): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      this.addTag(ctrl)
    }
    if (event.key === 'Backspace' && !this.draft() && this.tagsValue().length > 0) {
      this.removeTag(ctrl, this.tagsValue().length - 1)
    }
  }

  addTag(ctrl: { setValue: (value: string[]) => void; markAsTouched: () => void }): void {
    const trimmed = this.draft().trim()
    if (trimmed.length < this.minTagLength) {
      return
    }
    const current = this.tagsValue()
    if (this.maxTags && current.length >= this.maxTags) {
      return
    }
    if (current.includes(trimmed)) {
      return
    }
    ctrl.setValue([...current, trimmed])
    ctrl.markAsTouched()
    this.draft.set('')
  }

  removeTag(ctrl: { setValue: (value: string[]) => void; markAsTouched: () => void }, index: number): void {
    ctrl.setValue(this.tagsValue().filter((_, i) => i !== index))
    ctrl.markAsTouched()
  }
}
