import { OG_SIZE, renderOgCard } from '@/lib/og-card'
import { getTranslations } from 'next-intl/server'

export const alt = 'Kami'
export const size = OG_SIZE
export const contentType = 'image/png'

/** Превью ссылки посадочной: фото, имя и оффер на языке локали. */
export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'site' })
  return renderOgCard(t('ogLine'))
}
