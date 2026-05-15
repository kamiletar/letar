import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Card, Separator, VStack } from '@chakra-ui/react'
import { notFound } from 'next/navigation'
import { AvatarUpload } from './_components/avatar-upload'
import { ProfileForm } from './_components/profile-form'

export const metadata = {
  title: 'Редактирование профиля — Премиум РосСтиль',
  description: 'Редактирование личной информации',
}

export default async function EditProfilePage() {
  const authUser = await requireAuth()

  const db = getEnhancedPrisma(authUser)

  // Получаем полные данные пользователя с профилем и аватаром
  const user = await db.user.findUnique({
    where: { id: authUser.id },
    include: {
      profile: {
        include: {
          avatar: { select: { path: true } },
        },
      },
    },
  })

  if (!user) {
    notFound()
  }

  // Подготовка данных для формы (profile fields from UserProfile)
  const defaultValue = {
    name: user.name || '',
    email: user.email || '',
    gender: user.profile?.gender ?? null,
    birthdate: user.profile?.birthdate ? user.profile.birthdate.toISOString().split('T')[0] : null, // YYYY-MM-DD format
    phoneNumber: user.profile?.phoneNumber ?? null,
  }

  // Вычисляем URL аватара: приоритет загруженного > OAuth
  const currentImage = user.profile?.avatar
    ? `/api/files/${user.profile.avatar.path}`
    : (user.profile?.oauthImage ?? null)

  return (
    <VStack align="stretch" gap={6}>
      <Card.Root>
        <Card.Body>
          <VStack align="stretch" gap={6}>
            <AvatarUpload currentImage={currentImage} userName={user.name || 'Пользователь'} />

            <Separator />

            <ProfileForm defaultValue={defaultValue} />
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}
