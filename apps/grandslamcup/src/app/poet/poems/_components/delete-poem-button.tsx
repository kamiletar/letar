'use client'

/**
 * Кнопка удаления стиха с подтверждением.
 */

import { deletePoemAction } from '@/app/poet/_actions/poet.action'
import { Button } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuTrash2 } from 'react-icons/lu'

interface DeletePoemButtonProps {
  poemId: string
  poemTitle: string
}

export function DeletePoemButton({ poemId, poemTitle }: DeletePoemButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    const confirmed = window.confirm(`Удалить стихотворение «${poemTitle}»?`)
    if (!confirmed) {
      return
    }

    setLoading(true)
    try {
      const result = await deletePoemAction({ id: poemId })
      if (result.error) {
        alert(result.error)
      } else {
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="ghost" size="sm" colorPalette="red" onClick={handleDelete} loading={loading}>
      <LuTrash2 size={16} />
      Удалить
    </Button>
  )
}
