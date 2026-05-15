import { Box, Flex, HStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'

import { ArticleLink } from '@/components/article-link'
import { SourceLink } from '@/components/source-link'

export default function ExamplesLayout({ children }: { children: ReactNode }) {
  return (
    <Box>
      <Flex justify="flex-end" mb={2}>
        <HStack gap={4}>
          <ArticleLink />
          <SourceLink />
        </HStack>
      </Flex>
      {children}
    </Box>
  )
}
