-- Дедупликация AudioTrack: оставляем запись с transcodedCid (если есть), иначе первую
DELETE FROM "AudioTrack" WHERE "id" NOT IN (
  SELECT "id" FROM (
    SELECT "id",
           ROW_NUMBER() OVER (
             PARTITION BY "episodeId", "streamIndex"
             ORDER BY
               CASE WHEN "transcodedCid" IS NOT NULL THEN 0 ELSE 1 END,
               "createdAt" ASC
           ) as rn
    FROM "AudioTrack"
  ) ranked WHERE rn = 1
);

-- Дедупликация SubtitleTrack: оставляем запись с fileCid (если есть), иначе первую
DELETE FROM "SubtitleTrack" WHERE "id" NOT IN (
  SELECT "id" FROM (
    SELECT "id",
           ROW_NUMBER() OVER (
             PARTITION BY "episodeId", "streamIndex"
             ORDER BY
               CASE WHEN "fileCid" IS NOT NULL THEN 0 ELSE 1 END,
               "createdAt" ASC
           ) as rn
    FROM "SubtitleTrack"
  ) ranked WHERE rn = 1
);

-- CreateIndex
CREATE UNIQUE INDEX "AudioTrack_episodeId_streamIndex_key" ON "AudioTrack"("episodeId", "streamIndex");

-- CreateIndex
CREATE UNIQUE INDEX "SubtitleTrack_episodeId_streamIndex_key" ON "SubtitleTrack"("episodeId", "streamIndex");
