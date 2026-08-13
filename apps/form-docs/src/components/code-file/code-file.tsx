import { HighlightedCode } from './highlighted-code'
import { readExampleFile } from './read-example-file'

export interface CodeFileProps {
  /** Путь к файлу-примеру относительно корня монорепо, напр. "apps/form-develop-app/src/app/select-demo/page.tsx" */
  path: string
  title?: string
  lang?: string
}

/**
 * Читает пример кода с диска на сборке и рендерит подсвеченным code-block'ом.
 *
 * Единый источник кода примера (P7 PLAN.md, Этап 0/1) — вместо копипасты tsx-блока в MDX,
 * блок читается напрямую из sandbox-приложения (`form-develop-app`/`form-develop-app-shadcn`/
 * `libs/forms-vue-shadcn/demo`), исключая рассинхрон между доками и живым демо.
 */
export async function CodeFile({ path, title, lang }: CodeFileProps) {
  const code = readExampleFile(path)
  return <HighlightedCode code={code} lang={lang} title={title ?? path} />
}
