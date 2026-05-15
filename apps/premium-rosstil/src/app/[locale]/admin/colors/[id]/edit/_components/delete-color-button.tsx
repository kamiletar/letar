'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { useRouter } from '@/i18n/navigation'
import {
  Button,
  DialogActionTrigger,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  Text,
} from '@chakra-ui/react'
import { useState, useTransition } from 'react'
import { LuTrash2 } from 'react-icons/lu'
import { deleteColor } from '../../../_actions/color.action'

interface DeleteColorButtonProps {
  colorId: string
  colorName: string
  usageCount: number
}

export function DeleteColorButton({ colorId, colorName, usageCount }: DeleteColorButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteColor(colorId)

      if (result.success) {
        toaster.success({ title: 'Цвет удалён' })
        router.push('/admin/colors')
      } else {
        toaster.error({ title: 'Ошибка', description: result.error })
        setOpen(false)
      }
    })
  }

  const isDisabled = usageCount > 0

  return (
    <DialogRoot open={open} onOpenChange={(e) => setOpen(e.open)}>
      <DialogBackdrop />
      <DialogTrigger asChild>
        <Button
          variant="outline"
          colorPalette="red"
          size="sm"
          disabled={isDisabled}
          title={isDisabled ? 'Нельзя удалить цвет, используемый в товарах' : 'Удалить цвет'}
        >
          <LuTrash2 />
          Удалить
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить цвет?</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Text>
            Вы уверены, что хотите удалить цвет <strong>«{colorName}»</strong>?
          </Text>
          <Text color="fg.muted" mt={2}>
            Это действие нельзя отменить.
          </Text>
        </DialogBody>
        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="outline" disabled={isPending}>
              Отмена
            </Button>
          </DialogActionTrigger>
          <Button colorPalette="red" onClick={handleDelete} loading={isPending}>
            Удалить
          </Button>
        </DialogFooter>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}
