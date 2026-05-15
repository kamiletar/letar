import { Avatar } from '@chakra-ui/react'

export interface UserAvatarProps {
  name?: string | null
  /** URL изображения (алиас: src) */
  image?: string | null
  /** URL изображения (алиас: image) */
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

/**
 * Компонент аватара пользователя
 * Отображает изображение или инициалы пользователя
 *
 * @example
 * <UserAvatar name="Иван Иванов" image="/avatar.jpg" size="lg" />
 */
export function UserAvatar({ name, image, src, size = 'md' }: UserAvatarProps) {
  // Поддержка обоих props: image и src
  const avatarImage = image ?? src
  // Получаем инициалы из имени
  const getInitials = (fullName: string | null | undefined): string => {
    if (!fullName) {
      return 'П'
    }

    const parts = fullName.trim().split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return fullName[0].toUpperCase()
  }

  return (
    <Avatar.Root size={size}>
      {avatarImage && <Avatar.Image src={avatarImage} alt={name || 'Пользователь'} />}
      <Avatar.Fallback>{getInitials(name)}</Avatar.Fallback>
    </Avatar.Root>
  )
}
