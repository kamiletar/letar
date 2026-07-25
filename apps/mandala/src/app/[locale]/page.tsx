export const dynamic = 'force-dynamic'

import { ColorOverlay } from '@/app/_components/color-overlay'
import { HomeGrid } from '@/app/_components/home-grid'
import { SITE_URL } from '@/app/_components/json-ld'
import { WelcomePortal } from '@/app/_components/welcome-portal'
import { routing } from '@/i18n/routing'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/create-image'
import { VisuallyHidden } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

type Props = {
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'home' })

  // Next.js не применяет title.template родительского layout к главной странице
  // (единственный кейс, где leaf page.tsx совпадает с сегментом [locale]/layout.tsx) —
  // поэтому суффикс добавляем явно, как и в скрытом H1 ниже
  const title = `${t('welcome')} - Elfafeya Art`

  return {
    title,
    description: t('subtitle'),
    alternates: {
      canonical: `/${locale}/`,
      languages: {
        ru: '/ru/',
        en: '/en/',
      },
    },
    openGraph: {
      title,
      description: t('subtitle'),
      url: `${SITE_URL}/${locale}/`,
      images: [
        {
          url: '/icons/icon-512.png',
          width: 512,
          height: 512,
          alt: 'Elfafeya Art',
        },
      ],
    },
  }
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('home')
  const db = getEnhancedPrisma()

  // Оптимизация: загружаем только нужные поля для главной страницы
  const mandalas = await db.mandala.findMany({
    where: { published: true },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      slug: true,
      image: { select: { path: true } },
    },
  })

  const images = mandalas.map((m) => getImageUrl(m.image.path))

  // Данные для WelcomePortal — только slug для навигации
  const mandalasForPortal = mandalas.map((m) => ({ slug: m.slug }))

  return (
    <>
      {/* Скрытый H1 для SEO — главная страница визуально не имеет заголовка */}
      <VisuallyHidden asChild>
        <h1>{t('welcome')} - Elfafeya Art</h1>
      </VisuallyHidden>
      <HomeGrid images={images} />
      <ColorOverlay />
      <WelcomePortal mandalas={mandalasForPortal} />
    </>
  )
}
