import { Component, EventEmitter, inject, Input, type OnChanges, Output } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import type { ZodType } from 'zod'
import { FormRootService } from './form-root.service'

/**
 * Angular-эквивалент `<AppForm schema={...} initialValue={...} onSubmit={...}>` (`@letar/forms-vue`,
 * `app-form.ts`) — но заводит не `@tanstack/vue-form`, а нативный Angular `FormGroup`
 * (`@angular/forms`, Reactive Forms). `providers: [FormRootService]` — ключевая строка: она
 * делает сервис видимым содержимому, спроецированному через `<ng-content>`
 * (Angular `providers` видны content children, в отличие от `viewProviders` — см. комментарий
 * в `form-root.service.ts`).
 *
 * ⚠️ Находка разведки: `@Input()`/`@Output()` (legacy-декораторы), не `input()`/`output()`
 * (сигнальные initializer API). В JIT-режиме (без `ngtsc`/AOT, ровно наш случай — компиляция
 * "на лету" из `@angular/compiler`) сигнальные inputs на **компоненте, потребляемом другим
 * standalone-компонентом через property binding** (`[schema]="..."`) не резолвятся:
 * `NG0303: Can't bind to 'schema' since it isn't a known property`. Внутри самого поля сигналы
 * (`computed`/`effect`, `FieldBase`) работают нормально — проблема именно в JIT-извлечении
 * метаданных `inputs`/`outputs` из initializer API на границе компонента. Legacy-декораторы —
 * самый обкатанный путь, обходит эту находку целиком.
 *
 * Skin здесь нет по тому же принципу, что у `@letar/forms-vue` — этот пакет доказывает границу
 * `forms-core`, не поставляет дизайн-систему.
 */
@Component({
  selector: 'letar-app-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  providers: [FormRootService],
  template: `
    <form [formGroup]="formRoot.form" (ngSubmit)="handleSubmit()">
      <ng-content />
    </form>
  `,
})
export class AppFormComponent implements OnChanges {
  @Input({ required: true })
  schema!: ZodType
  @Input({ required: true })
  initialValue!: Record<string, unknown>
  @Output()
  readonly formSubmit = new EventEmitter<Record<string, unknown>>()

  protected readonly formRoot = inject(FormRootService)

  /**
   * `ngOnChanges` — не конструктор: Angular гарантирует `@Input()` заполненными к этому моменту
   * (для legacy-декораторов это документированное поведение, в отличие от `NG0950` у сигнальных
   * required-inputs при чтении в конструкторе, см. `field-base.ts`).
   */
  ngOnChanges(): void {
    this.formRoot.initialValue = this.initialValue
    this.formRoot.schema.set(this.schema)
  }

  protected handleSubmit(): void {
    this.formSubmit.emit(this.formRoot.form.getRawValue())
  }
}
