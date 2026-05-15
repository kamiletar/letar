-- Добавляем socialLinks в City, Venue, Team, Player
ALTER TABLE "City" ADD COLUMN IF NOT EXISTS "socialLinks" JSONB;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "socialLinks" JSONB;
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "socialLinks" JSONB;
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "socialLinks" JSONB;
