import { TeamLogoUploader } from '@/app/_components/team-logo-uploader'
import { prisma } from '@/lib/db'
import { Button, Flex, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LuUsers } from 'react-icons/lu'
import { TeamForm } from '../_components/team-form'

export default async function EditTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const team = await prisma.team.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      cityId: true,
      homeVenueId: true,
      telegramLink: true,
      description: true,
      logo: true,
    },
  })
  if (!team) {
    notFound()
  }
  return (
    <VStack gap={6} align="stretch">
      <Flex justify="center">
        <TeamLogoUploader teamId={team.id} currentLogo={team.logo} />
      </Flex>
      <TeamForm team={team} />
      <Flex justify="center">
        <Link href={`/admin/teams/${team.id}/roster`}>
          <Button variant="outline" colorPalette="teal" size="sm">
            <LuUsers size={16} />
            Управление составом
          </Button>
        </Link>
      </Flex>
    </VStack>
  )
}
