import { InstructorHeader } from '@/app/(instructor)/_components/instructor-header'
import { getInstructorProfile } from '@/app/(instructor)/instructor-profile/_actions/update-instructor-profile.action'
import { InstructorProfileForm } from '@/app/(instructor)/instructor-profile/_components/instructor-profile-form'
import { ProfileCta } from '@/app/_components/profile-cta'
import { VehiclesManager } from '@/app/_components/vehicles-manager'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Box, Container, Grid, Heading, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'

// Динамический рендеринг - без кэширования, для актуальных данных после router.refresh()
export const dynamic = 'force-dynamic'

export default async function InstructorProfilePage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  // Получаем профиль и актуальный аватар из БД (сессия может быть устаревшей)
  // Аватар может быть: user.avatarId (загруженный) или user.image (OAuth)
  const [profile, currentUser] = await Promise.all([
    getInstructorProfile(),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true, avatarId: true },
    }),
  ])
  // Данные для ProfileCTA
  // Аватар есть если есть загруженный (avatarId) ИЛИ OAuth (image)
  const hasAvatar = !!currentUser?.avatarId || !!currentUser?.image || !!session.user.image
  // Bio считается заполненным если не пустой (убрали требование 20+ символов — неочевидно для пользователя)
  const hasBio = !!profile?.bio && profile.bio.trim().length > 0
  const hasVehicle = !!profile?.vehicles && profile.vehicles.length > 0
  const hasWorkingAreas =
    !!profile?.workingAreas && Array.isArray(profile.workingAreas) && profile.workingAreas.length > 0

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={6} align="stretch">
        <InstructorHeader />

        <Box>
          <Heading size="xl">Мой профиль</Heading>
          <Text color="fg.muted" mt={2}>
            Настройте ваш профиль инструктора
          </Text>
        </Box>

        {/* Контекстная рекомендация */}
        <ProfileCta hasAvatar={hasAvatar} hasBio={hasBio} hasVehicle={hasVehicle} hasWorkingAreas={hasWorkingAreas} />

        <Grid templateColumns={{ base: '1fr', lg: '1fr 400px' }} gap={6} alignItems="start">
          {/* Основная форма профиля */}
          {/*
            ВАЖНО: key={session.user.id} предотвращает перемонтирование формы при ре-рендере Server Component.
            Без этого форма перемонтируется после Server Action и useState сбрасывается к initialData.
            См. Bug #21 и тест bug21-form-reset.spec.ts
          */}
          <Box bg="bg.panel" p={6} borderRadius="lg" shadow="sm" borderWidth="1px">
            <InstructorProfileForm key={session.user.id} initialData={profile} />
          </Box>

          {/* Автомобили - отдельный блок справа */}
          <Box
            bg="bg.panel"
            p={6}
            borderRadius="lg"
            shadow="sm"
            borderWidth="1px"
            position={{ lg: 'sticky' }}
            top={{ lg: '100px' }}
          >
            <VehiclesManager vehicles={profile?.vehicles ?? []} />
          </Box>
        </Grid>
      </VStack>
    </Container>
  )
}
