import { requireSeller } from '@/lib/auth'
import { Box, Container, Grid, GridItem } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import { SellerSidebar } from './_components/seller-sidebar'

/**
 * Layout панели продавца с боковой навигацией.
 * Доступ: SELLER и ADMIN.
 */
export default async function SellerLayout({ children }: PropsWithChildren) {
  await requireSeller()

  return (
    <Container maxW="7xl" py={8}>
      <Grid
        templateColumns={{
          base: '1fr',
          md: '200px 1fr',
          lg: '240px 1fr',
        }}
        gap={8}
      >
        {/* Sidebar — скрыт на мобильных, виден на планшетах и десктопе */}
        <GridItem display={{ base: 'none', md: 'block' }}>
          <SellerSidebar />
        </GridItem>

        {/* Контент */}
        <GridItem>
          <Box>{children}</Box>
        </GridItem>
      </Grid>
    </Container>
  )
}
