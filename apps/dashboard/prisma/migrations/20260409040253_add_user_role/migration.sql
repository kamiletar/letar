-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'USER';

-- AlterTable
ALTER TABLE "Server" ADD COLUMN     "npmEmail" TEXT,
ADD COLUMN     "npmPassword" TEXT,
ADD COLUMN     "npmUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
