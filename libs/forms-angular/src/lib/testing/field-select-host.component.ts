import { Component } from '@angular/core'
import { z } from 'zod'
import { AppFormComponent } from '../core/app-form.component'
import { FieldSelectComponent, type FieldSelectOption } from '../fields/field-select.component'

/**
 * Хосты для точечных тестов `FieldSelectComponent` (Этап 3g, `field-select.spec.ts`) — тот же
 * приём выноса `@Component` в обычный `.ts` (не `.spec.ts`), что и `stage-e-host.component.ts`:
 * JIT-декоратор внутри `.spec.ts` не парсится текущей связкой esbuild/vitest этого пакета.
 */
export const fieldSelectHostSchema = z.object({ country: z.string().meta({ ui: { title: 'Страна' } }) })

export const fieldSelectHostOptions: FieldSelectOption[] = [
  { value: '', label: 'Все категории' },
  { value: 'ru', label: 'Россия', description: 'Российская Федерация' },
  { value: 'de', label: 'Германия' },
]

/** Без опции с пустым значением — для теста реального placeholder (текущее значение '' ни с чем не совпадает) */
export const fieldSelectHostOptionsNoEmpty: FieldSelectOption[] = [
  { value: 'ru', label: 'Россия' },
  { value: 'de', label: 'Германия' },
]

@Component({
  standalone: true,
  imports: [AppFormComponent, FieldSelectComponent],
  template: `
    <letar-app-form [schema]="schema" [initialValue]="{ country: '' }" (formSubmit)="lastSubmit = $event">
      <letar-field-select name="country" [options]="options" placeholder="Выберите страну" />
    </letar-app-form>
  `,
})
export class FieldSelectBasicHostComponent {
  schema = fieldSelectHostSchema
  options = fieldSelectHostOptions
  lastSubmit: Record<string, unknown> | undefined
}

@Component({
  standalone: true,
  imports: [AppFormComponent, FieldSelectComponent],
  template: `
    <letar-app-form [schema]="schema" [initialValue]="{ country: '' }" (formSubmit)="lastSubmit = $event">
      <letar-field-select name="country" [options]="options" placeholder="Выберите страну">
        <ng-template #optionTemplate let-option let-state="state">
          <b class="custom-option" [class.is-active]="state.active">{{ option.label }} #{{ option.value }}</b>
        </ng-template>
        <ng-template #valueTemplate let-option>
          <i class="custom-value">Выбрано: {{ option.label }}</i>
        </ng-template>
      </letar-field-select>
    </letar-app-form>
  `,
})
export class FieldSelectCustomRenderHostComponent {
  schema = fieldSelectHostSchema
  options = fieldSelectHostOptions
  lastSubmit: Record<string, unknown> | undefined
}

@Component({
  standalone: true,
  imports: [AppFormComponent, FieldSelectComponent],
  template: `
    <letar-app-form [schema]="schema" [initialValue]="{ country: '' }" (formSubmit)="lastSubmit = $event">
      <letar-field-select name="country" [options]="options" placeholder="Выберите страну" />
    </letar-app-form>
  `,
})
export class FieldSelectNoEmptyOptionHostComponent {
  schema = fieldSelectHostSchema
  options = fieldSelectHostOptionsNoEmpty
  lastSubmit: Record<string, unknown> | undefined
}
