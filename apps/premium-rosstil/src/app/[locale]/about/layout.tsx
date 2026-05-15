import { Box } from '@chakra-ui/react'

export const metadata = {
  title: 'Каталог Дизайнерской Одежды — Премиум РосСтиль',
  description: 'Каталог премиальной дизайнерской одежды от Елены Аксяновой',
  openGraph: {
    description:
      'Наряды, созданные Еленой Аксяновой наполнены энергией, которая помогает быстро входить в нужное эмоциональное состояние.',
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <Box>{children}</Box>
}
