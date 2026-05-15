/**
 * GraphQL запросы для Shikimori API
 */

/** Запрос для поиска аниме */
export const SEARCH_ANIME_QUERY = `
query SearchAnime($search: String!, $limit: Int) {
  animes(search: $search, limit: $limit) {
    id
    name
    russian
    description
    descriptionHtml
    score
    status
    kind
    episodes
    episodesAired
    airedOn { year month day }
    releasedOn { year month day }
    poster { mainUrl originalUrl }
    genres { id name russian kind }
  }
}
`

/** Запрос для получения деталей аниме по ID */
export const GET_ANIME_DETAILS_QUERY = `
query GetAnimeDetails($ids: String!) {
  animes(ids: $ids, limit: 1) {
    id
    name
    russian
    english
    japanese
    synonyms
    description
    descriptionHtml
    score
    status
    kind
    rating
    episodes
    episodesAired
    duration
    airedOn { year month day }
    releasedOn { year month day }
    poster { mainUrl originalUrl }
    genres { id name russian kind }
    licensors
    licenseNameRu
  }
}
`

/** Запрос для получения расширенных метаданных аниме (v0.5.1, v0.5.3 — videos) */
export const GET_ANIME_EXTENDED_QUERY = `
query GetAnimeExtended($ids: String!) {
  animes(ids: $ids, limit: 1) {
    id
    name
    russian
    english
    japanese
    synonyms
    description
    descriptionHtml
    score
    status
    kind
    rating
    episodes
    episodesAired
    duration
    airedOn { year month day }
    releasedOn { year month day }
    poster { mainUrl originalUrl }
    genres { id name russian kind }
    studios { id name imageUrl }
    personRoles {
      id
      rolesRu
      rolesEn
      person { id name russian poster { mainUrl originalUrl } }
    }
    characterRoles {
      id
      rolesRu
      rolesEn
      character { id name russian poster { mainUrl originalUrl } }
    }
    fandubbers
    fansubbers
    licensors
    licenseNameRu
    externalLinks { id kind url }
    videos { id url name kind playerUrl imageUrl }
    nextEpisodeAt
    scoresStats { score count }
    statusesStats { status count }
  }
}
`

/**
 * Облегчённый запрос без personRoles/characterRoles — fallback для аниме с большим количеством персонажей
 * (Shikimori GraphQL возвращает 404 когда список слишком большой)
 */
export const GET_ANIME_EXTENDED_NO_ROLES_QUERY = `
query GetAnimeExtendedNoRoles($ids: String!) {
  animes(ids: $ids, limit: 1) {
    id
    name
    russian
    english
    japanese
    synonyms
    description
    descriptionHtml
    score
    status
    kind
    rating
    episodes
    episodesAired
    duration
    airedOn { year month day }
    releasedOn { year month day }
    poster { mainUrl originalUrl }
    genres { id name russian kind }
    studios { id name imageUrl }
    fandubbers
    fansubbers
    licensors
    licenseNameRu
    externalLinks { id kind url }
    videos { id url name kind playerUrl imageUrl }
    nextEpisodeAt
    scoresStats { score count }
    statusesStats { status count }
  }
}
`

/** Запрос для получения аниме со связанными (related) */
export const GET_ANIME_WITH_RELATED_QUERY = `
query GetAnimeWithRelated($ids: String!) {
  animes(ids: $ids, limit: 1) {
    id
    name
    russian
    franchise
    poster { mainUrl originalUrl }
    kind
    status
    episodes
    airedOn { year }
    score
    related {
      id
      anime {
        id
        name
        russian
        franchise
        poster { mainUrl originalUrl }
        kind
        status
        episodes
        airedOn { year }
        score
      }
      relationKind
      relationText
    }
  }
}
`
