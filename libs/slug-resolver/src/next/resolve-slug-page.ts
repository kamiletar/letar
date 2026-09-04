import { notFound, permanentRedirect } from 'next/navigation'
import { resolveSlugOutcome, type ResolveSlugParams } from '../lib/resolve-slug'

export interface ResolveSlugPageParams<TEntity, TGone> extends ResolveSlugParams<TEntity, TGone> {
  /** Строит href текущей сущности из актуального слага — раздел с `[slug]` знает только приложение. */
  toHref: (currentSlug: string) => string
}

/**
 * Обёртка `resolveSlugOutcome` под App Router: сама решает найденную/редиректную/not-found
 * ветку, а `gone`-ветку отдаёт вызывающему page-компоненту — настоящий HTTP 410 из
 * page-компонента не выставить (нужен route handler/proxy), поэтому честная страница
 * «было, больше нет» (заповедь №23) рисуется приложением поверх `info`, не библиотекой.
 */
export async function resolveSlugPage<TEntity, TGone = TEntity>(
  params: ResolveSlugPageParams<TEntity, TGone>,
): Promise<{ entity: TEntity } | { gone: TGone }> {
  const { toHref, ...resolveParams } = params
  const outcome = await resolveSlugOutcome(resolveParams)

  switch (outcome.kind) {
    case 'found':
      return { entity: outcome.entity }
    case 'redirect':
      return permanentRedirect(toHref(outcome.to))
    case 'gone':
      return { gone: outcome.info }
    case 'not-found':
      return notFound()
  }
}
