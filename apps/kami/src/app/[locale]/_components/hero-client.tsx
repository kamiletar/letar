'use client'

import { Skeleton } from '@chakra-ui/react'
import dynamic from 'next/dynamic'

/**
 * Клиентский wrapper для Hero компонента
 * В Next.js 16 dynamic с ssr: false требует Client Component
 */
const HeroLazy = dynamic(() => import('@/app/_components/hero/hero').then((mod) => mod.Hero), {
  ssr: false,
  loading: () => <Skeleton height="calc(100vh - 60px)" />,
})

export function HeroClient() {
  return <HeroLazy />
}
