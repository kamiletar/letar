import type { DependentsRegistry } from '@letar/forms-core/uikit'
import { inject, type InjectionKey, onBeforeUnmount, provide, watch } from 'vue'
import type { ZodType } from 'zod'

/**
 * Минимальный набор, который нужен полю: инстанс формы (`@tanstack/vue-form`) и Zod-схема
 * (для чтения `.meta({ ui: {...} })` через `@letar/forms-core/schema`, тот же контракт,
 * что использует React-скин).
 *
 * `dependents`/`labels` — добавлены для `dependsOn` (§18, Stage 3c `forms-vue-shadcn`): один
 * реестр очистки зависимых полей на форму и реактивная карта видимых подписей полей
 * (`fullPath → label`), по которой зависимое поле находит подпись родителя для подсказки
 * «Сначала выберите «Страна»». В React-версии та же роль — `useDeclarativeFormOptional()` плюс
 * отдельный WeakMap-реестр в `@letar/forms-react` (`field-labels.ts`); здесь она встроена прямо
 * в `AppFormContext`, поскольку `@letar/forms-vue` не имеет отдельного «декларативного» слоя форм.
 */
export interface AppFormContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any
  schema: ZodType
  dependents: DependentsRegistry
  labels: Map<string, string>
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

/**
 * Регистрирует видимую подпись поля в `labels` формы — вызывать из `setup()` каждого поля со
 * своим `fullPath` и уже разрешённым `label` (после подстановки `ui.title`, как у `resolved.label`
 * в остальных полях). Vue-эквивалент React `useRegisterFieldLabel` (`@letar/forms-react`,
 * `field-labels.ts`), но без отдельного WeakMap-реестра с версией: `labels` уже реактивна сама по
 * себе (обычный `Map`, прокинутый через `provide`/`inject`), поэтому читатель (`labels.get(path)`
 * внутри `computed`) видит правки без ручного `useSyncExternalStore`.
 *
 * Только строковые подписи — узел (`ReactNode`-подобное значение) в подсказку не годится, у Vue-скина
 * `label` и так всегда `string | undefined` (см. `FieldSelectOption`/пропы полей).
 */
export function useRegisterFieldLabel(
  labels: Map<string, string>,
  path: string,
  label: () => string | undefined,
): void {
  let registered: string | undefined
  const stop = watch(
    label,
    (next) => {
      if (registered !== undefined && labels.get(path) === registered) {
        labels.delete(path)
      }
      registered = next && next.trim() !== '' ? next : undefined
      if (registered !== undefined) {
        labels.set(path, registered)
      }
    },
    { immediate: true },
  )
  onBeforeUnmount(() => {
    stop()
    if (registered !== undefined && labels.get(path) === registered) {
      labels.delete(path)
    }
  })
}
