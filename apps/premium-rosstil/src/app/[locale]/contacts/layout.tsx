import { Box } from '@chakra-ui/react'

export const metadata = {
  title: 'Контакты — Премиум РосСтиль',
  description: 'Контакты магазина премиальной дизайнерской одежды от Елены Аксяновой',
  openGraph: {
    description:
      'Наряды, созданные Еленой Аксяновой наполнены энергией, которая помогает быстро входить в нужное эмоциональное состояние.',
  },
}

export default function ContactsLayout({ children }: { children: React.ReactNode }) {
  return <Box>{children}</Box>
}
