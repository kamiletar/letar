-- Убираем сломанный unique constraint (streamIndex не уникален для разных озвучек)
DROP INDEX IF EXISTS "AudioTrack_episodeId_streamIndex_key";
DROP INDEX IF EXISTS "SubtitleTrack_episodeId_streamIndex_key";
