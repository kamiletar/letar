/**
 * PublishedLibrary — Опубликованная библиотека аниме (IPNS → CID → JSON)
 *
 * Корневой документ, публикуемый через IPNS.
 * Содержит список всех аниме в библиотеке.
 */

/** Опубликованный эпизод */
export interface PublishedEpisode {
  number: number
  name?: string
  cid: string
  size: number
  duration: number
}

/** Опубликованное аниме */
export interface PublishedAnime {
  name: string
  originalName?: string
  year?: number
  posterCid?: string
  /** CID корневой IPFS-директории аниме */
  directoryCid?: string
  episodes: PublishedEpisode[]
}

/** Опубликованная библиотека (IPNS → CID → этот JSON) */
export interface PublishedLibrary {
  version: 1
  peerId: string
  name: string
  updatedAt: string
  animes: PublishedAnime[]
}
