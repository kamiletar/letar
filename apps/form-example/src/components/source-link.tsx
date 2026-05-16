'use client'

import { HStack, Link, Text } from '@chakra-ui/react'
import { usePathname } from 'next/navigation'
import { LuGithub } from 'react-icons/lu'

const REPO_URL = 'https://github.com/kamiletar/letar/tree/main/apps/form-example'

/** Ссылка на исходный код текущей страницы на GitHub */
export function SourceLink() {
  const pathname = usePathname()
  const githubUrl = `${REPO_URL}/blob/main/src/app${pathname}/page.tsx`

  return (
    <Link
      href={githubUrl}
      target="_blank"
      rel="noopener noreferrer"
      color="fg.muted"
      _hover={{ color: 'fg' }}
      fontSize="sm"
    >
      <HStack gap={1.5}>
        <LuGithub />
        <Text>View Source</Text>
      </HStack>
    </Link>
  )
}
