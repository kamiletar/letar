/**
 * Утилита для upsert связей аниме (AnimeRelation) в БД
 */

import type { PrismaClient, RelationKind } from '../../../renderer/src/generated/prisma'

interface RelationInput {
  targetShikimoriId: number
  relationKind: string
}

/**
 * Upsert связей аниме в БД.
 * Используется в anime-manifest-generator и anime-importer.
 */
export async function upsertAnimeRelations(
  prisma: PrismaClient,
  animeId: string,
  relations: RelationInput[]
): Promise<void> {
  for (const rel of relations) {
    const targetAnime = await prisma.anime.findUnique({
      where: { shikimoriId: rel.targetShikimoriId },
      select: { id: true },
    })
    // Shikimori отдаёт snake_case (prequel), Prisma enum — UPPER_SNAKE_CASE (PREQUEL)
    const dbRelationKind = rel.relationKind.toUpperCase() as RelationKind
    await prisma.animeRelation.upsert({
      where: {
        sourceAnimeId_targetShikimoriId: {
          sourceAnimeId: animeId,
          targetShikimoriId: rel.targetShikimoriId,
        },
      },
      update: {
        relationKind: dbRelationKind,
        targetAnimeId: targetAnime?.id ?? null,
      },
      create: {
        sourceAnimeId: animeId,
        targetShikimoriId: rel.targetShikimoriId,
        targetAnimeId: targetAnime?.id ?? null,
        relationKind: dbRelationKind,
      },
    })
  }
}
