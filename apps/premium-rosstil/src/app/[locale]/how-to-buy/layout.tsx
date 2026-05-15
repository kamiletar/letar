import { Box } from '@chakra-ui/react'

export const metadata = {
  title: 'Как купить — Премиум РосСтиль',
  description: 'Инструкция по приобретению премиальной дизайнерской одежды от Елены Аксяновой',
  openGraph: {
    description:
      'Узнайте, как приобрести уникальную дизайнерскую одежду ПРЕМИУМ РОССТИЛЬ с возможностью индивидуального подхода.',
  },
}

export default function HowToBuyLayout({ children }: { children: React.ReactNode }) {
  return <Box>{children}</Box>
}
