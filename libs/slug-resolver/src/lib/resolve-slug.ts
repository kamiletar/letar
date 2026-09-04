export interface RedirectHit {
  /** Актуальный слаг, на который нужно сделать постоянный редирект. */
  currentSlug: string
}

export type SlugOutcome<TEntity, TGone> =
  | { kind: 'found'; entity: TEntity }
  | { kind: 'redirect'; to: string }
  | { kind: 'gone'; info: TGone }
  | { kind: 'not-found' }

export interface ResolveSlugParams<TEntity, TGone> {
  slug: string
  /** Ищет живую сущность по актуальному слагу. */
  findCurrent: (slug: string) => Promise<TEntity | null>
  /** Ищет запись истории переименований — слаг когда-то указывал на другую сущность/адрес. */
  findPreviousRedirect?: (slug: string) => Promise<RedirectHit | null>
  /** Ищет удалённую (soft-delete) сущность — для честной страницы «было, больше нет». */
  findGone?: (slug: string) => Promise<TGone | null>
}

/**
 * Заповедь №25 студии — адрес живёт вечно: переименованная сущность отвечает постоянным
 * редиректом, удалённая — честной страницей "было, больше нет" (заповедь №23), а не 404.
 * Порядок проверок фиксирован: текущая сущность важнее истории редиректов важнее gone-записи,
 * иначе переиспользованный слаг (если политика приложения это разрешает) резолвился бы в старую
 * сущность вместо новой.
 */
export async function resolveSlugOutcome<TEntity, TGone = TEntity>(
  params: ResolveSlugParams<TEntity, TGone>,
): Promise<SlugOutcome<TEntity, TGone>> {
  const { slug, findCurrent, findPreviousRedirect, findGone } = params

  const entity = await findCurrent(slug)
  if (entity !== null) {
    return { kind: 'found', entity }
  }

  if (findPreviousRedirect) {
    const redirect = await findPreviousRedirect(slug)
    if (redirect !== null) {
      return { kind: 'redirect', to: redirect.currentSlug }
    }
  }

  if (findGone) {
    const gone = await findGone(slug)
    if (gone !== null) {
      return { kind: 'gone', info: gone }
    }
  }

  return { kind: 'not-found' }
}
