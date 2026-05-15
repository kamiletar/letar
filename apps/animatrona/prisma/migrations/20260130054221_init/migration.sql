-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "blurDataURL" TEXT,
    "category" TEXT NOT NULL,
    "source" TEXT,
    "cid" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Franchise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shikimoriFranchiseId" TEXT,
    "rootShikimoriId" INTEGER,
    "graphJson" TEXT,
    "graphUpdatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Anime" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "originalName" TEXT,
    "nameEn" TEXT,
    "synonyms" TEXT,
    "year" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ONGOING',
    "episodeCount" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "posterId" TEXT,
    "posterCid" TEXT,
    "rating" REAL,
    "source" TEXT,
    "ageRating" TEXT,
    "duration" INTEGER,
    "licensor" TEXT,
    "folderPath" TEXT,
    "isBdRemux" BOOLEAN NOT NULL DEFAULT false,
    "manifestCid" TEXT,
    "shikimoriId" INTEGER,
    "franchiseId" TEXT,
    "nextEpisodeAt" DATETIME,
    "lastSelectedAudioDubGroup" TEXT,
    "lastSelectedAudioLanguage" TEXT,
    "lastSelectedSubtitleDubGroup" TEXT,
    "lastSelectedSubtitleLanguage" TEXT,
    "relationsCheckedAt" DATETIME,
    "watchStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "watchedAt" DATETIME,
    "userRating" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Anime_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "File" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Anime_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shikimoriId" INTEGER
);

-- CreateTable
CREATE TABLE "GenreOnAnime" (
    "animeId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    PRIMARY KEY ("animeId", "genreId"),
    CONSTRAINT "GenreOnAnime_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GenreOnAnime_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameRu" TEXT,
    "shikimoriId" INTEGER
);

