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
  title?: string
  lang?: string
}

/**
 * Пример кода, переключаемый по оси Skin (Chakra ↔ shadcn) — оба варианта читаются
 * с диска на сборке (`CodeFile`) и оба присутствуют в HTML; переключатель только
 * показывает/прячет через CSS (P7 PLAN.md, Этап 1).
 */
export async function SkinCodeFile({ chakra, shadcn, title, lang }: SkinCodeFileProps) {
  const chakraNode = await CodeFile({ path: chakra, title: title ? `${title} — Chakra UI` : undefined, lang })
  const shadcnNode = shadcn
    ? await CodeFile({ path: shadcn, title: title ? `${title} — shadcn/ui` : undefined, lang })
    : null

  return <SkinCodeSwitcher chakra={chakraNode} shadcn={shadcnNode} />
}
