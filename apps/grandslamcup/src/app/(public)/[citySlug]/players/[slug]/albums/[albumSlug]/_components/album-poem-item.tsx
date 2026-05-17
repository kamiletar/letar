import { Box, HStack, Text } from '@chakra-ui/react'
import Link from 'next/link'

interface AlbumPoemItemProps {
  index: number
  title: string
  href: string
}

export function AlbumPoemItem({ index, title, href }: AlbumPoemItemProps) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <HStack
        gap={4}
        py={3}
        px={4}
        borderRadius="lg"
        _hover={{ bg: 'brand.900' }}
        transition="background 0.1s"
        role="group"
      >
        <Text fontSize="sm" color="fg.subtle" w={6} textAlign="right" flexShrink={0}>
          {index}
        </Text>
        <Box flex={1}>
          <Text fontWeight="medium" _groupHover={{ color: 'brand.300' }} transition="color 0.1s">
            {title}
          </Text>
        </Box>
      </HStack>
    </Link>
  )
}
