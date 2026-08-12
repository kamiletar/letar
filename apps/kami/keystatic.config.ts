import { collection, config, fields } from '@keystatic/core'

// NODE_ENV всегда 'production' в собранном next build, включая стейдж (см.
// .claude/rules/env-files.md § NODE_ENV === 'production' — та же ловушка бьёт не только секреты) —
// проверка по нему определяла github-хранилище и на стейдже тоже, где KEYSTATIC_GITHUB_CLIENT_ID/
// SECRET сознательно не заведены (PLAN-INFRA.md §18.7 M2), и весь `next build` падал на
// collectPageData для /api/keystatic. Настоящее условие — не домен, а наличие GitHub-кредов:
// решает именно то, может ли storage: 'github' вообще работать.
const isProd = Boolean(process.env.KEYSTATIC_GITHUB_CLIENT_ID)

export default config({
  storage: isProd
    ? {
      kind: 'github',
      repo: {
        owner: 'kamiletar',
        name: 'kami-blog',
      },
    }
    : {
      kind: 'local',
    },
  collections: {
    posts: collection({
      label: 'Статьи блога',
      slugField: 'title',
      path: isProd ? 'content/posts/*' : 'src/content/posts/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({
          name: { label: 'Заголовок', validation: { isRequired: true } },
        }),
        titleEn: fields.text({
          label: 'Заголовок (EN)',
          description: 'Опционально. Если пусто — используется русский заголовок',
        }),
        description: fields.text({
          label: 'Описание (RU)',
          multiline: true,
          validation: { isRequired: true },
        }),
        descriptionEn: fields.text({
          label: 'Описание (EN)',
          multiline: true,
          description: 'Опционально. Если пусто — используется русское описание',
        }),
        publishedAt: fields.date({
          label: 'Дата публикации',
          validation: { isRequired: true },
        }),
        tags: fields.array(fields.text({ label: 'Тег' }), {
          label: 'Теги',
          itemLabel: (props) => props.value,
        }),
        featured: fields.checkbox({
          label: 'Избранная статья',
          defaultValue: false,
        }),
        content: fields.markdoc({
          label: 'Контент (RU)',
        }),
        contentEn: fields.markdoc({
          label: 'Контент (EN)',
          description: 'Опционально. Если пусто — используется русский контент',
        }),
      },
    }),
  },
})
