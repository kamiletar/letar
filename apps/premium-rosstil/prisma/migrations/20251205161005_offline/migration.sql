-- CreateEnum
CREATE TYPE "WishlistPriority" AS ENUM ('DREAM', 'WANT', 'MAYBE');

-- AlterTable
ALTER TABLE "WishlistItem" ADD COLUMN     "note" TEXT,
ADD COLUMN     "priority" "WishlistPriority" NOT NULL DEFAULT 'WANT',
ADD COLUMN     "tags" TEXT[];
