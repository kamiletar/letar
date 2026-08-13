import { CodeFile } from '@/components/code-file/code-file'
import { SkinCodeSwitcher } from './skin-code-switcher'

export interface SkinCodeFileProps {
  /** Путь к файлу-примеру Chakra-скина относительно корня монорепо (form-develop-app) */
  chakra: string
  /**
   * Путь к файлу-примеру shadcn-скина относительно корня монорепо (form-develop-app-shadcn).
   * Не указан → вкладка shadcn рисуется disabled с пометкой (решение 5, P7 PLAN.md), а не
   * молча подставляет Chakra-вариант.
   */
  shadcn?: string
  /**
   * Путь к Vue-примеру относительно корня монорепо (`libs/forms-vue-shadcn/demo/examples/*.ts`,
   * Фаза 9). Не указан → вкладка Vue рисуется disabled с пометкой — ось включается только там,
   * где живой код уже есть, не мигрирует все страницы разом.
   */
  vue?: string
  /**
   * Путь к Angular-примеру относительно корня монорепо (`libs/forms-angular/demo/examples/*.ts`,
   * Фаза 10). Та же логика, что у `vue` — не указан → disabled-вкладка с пометкой.
   */
  angular?: string
  title?: string
  lang?: string
}

/**
 * Пример кода, переключаемый по осям Framework (React ↔ Vue ↔ Angular) и Skin (Chakra ↔ shadcn)
 * — все варианты читаются с диска на сборке (`CodeFile`) и присутствуют в HTML; переключатель
 * только показывает/прячет через CSS (P7 PLAN.md, Этап 1/2/3).
 */
export async function SkinCodeFile({ chakra, shadcn, vue, angular, title, lang }: SkinCodeFileProps) {
  const chakraNode = await CodeFile({ path: chakra, title: title ? `${title} — Chakra UI` : undefined, lang })
  const shadcnNode = shadcn
    ? await CodeFile({ path: shadcn, title: title ? `${title} — shadcn/ui` : undefined, lang })
    : null
  const vueNode = vue
    ? await CodeFile({ path: vue, title: title ? `${title} — Vue` : undefined, lang: lang ?? 'ts' })
    : null
  const angularNode = angular
    ? await CodeFile({ path: angular, title: title ? `${title} — Angular` : undefined, lang: lang ?? 'ts' })
    : null

  return <SkinCodeSwitcher chakra={chakraNode} shadcn={shadcnNode} vue={vueNode} angular={angularNode} />
}
