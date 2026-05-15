import { AuthRequiredNotice } from '@/app/[locale]/catalog/_components/auth-required-notice'
import { getSession } from '@/lib/auth'
import { Box } from '@chakra-ui/react'

export const metadata = {
  title: 'Коллекция Дизайнерской Одежды — Премиум РосСтиль',
  description: 'Коллекция премиальной дизайнерской одежды от Елены Аксяновой',
  openGraph: {
    description:
      'Наряды, созданные Еленой Аксяновой наполнены энергией, которая помогает быстро входить в нужное эмоциональное состояние.',
  },
}

export default async function CatalogLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  // Показываем приглашение авторизоваться для неавторизованных пользователей
  if (!session?.user) {
    return <AuthRequiredNotice />
  }

  return <Box>{children}</Box>
}
