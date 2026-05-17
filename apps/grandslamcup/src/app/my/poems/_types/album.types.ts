export interface AlbumListItem {
  id: string
  title: string
  slug: string
  coverImage: string | null
  publishedAt: Date | null
  _count: { albumPoems: number }
}

export interface PoemOption {
  id: string
  title: string
  slug: string
  published: boolean
}

export interface AlbumFormData {
  title: string
  coverImage: string | null
  publishedAt: string | null
}
