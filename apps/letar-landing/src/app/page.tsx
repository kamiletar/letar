import { Footer } from '@/app/_components/footer'
import { HeroSection } from '@/app/_components/hero-section'
import { ProjectsSection } from '@/app/_components/projects-section'

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <ProjectsSection />
      <Footer />
    </main>
  )
}
