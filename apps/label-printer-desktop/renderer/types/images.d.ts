/**
 * Типы для статического импорта изображений (`import logo from './x.png'`).
 *
 * В норме их даёт next-env.d.ts (триплет-слэш на next/image-types/global), но этот файл
 * генерируется `next dev`/`next build` и не коммитится (.gitignore) — на свежем чекауте
 * (CI гоняет только typecheck:tsgo, без next build) next-env.d.ts не существует, и TS падает
 * TS2307 на любом `import ... from '*.png'`. Дублируем нужную декларацию закоммиченным файлом.
 */
declare module '*.png' {
  const content: { src: string; height: number; width: number; blurDataURL?: string }
  export default content
}
