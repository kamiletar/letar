import { getAllReleases, getLatestRelease, parseRelease } from '@/lib/github'
import { AppShowcaseSection } from './_components/app-showcase-section'
import { ChangelogSection } from './_components/changelog-section'
import { DocsSection } from './_components/docs-section'
import { DownloadsSection } from './_components/downloads-section'
import { FaqSection } from './_components/faq-section'
import { FeaturesSection } from './_components/features-section'
import { Footer } from './_components/footer'
import { HeroSection } from './_components/hero-section'
import { ImportFlowSection } from './_components/import-flow-section'
import { Navbar } from './_components/navbar'
import { TechStackSection } from './_components/tech-stack-section'

/**
 * Главная страница лендинга Animatrona
 * Server Component для загрузки данных о релизах
 */
export default async function HomePage() {
  // Загружаем данные о релизах с GitHub
  const [latestReleaseData, allReleasesData] = await Promise.all([getLatestRelease(), getAllReleases()])

  // Парсим релизы в удобный формат
  const latestRelease = latestReleaseData ? parseRelease(latestReleaseData) : null
  const releases = allReleasesData.filter((release) => !release.draft && !release.prerelease).map(parseRelease)

  return (
    <>
      <Navbar />
      <main id="main-content">
        <HeroSection release={latestRelease} />
        <FeaturesSection />
        <ImportFlowSection />
        <AppShowcaseSection />
        <DownloadsSection release={latestRelease} />
        <TechStackSection />
        <FaqSection />
        <DocsSection />
        <ChangelogSection releases={releases} />
      </main>
      <Footer />
    </>
  )
}
