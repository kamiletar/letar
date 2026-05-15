'use client'

import { Button, Icon } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { LuCheck, LuX } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'
import { useUpdateOrganization } from '@/lib/hooks'

interface ModerateSchoolButtonProps {
  organizationId: string
  organizationName: string
  action: 'approve' | 'reject'
}

export function ModerateSchoolButton({ organizationId, organizationName, action }: ModerateSchoolButtonProps) {
  const queryClient = useQueryClient()
  const mutation = useUpdateOrganization()

  const handleModerate = async () => {
    if (
      !window.confirm(
        action === 'approve'
          ? `Опубликовать автошколу "${organizationName}"?`
          : `Скрыть автошколу "${organizationName}" из каталога?`
      )
    ) {
      return
    }

    const isPublic = action === 'approve'

    try {
      await mutation.mutateAsync({
        where: { id: organizationId },
        data: { isPublic },
      })

      toaster.create({
        title: action === 'approve' ? 'Автошкола опубликована' : 'Автошкола скрыта',
        description:
          action === 'approve'
            ? `Автошкола "${organizationName}" теперь видна в каталоге`
            : `Автошкола "${organizationName}" скрыта из каталога`,
        type: 'success',
        duration: 3000,
      })

      // Инвалидируем кэш списка организаций
      queryClient.invalidateQueries({ queryKey: ['findManyOrganization'] })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toaster.create({
        title: 'Ошибка модерации',
        description: 'Произошла ошибка при модерации автошколы',
        type: 'error',
        duration: 5000,
      })
    }
  }

  if (action === 'approve') {
    return (
      <Button
        size="xs"
        variant="subtle"
        colorPalette="green"
        onClick={handleModerate}
        loading={mutation.isPending}
        title="Опубликовать"
      >
        <Icon as={LuCheck} />
        Опубликовать
      </Button>
    )
  }

  return (
    <Button
      size="xs"
      variant="subtle"
      colorPalette="red"
      onClick={handleModerate}
      loading={mutation.isPending}
      title="Скрыть"
    >
      <Icon as={LuX} />
      Скрыть
    </Button>
  )
}
