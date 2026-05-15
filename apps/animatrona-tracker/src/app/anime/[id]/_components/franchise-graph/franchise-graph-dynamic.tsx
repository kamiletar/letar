'use client'

/**
 * Dynamic import обёртка для FranchiseGraphView из shared библиотеки.
 *
 * React Flow — клиентская библиотека (~100KB), подгружаем лениво.
 * SSR отключён — ReactFlow требует DOM.
 */

import { Skeleton } from '@chakra-ui/react'
import type { FranchiseGraphViewProps } from '@letar/animatrona-franchise-graph'
import dynamic from 'next/dynamic'

const FranchiseGraphView = dynamic(
  () => import('@letar/animatrona-franchise-graph').then((m) => ({ default: m.FranchiseGraphView })),
  {
    ssr: false,
    loading: () => <Skeleton h="500px" borderRadius="lg" />,
  }
)

export function FranchiseGraphDynamic(props: FranchiseGraphViewProps) {
  return <FranchiseGraphView {...props} />
}
