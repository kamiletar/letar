/**
 * Seed данных для Animatrona Tracker
 *
 * Создаёт dev-пользователя с ролью ADMIN и щедрый набор демо-контента для локальной
 * разработки: франшизу из нескольких аниме с разными типами связей (RelationKind),
 * разные kind-и раздач, эпизоды длиннее часа, прогресс просмотра на нескольких эпизодах
 * и записи библиотеки во всех статусах WatchStatus.
 *
 * ⚠️ У Anime НЕТ поля `kind` в схеме — бейдж типа (tv/movie/ova/...) на странице аниме
 * читается из живого `manifest.json` на IPFS (см. `src/lib/manifest-loader.ts`), не из БД.
 * Без реального IPFS-шлюза этот бейдж просто не отрисуется (`.catch(() => null)` в
 * `page.tsx`) — сидом это не проверить, вёрстка не ломается, просто бейдж отсутствует.
 *
 * Запуск: nx db:seed animatrona-tracker
 *
 * Логин: admin@dev.local / admin123
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from 'better-auth/crypto'
import { PrismaClient, UserRole } from '../src/generated/prisma'

const DEV_USER = {
  email: 'admin@dev.local',
  password: 'admin123',
  name: 'Dev Admin',
  role: UserRole.ADMIN,
  /** Взрослая дата рождения — иначе getAllowedRatings() режет каталог до g/pg/pg_13 */
  birthDate: new Date('1990-05-14'),
}

const DEMO_VIEWER = { email: 'viewer@dev.local', name: 'Демо Зритель', role: UserRole.USER }
const DEMO_MODERATOR = { email: 'moderator@dev.local', name: 'Тестовый Модератор', role: UserRole.MODERATOR }

