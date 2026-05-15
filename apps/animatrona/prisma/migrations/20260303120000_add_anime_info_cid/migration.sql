-- Добавляем CID каноничного AnimeInfo для связи аниме с неизменяемыми метаданными в IPFS
ALTER TABLE "Anime" ADD COLUMN "animeInfoCid" TEXT;
