import { collection, config, fields } from '@keystatic/core'

const isProd = process.env.NODE_ENV === 'production'

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
