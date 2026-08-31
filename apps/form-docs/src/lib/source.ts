import { docs } from '@/.source/server'
import { loader, type LoaderOutput, type Meta, type Page } from 'fumadocs-core/source'
import { i18n } from './i18n'

// fumadocs-core's `StaticSource<Config>` несёт Config только через индексный доступ
// (`files: VirtualFile<Config>[]` → `Config['pageData']`/`Config['metaData']`), поэтому
// `GeneratePage<I>`/`GenerateMeta<I>` не могут восстановить его через `infer` и молча
// откатываются к базовым `PageData`/`MetaData` — воспроизведено и на tsc, и на tsgo,
// не зависит от версии fumadocs-core/-mdx. Явные типы `docs.docs[number]`/`docs.meta[number]`
// (без `infer`) обходят это ограничение.
type DocPageData = (typeof docs.docs)[number]
type DocMetaData = (typeof docs.meta)[number]

export const source = loader({
  i18n,
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
}) as unknown as LoaderOutput<{
  page: Page<undefined, DocPageData>
  meta: Meta<undefined, DocMetaData>
  i18n: typeof i18n
}>
