import { Box, Text, VStack } from '@chakra-ui/react'
import Image from 'next/image'
import Link from 'next/link'
import { LuBookOpen, LuLayoutGrid, LuScrollText } from 'react-icons/lu'

interface AlbumPosterProps {
  title: string
  href: string
  coverImage?: string | null
  year?: number | null
  count?: number
  variant?: 'album' | 'misc' | 'all'
}

export function AlbumPoster({ title, href, coverImage, year, count, variant = 'album' }: AlbumPosterProps) {
  const isMisc = variant === 'misc'
  const isAll = variant === 'all'

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <VStack
        gap={2}
        align="stretch"
        role="group"
        transition="transform 0.15s ease, box-shadow 0.15s ease"
        _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
        cursor="pointer"
      >
        {/* Обложка / плейсхолдер */}
        <Box
          position="relative"
          aspectRatio="1"
          borderRadius="xl"
          overflow="hidden"
          bg={isMisc || isAll ? 'brand.900' : 'brand.950'}
          borderWidth="1px"
          borderColor="whiteAlpha.100"
        >
          {coverImage && !isMisc && !isAll ? (
            <Image
              src={coverImage.startsWith('http') ? coverImage : `/api/files/${coverImage}`}
              alt={title}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 768px) 45vw, 180px"
            />
          ) : (
            <Box display="flex" alignItems="center" justifyContent="center" h="full" color="brand.400">
              {isMisc ? <LuScrollText size={40} /> : isAll ? <LuLayoutGrid size={40} /> : <LuBookOpen size={40} />}
            </Box>
          )}
        </Box>

        {/* Подпись */}
        <VStack gap={0} align="start" px={1}>
          {year && !isMisc && !isAll && (
            <Text fontSize="xs" color="fg.subtle" lineHeight="1.2">
              {year}
            </Text>
          )}
          <Text fontWeight="semibold" fontSize="sm" lineClamp={2} lineHeight="1.3">
            {title}
          </Text>
          {count !== undefined && (
            <Text fontSize="xs" color="fg.muted">
              {count} {count === 1 ? 'стихотворение' : count < 5 ? 'стихотворения' : 'стихотворений'}
            </Text>
          )}
        </VStack>
      </VStack>
    </Link>
  )
}