-- CreateTable
CREATE TABLE "ThemeOnAnime" (
    "animeId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,

    PRIMARY KEY ("animeId", "themeId"),
    CONSTRAINT "ThemeOnAnime_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ThemeOnAnime_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnimeRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceAnimeId" TEXT NOT NULL,
    "targetShikimoriId" INTEGER NOT NULL,
    "targetAnimeId" TEXT,
    "relationKind" TEXT NOT NULL,
    "targetName" TEXT,
    "targetPosterUrl" TEXT,
    "targetYear" INTEGER,
    "targetKind" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnimeRelation_sourceAnimeId_fkey" FOREIGN KEY ("sourceAnimeId") REFERENCES "Anime" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnimeRelation_targetAnimeId_fkey" FOREIGN KEY ("targetAnimeId") REFERENCES "Anime" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "animeId" TEXT NOT NULL,
    "number" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT,
    "type" TEXT NOT NULL DEFAULT 'TV',
    "year" INTEGER,
    "episodeCount" INTEGER NOT NULL DEFAULT 0,
    "folderPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Season_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AudioTrack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "streamIndex" INTEGER NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'und',
    "title" TEXT,
    "dubGroup" TEXT,
    "codec" TEXT NOT NULL,
    "channels" TEXT NOT NULL,
    "bitrate" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "transcodedCid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AudioTrack_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubtitleTrack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "streamIndex" INTEGER NOT NULL DEFAULT -1,
    "language" TEXT NOT NULL DEFAULT 'und',
    "title" TEXT,
    "dubGroup" TEXT,
    "format" TEXT NOT NULL,
    "fileCid" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubtitleTrack_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubtitleFont" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subtitleTrackId" TEXT NOT NULL,
    "fontName" TEXT NOT NULL,
    "fileCid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubtitleFont_subtitleTrackId_fkey" FOREIGN KEY ("subtitleTrackId") REFERENCES "SubtitleTrack" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "title" TEXT,
    "type" TEXT NOT NULL DEFAULT 'CHAPTER',
    "skippable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Chapter_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "animeId" TEXT NOT NULL,
    "seasonId" TEXT,
    "number" INTEGER NOT NULL,
    "name" TEXT,
    "durationMs" INTEGER,
    "folderPath" TEXT,
    "videoCodec" TEXT,
    "videoWidth" INTEGER,
    "videoHeight" INTEGER,
    "videoBitrate" INTEGER,
    "videoBitDepth" INTEGER,
    "encodingSettingsJson" TEXT,
    "encodingProfileId" TEXT,
    "sourceSize" BIGINT,
    "transcodedSize" BIGINT,
    "transcodedCid" TEXT,
    "manifestCid" TEXT,
    "thumbnailCids" TEXT,
    "screenshotCids" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Episode_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Episode_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Episode_encodingProfileId_fkey" FOREIGN KEY ("encodingProfileId") REFERENCES "EncodingProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WatchProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "animeId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "currentTime" REAL NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "selectedAudioTrackId" TEXT,
    "selectedSubtitleTrackId" TEXT,
    "volume" REAL NOT NULL DEFAULT 1,
    "lastWatchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WatchProgress_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WatchProgress_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "useGpu" BOOLEAN NOT NULL DEFAULT true,
    "videoCodec" TEXT NOT NULL DEFAULT 'AV1',
    "videoQuality" INTEGER NOT NULL DEFAULT 24,
    "videoPreset" TEXT NOT NULL DEFAULT 'p5',
    "audioBitrate" INTEGER NOT NULL DEFAULT 256,
    "libraryPath" TEXT,
    "outputPath" TEXT,
    "exportPath" TEXT,
    "minimizeToTray" BOOLEAN NOT NULL DEFAULT true,
    "closeToTray" BOOLEAN NOT NULL DEFAULT true,
    "showTrayNotification" BOOLEAN NOT NULL DEFAULT true,
    "darkMode" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'ru',
    "skipOpening" BOOLEAN NOT NULL DEFAULT false,
    "skipEnding" BOOLEAN NOT NULL DEFAULT false,
    "autoplay" BOOLEAN NOT NULL DEFAULT true,
    "trackPreference" TEXT NOT NULL DEFAULT 'AUTO',
    "defaultProfileId" TEXT,
    "mobileAccessEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mobileServerPort" INTEGER NOT NULL DEFAULT 4000,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Settings_defaultProfileId_fkey" FOREIGN KEY ("defaultProfileId") REFERENCES "EncodingProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EncodingProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "codec" TEXT NOT NULL DEFAULT 'AV1',
    "useGpu" BOOLEAN NOT NULL DEFAULT true,
    "rateControl" TEXT NOT NULL DEFAULT 'VBR',
    "cq" INTEGER NOT NULL DEFAULT 28,
    "maxBitrate" INTEGER,
    "preset" TEXT NOT NULL DEFAULT 'p5',
    "tune" TEXT NOT NULL DEFAULT 'HQ',
    "multipass" TEXT NOT NULL DEFAULT 'DISABLED',
    "spatialAq" BOOLEAN NOT NULL DEFAULT true,
    "temporalAq" BOOLEAN NOT NULL DEFAULT true,
    "aqStrength" INTEGER NOT NULL DEFAULT 8,
    "lookahead" INTEGER,
    "lookaheadLevel" INTEGER,
    "gopSize" INTEGER NOT NULL DEFAULT 240,
    "bRefMode" TEXT NOT NULL DEFAULT 'DISABLED',
    "force10Bit" BOOLEAN NOT NULL DEFAULT false,
    "temporalFilter" BOOLEAN NOT NULL DEFAULT false,
    "preferCpu" BOOLEAN NOT NULL DEFAULT false,
    "deband" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ImportQueueItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "dataJson" TEXT NOT NULL,
    "error" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentFileName" TEXT,
    "createdAnimeId" TEXT,
    "createdAnimeFolder" TEXT
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ipnsName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "lastKnownCid" TEXT,
    "lastCheckedAt" DATETIME,
    "autoPin" BOOLEAN NOT NULL DEFAULT false,
    "autoPinLimit" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tracker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'anime',
    "language" TEXT NOT NULL DEFAULT 'ru',
    "publicKeyPem" TEXT,
    "trustLevel" TEXT NOT NULL DEFAULT 'UNTRUSTED',
    "uptimePercent" REAL NOT NULL DEFAULT 0,
    "avgResponseTimeMs" INTEGER NOT NULL DEFAULT 0,
    "contentQuality" REAL NOT NULL DEFAULT 0,
    "successfulSyncs" INTEGER NOT NULL DEFAULT 0,
    "failedSyncs" INTEGER NOT NULL DEFAULT 0,
    "contentSynced" INTEGER NOT NULL DEFAULT 0,
    "lastSyncAt" DATETIME,
    "lastCheckedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FederatedContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackerId" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "animeId" TEXT,
    "contentJson" TEXT NOT NULL,
    "malId" INTEGER,
    "anilistId" INTEGER,
    "shikimoriId" INTEGER,
    "anidbId" INTEGER,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FederatedContent_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "Tracker" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FederatedContent_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FederationSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "trackerName" TEXT NOT NULL DEFAULT 'My Animatrona',
    "trackerDescription" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'anime',
    "language" TEXT NOT NULL DEFAULT 'ru',
    "autoSync" BOOLEAN NOT NULL DEFAULT true,
    "syncIntervalMinutes" INTEGER NOT NULL DEFAULT 60,
    "minTrustForAutoImport" INTEGER NOT NULL DEFAULT 3,
    "privateKeyPem" TEXT,
    "publicKeyPem" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserStats" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "bytesUploaded" BIGINT NOT NULL DEFAULT 0,
    "bytesDownloaded" BIGINT NOT NULL DEFAULT 0,
    "totalSeedingTimeMs" BIGINT NOT NULL DEFAULT 0,
    "currentSessionMs" BIGINT NOT NULL DEFAULT 0,
    "uniqueContentSeeded" INTEGER NOT NULL DEFAULT 0,
    "peersHelped" INTEGER NOT NULL DEFAULT 0,
    "firstSeedAt" DATETIME,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DailyStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userStatsId" TEXT NOT NULL DEFAULT 'default',
    "date" TEXT NOT NULL,
    "bytesUploaded" BIGINT NOT NULL DEFAULT 0,
    "bytesDownloaded" BIGINT NOT NULL DEFAULT 0,
    "seedingTimeMs" BIGINT NOT NULL DEFAULT 0,
    "peersHelped" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DailyStats_userStatsId_fkey" FOREIGN KEY ("userStatsId") REFERENCES "UserStats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserReputation" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "score" INTEGER NOT NULL DEFAULT 0,
    "rank" TEXT NOT NULL DEFAULT 'NEWCOMER',
    "ratioScore" INTEGER NOT NULL DEFAULT 0,
    "seedingTimeScore" INTEGER NOT NULL DEFAULT 0,
    "uniqueContentScore" INTEGER NOT NULL DEFAULT 0,
    "helpedPeersScore" INTEGER NOT NULL DEFAULT 0,
    "longevityScore" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "AchievementProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "achievementId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserBonusPoints" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "balance" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BonusTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bonusPointsId" TEXT NOT NULL DEFAULT 'default',
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BonusTransaction_bonusPointsId_fkey" FOREIGN KEY ("bonusPointsId") REFERENCES "UserBonusPoints" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LocalUserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "peerId" TEXT NOT NULL,
    "friendCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT 'Анонимус',
    "avatarUrl" TEXT,
    "avatarColor" TEXT,
    "status" TEXT,
    "ipnsPublishedCid" TEXT,
    "ipnsPublishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Friend" (
    "peerId" TEXT NOT NULL PRIMARY KEY,
    "friendCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "watchingJson" TEXT,
    "lastSeenAt" DATETIME,
    "friendsSince" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FriendRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromPeerId" TEXT NOT NULL,
    "fromFriendCode" TEXT NOT NULL,
    "fromDisplayName" TEXT NOT NULL,
    "toPeerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "File_path_key" ON "File"("path");

-- CreateIndex
CREATE INDEX "File_category_idx" ON "File"("category");

-- CreateIndex
CREATE INDEX "File_uploadedAt_idx" ON "File"("uploadedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Franchise_shikimoriFranchiseId_key" ON "Franchise"("shikimoriFranchiseId");

-- CreateIndex
CREATE UNIQUE INDEX "Franchise_rootShikimoriId_key" ON "Franchise"("rootShikimoriId");

-- CreateIndex
CREATE INDEX "Franchise_rootShikimoriId_idx" ON "Franchise"("rootShikimoriId");

-- CreateIndex
CREATE UNIQUE INDEX "Anime_shikimoriId_key" ON "Anime"("shikimoriId");

-- CreateIndex
CREATE INDEX "Anime_name_idx" ON "Anime"("name");

-- CreateIndex
CREATE INDEX "Anime_year_idx" ON "Anime"("year");

-- CreateIndex
CREATE INDEX "Anime_status_idx" ON "Anime"("status");

-- CreateIndex
CREATE INDEX "Anime_shikimoriId_idx" ON "Anime"("shikimoriId");

-- CreateIndex
CREATE INDEX "Anime_franchiseId_idx" ON "Anime"("franchiseId");

-- CreateIndex
CREATE INDEX "Anime_watchStatus_idx" ON "Anime"("watchStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_slug_key" ON "Genre"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_shikimoriId_key" ON "Genre"("shikimoriId");

-- CreateIndex
CREATE UNIQUE INDEX "Theme_name_key" ON "Theme"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Theme_shikimoriId_key" ON "Theme"("shikimoriId");

-- CreateIndex
CREATE INDEX "Theme_name_idx" ON "Theme"("name");

-- CreateIndex
CREATE INDEX "AnimeRelation_sourceAnimeId_idx" ON "AnimeRelation"("sourceAnimeId");

-- CreateIndex
CREATE INDEX "AnimeRelation_targetAnimeId_idx" ON "AnimeRelation"("targetAnimeId");

-- CreateIndex
CREATE INDEX "AnimeRelation_targetShikimoriId_idx" ON "AnimeRelation"("targetShikimoriId");

-- CreateIndex
CREATE UNIQUE INDEX "AnimeRelation_sourceAnimeId_targetShikimoriId_key" ON "AnimeRelation"("sourceAnimeId", "targetShikimoriId");

-- CreateIndex
CREATE INDEX "Season_animeId_idx" ON "Season"("animeId");

-- CreateIndex
CREATE UNIQUE INDEX "Season_animeId_number_key" ON "Season"("animeId", "number");

-- CreateIndex
CREATE INDEX "AudioTrack_episodeId_idx" ON "AudioTrack"("episodeId");

-- CreateIndex
CREATE INDEX "SubtitleTrack_episodeId_idx" ON "SubtitleTrack"("episodeId");

-- CreateIndex
CREATE INDEX "SubtitleFont_subtitleTrackId_idx" ON "SubtitleFont"("subtitleTrackId");

-- CreateIndex
CREATE INDEX "Chapter_episodeId_idx" ON "Chapter"("episodeId");

-- CreateIndex
CREATE INDEX "Chapter_type_idx" ON "Chapter"("type");

-- CreateIndex
CREATE INDEX "Episode_animeId_idx" ON "Episode"("animeId");

-- CreateIndex
CREATE INDEX "Episode_seasonId_idx" ON "Episode"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_animeId_number_key" ON "Episode"("animeId", "number");

-- CreateIndex
CREATE INDEX "WatchProgress_animeId_idx" ON "WatchProgress"("animeId");

-- CreateIndex
CREATE INDEX "WatchProgress_lastWatchedAt_idx" ON "WatchProgress"("lastWatchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WatchProgress_animeId_episodeId_key" ON "WatchProgress"("animeId", "episodeId");

-- CreateIndex
CREATE INDEX "EncodingProfile_isBuiltIn_idx" ON "EncodingProfile"("isBuiltIn");

-- CreateIndex
CREATE INDEX "EncodingProfile_isDefault_idx" ON "EncodingProfile"("isDefault");

-- CreateIndex
CREATE INDEX "ImportQueueItem_status_idx" ON "ImportQueueItem"("status");

-- CreateIndex
CREATE INDEX "ImportQueueItem_priority_idx" ON "ImportQueueItem"("priority");

-- CreateIndex
CREATE INDEX "ImportQueueItem_addedAt_idx" ON "ImportQueueItem"("addedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_ipnsName_key" ON "Subscription"("ipnsName");

-- CreateIndex
CREATE INDEX "Subscription_ipnsName_idx" ON "Subscription"("ipnsName");

-- CreateIndex
CREATE INDEX "Subscription_lastCheckedAt_idx" ON "Subscription"("lastCheckedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tracker_url_key" ON "Tracker"("url");

-- CreateIndex
CREATE INDEX "Tracker_trustLevel_idx" ON "Tracker"("trustLevel");

-- CreateIndex
CREATE INDEX "Tracker_lastSyncAt_idx" ON "Tracker"("lastSyncAt");

-- CreateIndex
CREATE INDEX "Tracker_lastCheckedAt_idx" ON "Tracker"("lastCheckedAt");

-- CreateIndex
CREATE INDEX "FederatedContent_trackerId_idx" ON "FederatedContent"("trackerId");

-- CreateIndex
CREATE INDEX "FederatedContent_animeId_idx" ON "FederatedContent"("animeId");

-- CreateIndex
CREATE INDEX "FederatedContent_malId_idx" ON "FederatedContent"("malId");

-- CreateIndex
CREATE INDEX "FederatedContent_anilistId_idx" ON "FederatedContent"("anilistId");

-- CreateIndex
CREATE INDEX "FederatedContent_shikimoriId_idx" ON "FederatedContent"("shikimoriId");

-- CreateIndex
CREATE UNIQUE INDEX "FederatedContent_trackerId_remoteId_key" ON "FederatedContent"("trackerId", "remoteId");

-- CreateIndex
CREATE INDEX "DailyStats_date_idx" ON "DailyStats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStats_userStatsId_date_key" ON "DailyStats"("userStatsId", "date");

-- CreateIndex
CREATE INDEX "UserAchievement_unlockedAt_idx" ON "UserAchievement"("unlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_achievementId_key" ON "UserAchievement"("achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "AchievementProgress_achievementId_key" ON "AchievementProgress"("achievementId");

-- CreateIndex
CREATE INDEX "BonusTransaction_type_idx" ON "BonusTransaction"("type");

-- CreateIndex
CREATE INDEX "BonusTransaction_createdAt_idx" ON "BonusTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LocalUserProfile_friendCode_key" ON "LocalUserProfile"("friendCode");

-- CreateIndex
CREATE INDEX "Friend_isOnline_idx" ON "Friend"("isOnline");

-- CreateIndex
CREATE INDEX "FriendRequest_fromPeerId_toPeerId_status_idx" ON "FriendRequest"("fromPeerId", "toPeerId", "status");

-- CreateIndex
CREATE INDEX "FriendRequest_toPeerId_status_idx" ON "FriendRequest"("toPeerId", "status");
