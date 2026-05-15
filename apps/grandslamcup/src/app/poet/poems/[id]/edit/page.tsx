/**
 * Страница редактирования стихотворения.
 * Server Component загружает данные, клиентская форма редактирует.
 */

import { prisma } from '@/lib/db'
import { requirePoet } from '@/lib/roles'
import { notFound } from 'next/navigation'
import { EditPoemForm } from './_components/edit-poem-form'

type Params = Promise<{ id: string }>

export default async function EditPoemPage({ params }: { params: Params }) {
  const { id } = await params
  const poet = await requirePoet()

  const poem = await prisma.poem.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      text: true,
      coverImage: true,
      published: true,
      playerId: true,
    },
  })

  if (!poem || poem.playerId !== poet.playerId) {
    notFound()
  }

  return (
    <EditPoemForm
      poem={{
        id: poem.id,
        title: poem.title,
        text: poem.text,
        coverImage: poem.coverImage,
        published: poem.published,
      }}
    />
  )
}
