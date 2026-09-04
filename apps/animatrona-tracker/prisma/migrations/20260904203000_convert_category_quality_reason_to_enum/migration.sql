-- CreateEnum
CREATE TYPE "ContentCategory" AS ENUM ('ANIME', 'MOVIE', 'SERIES', 'OTHER');
CREATE TYPE "VideoQuality" AS ENUM ('P480', 'P720', 'P1080', 'P4K');
CREATE TYPE "ReportReason" AS ENUM ('COPYRIGHT', 'SPAM', 'INAPPROPRIATE', 'OTHER');

-- Content.category: String -> ContentCategory (значения мапятся явно, не приведением типа,
-- т.к. старые строковые значения в нижнем регистре не совпадают с новыми enum-идентификаторами)
DROP INDEX IF EXISTS "Content_category_idx";
ALTER TABLE "Content" ADD COLUMN "category_new" "ContentCategory";
UPDATE "Content" SET "category_new" = CASE "category"
  WHEN 'anime' THEN 'ANIME'::"ContentCategory"
  WHEN 'movie' THEN 'MOVIE'::"ContentCategory"
  WHEN 'series' THEN 'SERIES'::"ContentCategory"
  ELSE 'OTHER'::"ContentCategory"
END;
ALTER TABLE "Content" ALTER COLUMN "category_new" SET NOT NULL;
ALTER TABLE "Content" ALTER COLUMN "category_new" SET DEFAULT 'OTHER';
ALTER TABLE "Content" DROP COLUMN "category";
ALTER TABLE "Content" RENAME COLUMN "category_new" TO "category";
CREATE INDEX "Content_category_idx" ON "Content"("category");

-- Content.quality: String? -> VideoQuality? (без совпадения — NULL, поле опциональное)
ALTER TABLE "Content" ADD COLUMN "quality_new" "VideoQuality";
UPDATE "Content" SET "quality_new" = CASE "quality"
  WHEN '480p' THEN 'P480'::"VideoQuality"
  WHEN '720p' THEN 'P720'::"VideoQuality"
  WHEN '1080p' THEN 'P1080'::"VideoQuality"
  WHEN '4K' THEN 'P4K'::"VideoQuality"
  ELSE NULL
END;
ALTER TABLE "Content" DROP COLUMN "quality";
ALTER TABLE "Content" RENAME COLUMN "quality_new" TO "quality";

-- Report.reason: String -> ReportReason
ALTER TABLE "Report" ADD COLUMN "reason_new" "ReportReason";
UPDATE "Report" SET "reason_new" = CASE "reason"
  WHEN 'copyright' THEN 'COPYRIGHT'::"ReportReason"
  WHEN 'spam' THEN 'SPAM'::"ReportReason"
  WHEN 'inappropriate' THEN 'INAPPROPRIATE'::"ReportReason"
  ELSE 'OTHER'::"ReportReason"
END;
ALTER TABLE "Report" ALTER COLUMN "reason_new" SET NOT NULL;
ALTER TABLE "Report" DROP COLUMN "reason";
ALTER TABLE "Report" RENAME COLUMN "reason_new" TO "reason";