/** Плейсхолдер-CID — заведомо не резолвится через реальный IPFS gateway (нет живого контента) */
function fakeCid(seed: string): string {
  return `bafybeig${seed.replace(/[^a-z0-9]/gi, '').toLowerCase().padEnd(38, '0').slice(0, 38)}`
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! })
  const prisma = new PrismaClient({ adapter })

  console.log('🌱 Seeding animatrona-tracker...')

  // ──────────────────────────────────────────────────────────────────
  // Пользователи
  // ──────────────────────────────────────────────────────────────────

  const user = await prisma.user.upsert({
    where: { email: DEV_USER.email },
    update: { name: DEV_USER.name, role: DEV_USER.role, birthDate: DEV_USER.birthDate },
    create: {
      email: DEV_USER.email,
      name: DEV_USER.name,
      role: DEV_USER.role,
      emailVerified: true,
      birthDate: DEV_USER.birthDate,
    },
  })
  console.log(`✅ User: ${user.name} (${user.email}, role: ${user.role})`)

  const hashedPassword = await hashPassword(DEV_USER.password)
  await prisma.account.upsert({
    where: { providerId_accountId: { providerId: 'credential', accountId: user.id } },
    update: { password: hashedPassword, issuer: 'local:credential' },
    create: {
      userId: user.id,
      providerId: 'credential',
      accountId: user.id,
      password: hashedPassword,
      issuer: 'local:credential',
    },
  })
  console.log(`🔑 Credential account created`)

  const viewer = await prisma.user.upsert({
    where: { email: DEMO_VIEWER.email },
    update: { name: DEMO_VIEWER.name, role: DEMO_VIEWER.role },
    create: { email: DEMO_VIEWER.email, name: DEMO_VIEWER.name, role: DEMO_VIEWER.role, emailVerified: true },
  })

  const moderator = await prisma.user.upsert({
    where: { email: DEMO_MODERATOR.email },
    update: { name: DEMO_MODERATOR.name, role: DEMO_MODERATOR.role },
    create: {
      email: DEMO_MODERATOR.email,
      name: DEMO_MODERATOR.name,
      role: DEMO_MODERATOR.role,
      emailVerified: true,
    },
  })
  console.log(`✅ Демо-пользователи: ${viewer.name}, ${moderator.name}`)

  // ──────────────────────────────────────────────────────────────────
  // Франшиза «Сумеречный Ветер» + связанное «Городские Легенды»
  //
  // Покрывает все kind (tv/movie/ova/ona/special/tv_special — хоть и не хранится в БД,
  // держим для будущего использования в manifest-фикстурах) и все RelationKind из задачи.
  // ──────────────────────────────────────────────────────────────────

  const s1 = await prisma.anime.upsert({
    where: { directoryCid: fakeCid('sunset-wind-s1') },
    update: {},
    create: {
      title: 'Сумеречный Ветер',
      titleOriginal: 'Tasogare no Kaze',
      description: 'В городе, застрявшем между сумерками и рассветом, старшеклассница Юки обнаруживает, '
        + 'что может видеть духов, прячущихся в тенях зданий. Первый сезон — завязка её дружбы с '
        + 'духом-хранителем Каем и первые столкновения с Ткачами Тьмы.',
      coverUrl: `ipfs://${fakeCid('sunset-wind-s1-cover')}/poster.jpg`,
      directoryCid: fakeCid('sunset-wind-s1'),
      directoryBlocks: 4820,
      directorySize: 8_400_000_000n,
      shikimoriId: 40001,
      year: 2016,
      studio: 'Studio Kagerou',
      genres: ['Драма', 'Сверхъестественное', 'Романтика'],
      ageRating: 'pg_13',
      director: 'Хидэаки Мория',
      voiceActing: ['SUB', 'DUB_RU'],
      status: 'PUBLISHED',
      viewCount: 15420,
      libraryCount: 3,
      avgRating: 8.4,
      uploadedById: user.id,
    },
  })

  const s2 = await prisma.anime.upsert({
    where: { directoryCid: fakeCid('sunset-wind-s2') },
    update: {},
    create: {
      title: 'Сумеречный Ветер: Второй сезон',
      titleOriginal: 'Tasogare no Kaze 2',
      description: 'Продолжение — Юки и Кай сталкиваются с Первым Ткачом и ценой договора с духами.',
      coverUrl: `ipfs://${fakeCid('sunset-wind-s2-cover')}/poster.jpg`,
      directoryCid: fakeCid('sunset-wind-s2'),
      directoryBlocks: 5100,
      directorySize: 9_100_000_000n,
      shikimoriId: 40002,
      year: 2018,
      studio: 'Studio Kagerou',
      genres: ['Драма', 'Сверхъестественное', 'Романтика'],
      ageRating: 'pg_13',
      director: 'Хидэаки Мория',
      voiceActing: ['SUB', 'DUB_RU'],
      status: 'PUBLISHED',
      viewCount: 11200,
      libraryCount: 2,
      avgRating: 8.7,
      uploadedById: user.id,
    },
  })

  const ova = await prisma.anime.upsert({
    where: { directoryCid: fakeCid('sunset-wind-ova') },
    update: {},
    create: {
      title: 'Сумеречный Ветер: Начало',
      titleOriginal: 'Tasogare no Kaze: Hajimari',
      description: 'Приквел-OVA — как Кай стал духом-хранителем за десять лет до событий сериала.',
      coverUrl: `ipfs://${fakeCid('sunset-wind-ova-cover')}/poster.jpg`,
      directoryCid: fakeCid('sunset-wind-ova'),
      directoryBlocks: 900,
      directorySize: 1_600_000_000n,
      shikimoriId: 40003,
      year: 2015,
      studio: 'Studio Kagerou',
      genres: ['Драма', 'Сверхъестественное'],
      ageRating: 'pg_13',
      director: 'Рэйко Тачибана',
      voiceActing: ['SUB'],
      status: 'PUBLISHED',
      viewCount: 4300,
      libraryCount: 1,
      avgRating: 7.9,
      uploadedById: user.id,
    },
  })

  const sideStory = await prisma.anime.upsert({
    where: { directoryCid: fakeCid('sunset-wind-kai') },
    update: {},
    create: {
      title: 'Сумеречный Ветер: История Кая',
      titleOriginal: 'Tasogare no Kaze: Kai no Monogatari',
      description: 'Побочная история о буднях Кая в мире духов, параллельно событиям первого сезона.',
      coverUrl: `ipfs://${fakeCid('sunset-wind-kai-cover')}/poster.jpg`,
      directoryCid: fakeCid('sunset-wind-kai'),
      directoryBlocks: 620,
      directorySize: 980_000_000n,
      shikimoriId: 40004,
      year: 2017,
      studio: 'Studio Kagerou',
      genres: ['Драма', 'Повседневность'],
      ageRating: 'pg',
      director: 'Рэйко Тачибана',
      voiceActing: ['SUB', 'DUB_RU'],
      status: 'PUBLISHED',
      viewCount: 2100,
      libraryCount: 1,
      avgRating: 7.2,
      uploadedById: user.id,
    },
  })

  const movie = await prisma.anime.upsert({
    where: { directoryCid: fakeCid('sunset-wind-movie') },
    update: {},
    create: {
      title: 'Сумеречный Ветер: Реставрация',
      titleOriginal: 'Tasogare no Kaze: Fukugen',
      description: 'Полнометражная альтернативная версия второго сезона с переработанной концовкой и новыми '
        + 'сценами — фильм почти в два часа.',
      coverUrl: `ipfs://${fakeCid('sunset-wind-movie-cover')}/poster.jpg`,
      directoryCid: fakeCid('sunset-wind-movie'),
      directoryBlocks: 2200,
      directorySize: 4_800_000_000n,
      shikimoriId: 40005,
      year: 2021,
      studio: 'Studio Kagerou',
      genres: ['Драма', 'Сверхъестественное', 'Романтика'],
      ageRating: 'r',
      director: 'Хидэаки Мория',
      voiceActing: ['SUB', 'DUB_RU'],
      status: 'PUBLISHED',
      viewCount: 9800,
      libraryCount: 2,
      avgRating: 9.1,
      uploadedById: user.id,
    },
  })

  const spinoff = await prisma.anime.upsert({
    where: { directoryCid: fakeCid('sky-archive') },
    update: {},
    create: {
      title: 'Небесный Архив',
      titleOriginal: 'Sora no Bunko',
      description: 'Спин-офф о библиотекарях, хранящих память духов из мира «Сумеречного Ветра».',
      coverUrl: `ipfs://${fakeCid('sky-archive-cover')}/poster.jpg`,
      directoryCid: fakeCid('sky-archive'),
      directoryBlocks: 1100,
      directorySize: 1_900_000_000n,
      shikimoriId: 40006,
      year: 2022,
      studio: 'Nightshade Films',
      genres: ['Фэнтези', 'Драма'],
      ageRating: 'pg_13',
      director: 'Мэй Куросава',
      voiceActing: ['SUB'],
      status: 'PUBLISHED',
      viewCount: 3600,
      libraryCount: 1,
      avgRating: 7.6,
      uploadedById: user.id,
    },
  })

  const urbanLegends = await prisma.anime.upsert({
    where: { directoryCid: fakeCid('urban-legends') },
    update: {},
    create: {
      title: 'Городские Легенды',
      titleOriginal: 'Toshi Densetsu',
      description: 'Хоррор-антология о городских легендах — не входит во франшизу «Сумеречного Ветра», но делит '
        + 'с ней часть персонажей (камео Кая в третьей серии).',
      coverUrl: `ipfs://${fakeCid('urban-legends-cover')}/poster.jpg`,
      directoryCid: fakeCid('urban-legends'),
      directoryBlocks: 3400,
      directorySize: 6_200_000_000n,
      shikimoriId: 40007,
      year: 2019,
      studio: 'Nightshade Films',
      genres: ['Хоррор', 'Мистика'],
      ageRating: 'r_plus',
      director: 'Мэй Куросава',
      voiceActing: ['SUB', 'DUB_RU'],
      status: 'PUBLISHED',
      viewCount: 7300,
      libraryCount: 2,
      avgRating: 8.0,
      uploadedById: user.id,
    },
  })

  // franchiseKey = id представителя франшизы (s1) — так же, как страница /anime/franchise/[key]
  // ищет стартовое аниме: `prisma.anime.findUnique({ where: { id: key } })`.
  await prisma.anime.updateMany({
    where: { id: { in: [s1.id, s2.id, ova.id, sideStory.id, movie.id, spinoff.id] } },
    data: { franchiseKey: s1.id },
  })
  console.log(`✅ Франшиза «Сумеречный Ветер»: 6 тайтлов + отдельное «Городские Легенды» (CHARACTER-связь)`)

  // ──────────────────────────────────────────────────────────────────
  // Связи между аниме — все RelationKind из задачи
  // ──────────────────────────────────────────────────────────────────

  const relations: Array<{ animeId: string; targetShikimoriId: number; targetAnimeId: string; relationKind: string }> =
    [
      { animeId: s1.id, targetShikimoriId: s2.shikimoriId!, targetAnimeId: s2.id, relationKind: 'SEQUEL' },
      { animeId: s2.id, targetShikimoriId: s1.shikimoriId!, targetAnimeId: s1.id, relationKind: 'PREQUEL' },
      { animeId: s1.id, targetShikimoriId: ova.shikimoriId!, targetAnimeId: ova.id, relationKind: 'PREQUEL' },
      { animeId: ova.id, targetShikimoriId: s1.shikimoriId!, targetAnimeId: s1.id, relationKind: 'SEQUEL' },
      {
        animeId: s1.id,
        targetShikimoriId: sideStory.shikimoriId!,
        targetAnimeId: sideStory.id,
        relationKind: 'SIDE_STORY',
      },
      {
        animeId: s2.id,
        targetShikimoriId: movie.shikimoriId!,
        targetAnimeId: movie.id,
        relationKind: 'ALTERNATIVE_VERSION',
      },
      { animeId: s1.id, targetShikimoriId: spinoff.shikimoriId!, targetAnimeId: spinoff.id, relationKind: 'SPIN_OFF' },
      {
        animeId: s1.id,
        targetShikimoriId: urbanLegends.shikimoriId!,
        targetAnimeId: urbanLegends.id,
        relationKind: 'CHARACTER',
      },
    ]

  for (const rel of relations) {
    await prisma.animeRelation.upsert({
      where: {
        animeId_targetShikimoriId_relationKind: {
          animeId: rel.animeId,
          targetShikimoriId: rel.targetShikimoriId,
          relationKind: rel.relationKind as never,
        },
      },
      update: {},
      create: {
        animeId: rel.animeId,
        targetShikimoriId: rel.targetShikimoriId,
        targetAnimeId: rel.targetAnimeId,
        relationKind: rel.relationKind as never,
      },
    })
  }
  console.log(
    `✅ Связей между аниме: ${relations.length} (SEQUEL/PREQUEL/SIDE_STORY/SPIN_OFF/CHARACTER/ALTERNATIVE_VERSION)`,
  )

  // ──────────────────────────────────────────────────────────────────
  // Эпизоды — включая длительность больше часа (movie)
  // ──────────────────────────────────────────────────────────────────

  async function seedEpisodes(
    animeId: string,
    animeSlug: string,
    count: number,
    durationSec: number,
    titlePrefix: string,
  ) {
    for (let n = 1; n <= count; n++) {
      await prisma.animeEpisode.upsert({
        where: { animeId_number: { animeId, number: n } },
        update: {},
        create: {
          animeId,
          number: n,
          title: `${titlePrefix} ${n}`,
          duration: durationSec,
          videoCid: fakeCid(`${animeSlug}-ep${String(n).padStart(2, '0')}`),
        },
      })
    }
  }

  await seedEpisodes(s1.id, 'sunset-wind-s1', 12, 1440, 'Серия')
  await seedEpisodes(s2.id, 'sunset-wind-s2', 12, 1440, 'Серия')
  await seedEpisodes(ova.id, 'sunset-wind-ova', 2, 2700, 'OVA')
  await seedEpisodes(sideStory.id, 'sunset-wind-kai', 3, 1380, 'Серия')
  // Фильм — одна «серия» длиной 1:45:12 — проверка formatDuration() в часовой ветке
  await seedEpisodes(movie.id, 'sunset-wind-movie', 1, 6312, 'Фильм')
  await seedEpisodes(spinoff.id, 'sky-archive', 6, 1500, 'Серия')
  await seedEpisodes(urbanLegends.id, 'urban-legends', 6, 1440, 'Серия')
  console.log(`✅ Эпизоды засеяны (включая эпизод 1:45:12 у фильма)`)

  // ──────────────────────────────────────────────────────────────────
  // Библиотека dev-пользователя — все шесть WatchStatus + прогресс просмотра
  // ──────────────────────────────────────────────────────────────────

  async function upsertLibraryItem(animeId: string, watchStatus: string, userRating: number | null) {
    return prisma.userLibraryItem.upsert({
      where: { userId_animeId: { userId: user.id, animeId } },
      update: { watchStatus: watchStatus as never, userRating },
      create: { userId: user.id, animeId, watchStatus: watchStatus as never, userRating },
    })
  }

  const s1Library = await upsertLibraryItem(s1.id, 'WATCHING', null)
  const s2Library = await upsertLibraryItem(s2.id, 'COMPLETED', 9)
  await upsertLibraryItem(ova.id, 'ON_HOLD', 7)
  await upsertLibraryItem(sideStory.id, 'DROPPED', 4)
  await upsertLibraryItem(movie.id, 'PLANNED', null)
  await upsertLibraryItem(spinoff.id, 'NOT_STARTED', null)
  const urbanLibrary = await upsertLibraryItem(urbanLegends.id, 'WATCHING', null)
  console.log(
    `✅ Библиотека dev-пользователя: все 6 WatchStatus (NOT_STARTED/WATCHING/COMPLETED/ON_HOLD/DROPPED/PLANNED)`,
  )

  async function upsertProgress(
    libraryItemId: string,
    episodeNumber: number,
    currentTime: number,
    duration: number,
    completed: boolean,
  ) {
    await prisma.userWatchProgress.upsert({
      where: { libraryItemId_episodeNumber: { libraryItemId, episodeNumber } },
      update: { currentTime, duration, completed },
      create: { libraryItemId, episodeNumber, currentTime, duration, completed },
    })
  }

  // Первая серия досмотрена, третья — в процессе (питает блок «Продолжить просмотр»)
  await upsertProgress(s1Library.id, 1, 1440, 1440, true)
  await upsertProgress(s1Library.id, 3, 612, 1440, false)
  await upsertProgress(urbanLibrary.id, 2, 305, 1440, false)
  console.log(`✅ Прогресс просмотра: 2 записи в «Продолжить просмотр» (Сумеречный Ветер ep3, Городские Легенды ep2)`)

  // ──────────────────────────────────────────────────────────────────
  // Комментарии — немного жизни на странице аниме
  // ──────────────────────────────────────────────────────────────────

  async function ensureComment(animeId: string, authorId: string, text: string, parentId?: string) {
    const existing = await prisma.animeComment.findFirst({ where: { animeId, authorId, text } })
    if (existing) {
      return existing
    }
    return prisma.animeComment.create({ data: { animeId, authorId, text, parentId } })
  }

  const rootComment = await ensureComment(
    s1.id,
    viewer.id,
    'Атмосфера с первой серии затягивает — Кай сразу вызывает симпатию.',
  )
  await ensureComment(s1.id, moderator.id, 'Согласен, озвучка тоже на высоте.', rootComment.id)
  await ensureComment(movie.id, viewer.id, 'Реставрация — must watch даже для тех, кто смотрел оба сезона.')
  console.log(`✅ Комментарии засеяны`)

  console.log('\n🎉 Seed completed!')
  console.log(`\n📧 Логин: ${DEV_USER.email}`)
  console.log(`🔒 Пароль: ${DEV_USER.password}`)
  console.log(
    `\n🔗 Проверить: /anime, /anime/${s1.shikimoriId}, /anime/franchise/${s1.id}, главная (Продолжить просмотр)`,
  )

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('❌ Seed error:', e)
  process.exit(1)
})
