import { inject, type InjectionKey, provide } from 'vue'
import type { ZodType } from 'zod'

/**
 * Минимальный набор, который нужен полю: инстанс формы (`@tanstack/vue-form`) и Zod-схема
 * (для чтения `.meta({ ui: {...} })` через `@letar/forms-core/schema`, тот же контракт,
 * что использует React-скин).
 */
export interface AppFormContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any
  schema: ZodType
}

const APP_FORM_KEY: InjectionKey<AppFormContext> = Symbol('letar-forms-vue-app-form')

export function provideAppForm(context: AppFormContext): void {
  provide(APP_FORM_KEY, context)
}

/** Бросает, если поле отрендерено вне `<AppForm>` — та же защита, что в React-версии. */
export function useAppFormContext(): AppFormContext {
  const context = inject(APP_FORM_KEY)
  if (!context) {
    throw new Error('[@letar/forms-vue] Компонент поля использован вне <AppForm>')
  }
  return context
}
