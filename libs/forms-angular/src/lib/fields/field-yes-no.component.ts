import { Component } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { FieldBase } from '../core/field-base'

/**
 * Boolean-поле как два кликабельных блока (`role="radio"`) — Angular-эквивалент `FieldYesNo`
 * (`@letar/forms-vue`). Не нативный `<input type="radio">` (у него value — строка, а нужен
 * `boolean` в контроле): значение выставляется напрямую через `ctrl.setValue(...)`
 * (`markAsTouched`/`markAsDirty` — вручную, у клика по `div` нет собственного `blur`/`change`,
 * которые обычно помечают контрол тронутым).
 */
@Component({
  selector: 'letar-field-yes-no',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (control(); as ctrl) {
      <div class="letar-field letar-field--yes-no">
        <span class="letar-field__label">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</span>
        <div class="letar-field__yes-no-options">
          <div
            role="radio"
            tabindex="0"
            [attr.aria-checked]="ctrl.value === true"
            (click)="select(ctrl, true)"
            (keydown.enter)="select(ctrl, true)"
          >
            Да
          </div>
          <div
            role="radio"
            tabindex="0"
            [attr.aria-checked]="ctrl.value === false"
            (click)="select(ctrl, false)"
            (keydown.enter)="select(ctrl, false)"
          >
            Нет
          </div>
        </div>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldYesNoComponent extends FieldBase {
  protected select(
    ctrl: { setValue: (v: boolean) => void; markAsTouched: () => void; markAsDirty: () => void },
    value: boolean,
  ): void {
    ctrl.setValue(value)
    ctrl.markAsTouched()
    ctrl.markAsDirty()
  }
}
