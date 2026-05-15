'use client'

import { Button, Heading, HStack, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuBookOpen, LuPlus } from 'react-icons/lu'

import type { TheoryTopicSummary } from '../../_actions/theory-topic.action'
import { TheoryTopicsList } from '../../_components/theory-topics-list'

interface Props {
  topics: TheoryTopicSummary[]
  schoolId: string
}

export function TheoryTopicsClientPage({ topics, schoolId }: Props) {
  return (
    <VStack gap={6} align="stretch">
      {/* Заголовок страницы */}
      <HStack justify="space-between">
        <HStack gap={3}>
          <LuBookOpen size={28} />
          <Heading size="xl">Темы теоретических занятий</Heading>
        </HStack>
        <Button asChild colorPalette="brand">
          <Link href={`/school/theory-topics/new?schoolId=${schoolId}`}>
            <LuPlus />
            Создать тему
          </Link>
        </Button>
      </HStack>

      {/* Список тем */}
      <TheoryTopicsList topics={topics} schoolId={schoolId} />
    </VStack>
  )
}
