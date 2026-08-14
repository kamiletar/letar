import { Component, effect, Input, type OnInit, signal } from '@angular/core'
import type { FormControl } from '@angular/forms'
import { FieldBase } from '../core/field-base'

/**
 * Инлайн-редактирование — Angular-эквивалент `FieldEditable` (`@letar/forms-vue`,
 * `field-editable.ts`). Клик по превью переключает в режим редактирования; Enter/`submitOnBlur`
 * (по умолчанию `true`) коммитят значение, Escape отменяет несохранённый черновик и возвращает
 * превью. `activationMode` — только `'click'` (по умолчанию) и `'none'` (поле сразу в режиме
 * редактирования, превью недостижимо), тот же урезанный набор, что в Vue-версии.
 *
 * `draft` — локальный сигнал черновика, отдельный от `value` (текущее значение `FormControl`):
 * Escape должен откатить непринятый ввод, не трогая уже сохранённое значение контрола — то же
 * разделение "черновик vs подтверждённое значение", что у `FieldTagsComponent`.
 */
@Component({
  selector: 'letar-field-editable',
  standalone: true,
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        @if (resolvedLabel()) {
          <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        }
        @if (!isEditing()) {
          <button
            type="button"
            class="letar-field__editable-preview"
            [attr.data-field-name]="name"
            (click)="startEditing()"
          >{{ value() || resolvedPlaceholder() || 'Нажмите для редактирования' }}</button>
        } @else if (multiline) {
          <textarea
            class="letar-field__control"
            rows="3"
            [attr.data-field-name]="name"
            [value]="draft()"
            [placeholder]="resolvedPlaceholder() ?? ''"
            (input)="onInput($event)"
            (blur)="onBlur(ctrl)"
            (keydown)="onKeydown($event, ctrl)"
          ></textarea>
        } @else {
          <input
            type="text"
            class="letar-field__control"
            [attr.data-field-name]="name"
            [value]="draft()"
            [placeholder]="resolvedPlaceholder() ?? ''"
            (input)="onInput($event)"
            (blur)="onBlur(ctrl)"
            (keydown)="onKeydown($event, ctrl)"
          />
        }
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldEditableComponent extends FieldBase implements OnInit {
  @Input()
  multiline = false
  @Input()
  activationMode: 'click' | 'none' = 'click'
  @Input()
  submitOnBlur = true

  readonly value = signal('')
  readonly draft = signal('')
  readonly isEditing = signal(false)

  constructor() {
    super()
    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const sync = () => this.value.set((ctrl.value as string | undefined) ?? '')
      sync()
      const subscription = ctrl.events.subscribe(sync)
      onCleanup(() => subscription.unsubscribe())
    })
  }

  ngOnInit(): void {
    this.isEditing.set(this.activationMode === 'none')
  }

  protected startEditing(): void {
    if (this.activationMode === 'none') {
      return
    }
    this.draft.set(this.value())
    this.isEditing.set(true)
  }

  protected onInput(event: Event): void {
    this.draft.set((event.target as HTMLInputElement | HTMLTextAreaElement).value)
  }

  protected onBlur(ctrl: FormControl): void {
    if (this.submitOnBlur) {
      this.commit(ctrl)
    }
  }

  protected onKeydown(event: KeyboardEvent, ctrl: FormControl): void {
    if (event.key === 'Enter' && !this.multiline) {
      this.commit(ctrl)
    }
    if (event.key === 'Escape') {
      this.draft.set(this.value())
      this.isEditing.set(this.activationMode === 'none')
      ctrl.markAsTouched()
    }
  }

  private commit(ctrl: FormControl): void {
    ctrl.setValue(this.draft())
    ctrl.markAsTouched()
    if (this.activationMode !== 'none') {
      this.isEditing.set(false)
    }
  }
}
