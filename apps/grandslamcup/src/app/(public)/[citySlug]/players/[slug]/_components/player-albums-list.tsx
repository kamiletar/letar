import { Box, Grid, Heading } from '@chakra-ui/react'

import { AlbumPoster } from './album-poster'

interface AlbumItem {
  id: string
  title: string
  slug: string
  coverImage: string | null
  publishedAt: Date | null
  _count: { albumPoems: number }
}

interface PlayerAlbumsListProps {
  albums: AlbumItem[]
  miscPoemsCount: number
  totalAlbumsCount: number
  citySlug: string
  playerSlug: string
}

export function PlayerAlbumsList({
  albums,
  miscPoemsCount,
  totalAlbumsCount,
  citySlug,
  playerSlug,
}: PlayerAlbumsListProps) {
  const showAll = totalAlbumsCount > 4
  const visibleAlbums = albums.slice(0, 4)
  const hasMisc = miscPoemsCount > 0

  // Нечего показывать — только плоский список стихов остаётся
  if (visibleAlbums.length === 0 && !hasMisc) return null

  return (
    <Box>
      <Heading as="h2" size="md" mb={4}>
        Альбомы
      </Heading>
      <Grid
        templateColumns={{
          base: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(4, 1fr)',
          lg: 'repeat(6, 1fr)',
        }}
        gap={4}
      >
        {visibleAlbums.map((album) => (
          <AlbumPoster
            key={album.id}
            title={album.title}
            href={`/${citySlug}/players/${playerSlug}/albums/${album.slug}`}
            coverImage={album.coverImage}
            year={album.publishedAt ? new Date(album.publishedAt).getFullYear() : null}
            count={album._count.albumPoems}
            variant="album"
          />
        ))}

        {hasMisc && (
          <AlbumPoster
            title="Разное"
            href={`/${citySlug}/players/${playerSlug}#poems`}
            count={miscPoemsCount}
            variant="misc"
          />
        )}

        {showAll && (
          <AlbumPoster
            title={`Все альбомы (${totalAlbumsCount})`}
            href={`/${citySlug}/players/${playerSlug}/albums`}
            variant="all"
          />
        )}
      </Grid>
    </Box>
  )
}
