import { prisma } from '@/lib/db'
import { Box, Button, Flex, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LuDices, LuGrid2X2 } from 'react-icons/lu'
import { RecalculateRatingsButton } from '../_components/recalculate-ratings-button'
import { SeasonForm } from '../_components/season-form'
import { TransferWindowToggle } from '../_components/transfer-window-toggle'

export default async function EditSeasonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const season = await prisma.season.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      cityId: true,
      status: true,
      startDate: true,
      endDate: true,
      transferWindowOpen: true,
    },
  })

  if (!season) {
    notFound()
  }

  return (
    <VStack gap={6} align="stretch">
      {/* Быстрые ссылки */}
      <Flex gap={3} wrap="wrap">
        <Button size="sm" variant="outline" asChild>
          <Link href={`/admin/seasons/${season.id}/stages`}>
            <LuDices size={16} />
            Этапы и турнирная сетка
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/admin/seasons/${season.id}/bracket`}>
            <LuGrid2X2 size={16} />
            Визуализация сетки
          </Link>
        </Button>
      </Flex>

      <SeasonForm season={season} />
      <Box bg="bg.panel" borderRadius="xl" p={5} borderWidth="1px" borderColor="border.muted">
        <TransferWindowToggle seasonId={season.id} isOpen={season.transferWindowOpen} />
      </Box>
      <Box bg="bg.panel" borderRadius="xl" p={5} borderWidth="1px" borderColor="border.muted">
        <RecalculateRatingsButton seasonId={season.id} />
      </Box>
    </VStack>
  )
}
