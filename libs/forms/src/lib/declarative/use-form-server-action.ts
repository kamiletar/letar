'use client'

/** Реализация — в `@letar/forms-react` (framework-free относительно UI-скина, работает
 * одинаково поверх Chakra и shadcn — здесь только реэкспорт под публичный путь `@letar/forms`,
 * которым сейчас пользуется единственный потребитель — declarative `<Form>` этого пакета). */
export { useFormServerAction } from '@letar/forms-react'
export type { FormServerActionToaster, UseFormServerActionOptions, UseFormServerActionResult } from '@letar/forms-react'
