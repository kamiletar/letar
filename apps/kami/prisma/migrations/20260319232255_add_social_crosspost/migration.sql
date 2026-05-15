-- CreateEnum
CREATE TYPE "SocialPlatformType" AS ENUM ('TELEGRAM', 'VK', 'LINKEDIN', 'TWITTER', 'FACEBOOK', 'INSTAGRAM', 'BLUESKY', 'MASTODON');

-- CreateEnum
CREATE TYPE "CrossPostStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "SocialPlatform" (
    "id" TEXT NOT NULL,
    "type" "SocialPlatformType" NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPlatform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrossPost" (
    "id" TEXT NOT NULL,
    "postSlug" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "status" "CrossPostStatus" NOT NULL DEFAULT 'PENDING',
    "externalId" TEXT,
    "externalUrl" TEXT,
    "error" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrossPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialPlatform_type_key" ON "SocialPlatform"("type");

-- CreateIndex
CREATE UNIQUE INDEX "CrossPost_postSlug_platformId_key" ON "CrossPost"("postSlug", "platformId");

-- AddForeignKey
ALTER TABLE "CrossPost" ADD CONSTRAINT "CrossPost_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "SocialPlatform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
