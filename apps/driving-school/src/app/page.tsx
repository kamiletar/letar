import { CTASection } from '@/app/_components/landing/cta-section'
import { Features } from '@/app/_components/landing/features'
import { Footer } from '@/app/_components/landing/footer'
import { Header } from '@/app/_components/landing/header'
import { Hero } from '@/app/_components/landing/hero'
import { HowItWorks } from '@/app/_components/landing/how-it-works'
import { type Review, Testimonials } from '@/app/_components/landing/testimonials'
import { TrustBar } from '@/app/_components/landing/trust-bar'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Box } from '@chakra-ui/react'

async function getLandingData() {
  // Параллельно загружаем все данные
  const [instructorsCount, studentsCount, lessonsCount, schoolsCount, topReview, reviews, schools] = await Promise.all([
    // Метрики для Hero
    prisma.instructorProfile.count({ where: { isPublic: true } }),
    prisma.studentProfile.count(),
    prisma.lesson.count({ where: { status: 'COMPLETED' } }),
    prisma.organization.count({ where: { isPublic: true } }),

    // Лучший отзыв для микро-testimonial в Hero
    prisma.review.findFirst({
      where: { status: 'PUBLISHED', rating: { gte: 4 }, text: { not: null } },
      orderBy: { rating: 'desc' },
      include: { author: { select: { name: true } } },
    }),

    // Отзывы для Testimonials carousel
    prisma.review.findMany({
      where: { status: 'PUBLISHED', rating: { gte: 4 }, text: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        author: { select: { name: true, image: true } },
      },
    }),

    // Школы для Trust Bar
    prisma.organization.findMany({
      where: { isPublic: true },
      select: { id: true, name: true, logo: true },
      take: 6,
    }),
  ])

  // Преобразуем отзывы в формат компонента
  const mappedReviews: Review[] = reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    text: r.text || '',
    authorName: r.author.name || 'Пользователь',
    authorAvatar: r.author.image,
    authorRole: r.targetType === 'INSTRUCTOR' ? 'Ученик' : 'Клиент',
    createdAt: r.createdAt,
  }))

  return {
    heroData: {
      metrics: {
        instructors: instructorsCount,
        students: studentsCount,
        lessons: lessonsCount,
      },
      testimonial: topReview
        ? {
            rating: topReview.rating,
            text: topReview.text?.slice(0, 100) + (topReview.text && topReview.text.length > 100 ? '...' : '') || '',
            author: topReview.author.name || 'Пользователь',
            role: topReview.targetType === 'INSTRUCTOR' ? 'ученик' : 'клиент',
          }
        : {
            rating: 5,
            text: 'Отличная платформа для обучения!',
            author: 'Мария И.',
            role: 'ученица',
          },
    },
    trustBar: {
      schoolsCount,
      schools,
    },
    reviews: mappedReviews,
  }
}

export default async function HomePage() {
  const [session, landingData] = await Promise.all([getSession(), getLandingData()])
  const user = session?.user

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <Header user={user} />

      <Box flex="1">
        <Hero metrics={landingData.heroData.metrics} testimonial={landingData.heroData.testimonial} />
        <TrustBar schoolsCount={landingData.trustBar.schoolsCount} schools={landingData.trustBar.schools} />
        <Features />
        <HowItWorks />
        <Testimonials reviews={landingData.reviews} />
        <CTASection />
      </Box>

      <Footer />
    </Box>
  )
}
