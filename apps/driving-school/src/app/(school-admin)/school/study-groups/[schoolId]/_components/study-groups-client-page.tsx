'use client'

import { Button, Heading, HStack, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuPlus, LuUsers } from 'react-icons/lu'

import type { StudyGroupSummary } from '../../_actions/study-group.action'
import { StudyGroupsList } from '../../_components/study-groups-list'

interface Props {
  groups: StudyGroupSummary[]
  schoolId: string
}

export function StudyGroupsClientPage({ groups, schoolId }: Props) {
  return (
    <VStack gap={6} align="stretch">
      {/* Заголовок страницы */}
      <HStack justify="space-between">
        <HStack gap={3}>
          <LuUsers size={28} />
          <Heading size="xl">Учебные группы</Heading>
        </HStack>
        <Button asChild colorPalette="brand">
          <Link href={`/school/study-groups/new?schoolId=${schoolId}`}>
            <LuPlus />
            Создать группу
          </Link>
        </Button>
      </HStack>

      {/* Контент */}
      <StudyGroupsList groups={groups} schoolId={schoolId} />
    </VStack>
  )
}
