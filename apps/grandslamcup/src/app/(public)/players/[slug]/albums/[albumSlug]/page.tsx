/**
 * Редирект без citySlug → на версию с городом.
 */

import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'

type Params = Promise<{ slug: string; albumSlug: string }>

export default async function AlbumRedirectPage({ params }: { params: Params }) {
  const { slug, albumSlug } = await params

  const player = await prisma.player.findUnique({
    where: { slug },
    select: { city: { select: { slug: true } } },
  })

  if (!player) notFound()

  const citySlug = player.city?.slug ?? 'spb'
  redirect(`/${citySlug}/players/${slug}/albums/${albumSlug}`)
}
