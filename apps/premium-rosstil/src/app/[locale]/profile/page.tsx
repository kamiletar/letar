import { Gender } from '@/generated/prisma'
import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { formatPhoneNumber } from '@/lib/format'
import { Avatar, Badge, Box, Card, DataList, Heading, HStack, Link, VStack } from '@chakra-ui/react'
import { notFound } from 'next/navigation'
import { ProfileCompleteness } from './_components/profile-completeness'

export default async function ProfilePage() {
  const authUser = await requireAuth()

  // Читаем актуальные данные пользователя из БД
  // (не полагаемся на session.user который может быть устаревшим из-за JWT кэша)
  const db = getEnhancedPrisma(authUser)
  const user = await db.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      profile: {
        select: {
          oauthImage: true,
          avatar: {
            select: { path: true },
          },
          gender: true,
          birthdate: true,
          phoneNumber: true,
        },
      },
      measurements: {
        select: {
          bust: true,
          waist: true,
          hips: true,
          height: true,
          preferredSize: true,
        },
      },
    },
  })

  if (!user) {
    notFound()
  }

  return (
    <VStack gap={8} align="stretch">
      <Card.Root data-testid="profile-form">
        <Card.Body>
          <VStack gap={6} align="stretch">
            {/* User Avatar and Name */}
            <HStack gap={4}>
              <Avatar.Root size="2xl">
                <Avatar.Fallback name={user.name ?? undefined} />
                <Avatar.Image
                  src={
                    user.profile?.avatar
                      ? `/api/files/${user.profile.avatar.path}`
                      : (user.profile?.oauthImage ?? undefined)
                  }
                />
              </Avatar.Root>
              <VStack data-testid="profile-name" align="start" gap={1}>
                <Heading size="xl" textTransform="none">
                  {user.name || 'Пользователь'}
                </Heading>
                <Badge colorPalette="green" variant="subtle">
                  Активный
                </Badge>
              </VStack>
            </HStack>

            {/* User Information */}
            <Box>
              <Heading size="md" mb={4} textTransform="none">
                Информация
              </Heading>
              <DataList.Root orientation="horizontal" divideY="1px">
                <DataList.Item pt={4}>
                  <DataList.ItemLabel>Имя</DataList.ItemLabel>
                  <DataList.ItemValue>{user.name || 'Не указано'}</DataList.ItemValue>
                </DataList.Item>

                <DataList.Item pt={4}>
                  <DataList.ItemLabel>Email</DataList.ItemLabel>
                  <DataList.ItemValue>
                    <Link href={`mailto:${user.email}`} target="_blank" rel="noopener noreferrer" color="fg">
                      {user.email}
                    </Link>
                  </DataList.ItemValue>
                </DataList.Item>

                {user.profile?.phoneNumber && (
                  <DataList.Item pt={4}>
                    <DataList.ItemLabel>Телефон</DataList.ItemLabel>
                    <DataList.ItemValue>
                      <Link
                        href={`tel:${user.profile.phoneNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="fg"
                      >
                        {formatPhoneNumber(user.profile.phoneNumber)}
                      </Link>
                    </DataList.ItemValue>
                  </DataList.Item>
                )}

                {user.profile?.gender && (
                  <DataList.Item pt={4}>
                    <DataList.ItemLabel>Пол</DataList.ItemLabel>
                    <DataList.ItemValue>
                      {user.profile.gender === Gender.MALE
                        ? 'Мужской'
                        : user.profile.gender === Gender.FEMALE
                          ? 'Женский'
                          : user.profile.gender}
                    </DataList.ItemValue>
                  </DataList.Item>
                )}

                {user.profile?.birthdate && (
                  <DataList.Item pt={4}>
                    <DataList.ItemLabel>Дата рождения</DataList.ItemLabel>
                    <DataList.ItemValue>
                      {new Date(user.profile.birthdate).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </DataList.ItemValue>
                  </DataList.Item>
                )}
              </DataList.Root>
            </Box>
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Прогресс заполнения профиля */}
      <ProfileCompleteness
        name={user.name}
        email={user.email}
        phoneNumber={user.profile?.phoneNumber ?? null}
        gender={user.profile?.gender ?? null}
        birthdate={user.profile?.birthdate ?? null}
        image={user.profile?.avatar ? `/api/files/${user.profile.avatar.path}` : (user.profile?.oauthImage ?? null)}
        measurements={user.measurements}
      />
    </VStack>
  )
}
