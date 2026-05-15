import { Box, Container, Grid, GridItem } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import { ProfileSidebar } from './_components/profile-sidebar'

/**
 * Layout для страниц профиля с боковой навигацией.
 * Использует двухколоночную сетку: сайдбар слева, контент справа.
 */
export default function ProfileLayout({ children }: PropsWithChildren) {
  return (
    <Container maxW="7xl" py={8}>
      <Grid
        templateColumns={{
          base: '1fr',
          md: '220px 1fr',
          lg: '280px 1fr',
        }}
        gap={8}
      >
        {/* Sidebar — скрыт на мобильных, виден на планшетах и десктопе */}
        <GridItem display={{ base: 'none', md: 'block' }}>
          <ProfileSidebar />
        </GridItem>

        {/* Main Content */}
        <GridItem>
          <Box>{children}</Box>
        </GridItem>
      </Grid>
    </Container>
  )
}
