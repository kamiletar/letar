import { Box, Container, Flex, HStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'

import { Breadcrumbs } from '../_components/breadcrumbs'
import { DocumentActions } from '../_components/document-actions'
import { Footer } from '../_components/footer'
import { Header } from '../_components/header'
import { MobileTOC } from '../_components/mobile-toc'
import { Sidebar } from '../_components/sidebar'
import { TableOfContents } from '../_components/toc'

interface DocsLayoutProps {
  children: ReactNode
}

/**
 * Layout для страниц документации.
 * Трёхколоночная структура: Sidebar | Content | TOC
 */
export default function DocsLayout({ children }: DocsLayoutProps) {
  return (
    <Flex direction="column" minH="100vh">
      {/* Шапка */}
      <Header />

      {/* Основной контент */}
      <Flex flex="1">
        {/* Sidebar (скрыт на мобильных и при печати) */}
        <Box className="sidebar" data-print-hide>
          <Sidebar />
        </Box>

        {/* Контент */}
        <Box as="main" id="main-content" tabIndex={-1} flex="1" minW={0} outline="none">
          <Container maxW="container.lg" py={6} px={{ base: 4, md: 8 }}>
            <HStack justify="space-between" align="center" className="breadcrumbs" data-print-hide>
              <Breadcrumbs />
              <DocumentActions />
            </HStack>
            <Box className="mdx-content">{children}</Box>
          </Container>
        </Box>

        {/* TOC (только на больших экранах, скрыт при печати) */}
        <Box className="toc" data-print-hide>
          <TableOfContents />
        </Box>
      </Flex>

      {/* Футер с дисклеймером */}
      <Footer />

      {/* Мобильный TOC (FAB внизу справа) */}
      <MobileTOC />
    </Flex>
  )
}
