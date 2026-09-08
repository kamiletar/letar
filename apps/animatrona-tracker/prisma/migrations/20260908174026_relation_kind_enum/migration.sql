-- Автосгенерированный Prisma-план (DROP COLUMN + ADD COLUMN NOT NULL) небезопасен для прода:
-- на непустой таблице потерял бы данные/упал на NOT NULL без значений. Значения relationKind
-- на проде уже нормализованы к верхнему регистру вручную (UPPER()) перед этой миграцией — см.
-- тред relationkind-fragment-consolidation — поэтому прямой USING-каст безопасен и не требует
-- пересоздания колонки.
ALTER TABLE "AnimeRelation" ALTER COLUMN "relationKind" TYPE "RelationKind" USING ("relationKind"::"RelationKind");
