-- Миграция глав из SQLite в IPFS
-- Добавляем флаг миграции в Settings
ALTER TABLE "Settings" ADD COLUMN "chaptersMigrated" BOOLEAN NOT NULL DEFAULT false;

-- Удаляем таблицу Chapter (данные уже мигрированы в IPFS через migrateChaptersToManifest)
DROP TABLE IF EXISTS "Chapter";
