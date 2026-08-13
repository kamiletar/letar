import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms'
import type { ZodType } from 'zod'

/**
 * Angular `ValidatorFn` поверх Zod-подсхемы поля — нативный примитив Reactive Forms
 * (`FormControl(value, [validators])`), не имитация `@tanstack/angular-form`. Тот же контракт,
 * что `withFieldValidation` в `@letar/forms-vue` (`field-wiring.ts`), но выражен через
 * Angular-native `ValidationErrors | null`, а не через `onChange`-колбэк TanStack Form.
 *
 * Ошибка кладётся под ключ `zod`, `message` — первая ошибка `safeParse().error.issues`
 * (тот же порядок извлечения, что у Vue-версии: `issues[0]?.message`).
 */
export function zodValidator(schema: ZodType | undefined): ValidatorFn | undefined {
  if (!schema) {
    return undefined
  }

  return (control: AbstractControl): ValidationErrors | null => {
    const result = schema.safeParse(control.value)
    if (result.success) {
      return null
    }
    const message = result.error.issues[0]?.message ?? 'Некорректное значение'
    return { zod: { message } }
  }
}
