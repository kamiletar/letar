import Link from 'next/link'

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const isRu = lang === 'ru'

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-4 text-4xl font-bold md:text-5xl">@letar/forms</h1>
      <p className="mb-8 max-w-xl text-lg text-fd-muted-foreground">
        {isRu
          ? 'Декларативные компоненты форм для React с 40+ типами полей.'
          : 'Declarative form components for React with 40+ field types.'}
        <br />
        {isRu ? 'На базе TanStack Form и Chakra UI v3.' : 'Powered by TanStack Form and Chakra UI v3.'}
      </p>
      <div className="flex gap-4">
        <Link
          href={`/${lang}/docs`}
          className="rounded-lg bg-fd-primary px-6 py-3 font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
        >
          {isRu ? 'Начать' : 'Get Started'}
        </Link>
        <Link
          href="https://github.com/kamiletar/letar/tree/main/libs/forms"
          className="rounded-lg border border-fd-border px-6 py-3 font-medium transition-colors hover:bg-fd-accent"
        >
          GitHub
        </Link>
      </div>
      <div className="mt-16 grid max-w-3xl gap-6 text-left md:grid-cols-3">
        <FeatureCard
          title={isRu ? '40+ типов полей' : '40+ Field Types'}
          description={isRu
            ? 'String, Number, Select, Date, Phone, FileUpload, RichText и многое другое.'
            : 'String, Number, Select, Date, Phone, FileUpload, RichText, and many more.'}
        />
        <FeatureCard
          title={isRu ? 'Схема = логика' : 'Schema-Driven'}
          description={isRu
            ? 'Валидация и UI метаданные в Zod схеме. JSX содержит только вёрстку.'
            : 'Define validation and UI metadata in Zod schema. JSX stays clean.'}
        />
        <FeatureCard
          title={isRu ? 'Всё включено' : 'Batteries Included'}
          description={isRu
            ? 'Мультистеп формы, условные поля, оффлайн режим, i18n, drag & drop.'
            : 'Multi-step forms, conditional fields, offline mode, i18n, drag & drop.'}
        />
      </div>
    </main>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-fd-border p-6">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-fd-muted-foreground">{description}</p>
    </div>
  )
}
