import { PrismaClient } from '../src/generated/prisma/index.js'

const prisma = new PrismaClient()

async function main() {
  // Создаём жанры
  const genres = await Promise.all(
    [
      { name: 'Экшен', slug: 'action' },
      { name: 'Приключения', slug: 'adventure' },
      { name: 'Комедия', slug: 'comedy' },
      { name: 'Драма', slug: 'drama' },
      { name: 'Фэнтези', slug: 'fantasy' },
      { name: 'Романтика', slug: 'romance' },
      { name: 'Сёнен', slug: 'shounen' },
      { name: 'Сёдзё', slug: 'shoujo' },
      { name: 'Сэйнэн', slug: 'seinen' },
      { name: 'Меха', slug: 'mecha' },
      { name: 'Повседневность', slug: 'slice-of-life' },
      { name: 'Ужасы', slug: 'horror' },
      { name: 'Триллер', slug: 'thriller' },
      { name: 'Психология', slug: 'psychological' },
      { name: 'Спорт', slug: 'sports' },
    ].map((genre) =>
      prisma.genre.upsert({
        where: { slug: genre.slug },
        update: {},
        create: genre,
      })
    )
  )

  // Создаём настройки по умолчанию
  await prisma.settings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      // Транскодирование
      useGpu: true,
      videoCodec: 'AV1',
      videoQuality: 24,
      videoPreset: 'p5',
      audioBitrate: 256,
      // Библиотека
      libraryPath: null,
      outputPath: null,
      // Интерфейс
      darkMode: true,
      language: 'ru',
      // Плеер
      skipOpening: false,
      skipEnding: false,
      autoplay: true,
    },
  })

  // Создаём демо-аниме
  const demoAnime = await prisma.anime.upsert({
    where: { id: 'demo-anime' },
    update: {},
    create: {
      id: 'demo-anime',
      name: 'Стальной алхимик: Братство',
      originalName: '鋼の錬金術師 FULLMETAL ALCHEMIST',
      year: 2009,
      status: 'COMPLETED',
      episodeCount: 64,
      description:
        'Братья Элрики пытаются найти философский камень, чтобы вернуть свои тела после неудачной попытки воскресить мать.',
      rating: 9.1,
    },
  })

  // Связываем аниме с жанрами
  const actionGenre = genres.find((g) => g.slug === 'action')
  const adventureGenre = genres.find((g) => g.slug === 'adventure')
  const fantasyGenre = genres.find((g) => g.slug === 'fantasy')
  const dramaGenre = genres.find((g) => g.slug === 'drama')

  if (actionGenre && adventureGenre && fantasyGenre && dramaGenre) {
    await Promise.all(
      [actionGenre, adventureGenre, fantasyGenre, dramaGenre].map((genre) =>
        prisma.genreOnAnime.upsert({
          where: {
            animeId_genreId: {
              animeId: demoAnime.id,
              genreId: genre.id,
            },
          },
          update: {},
          create: {
            animeId: demoAnime.id,
            genreId: genre.id,
          },
        })
      )
    )
  }

  // Создаём демо-эпизоды
  await Promise.all(
    [1, 2, 3].map((number) =>
      prisma.episode.upsert({
        where: {
          animeId_number: {
            animeId: demoAnime.id,
            number,
          },
        },
        update: {},
        create: {
          animeId: demoAnime.id,
          number,
          name: `Эпизод ${number}`,
          durationMs: 24 * 60 * 1000, // 24 минуты в миллисекундах
          transcodeStatus: 'QUEUED',
        },
      })
    )
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
