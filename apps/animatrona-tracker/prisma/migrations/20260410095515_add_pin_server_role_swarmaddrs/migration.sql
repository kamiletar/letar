-- CreateEnum
CREATE TYPE "PinServerRole" AS ENUM ('PINNER', 'RELAY', 'GATEWAY');

-- AlterTable
ALTER TABLE "PinServer" ADD COLUMN     "role" "PinServerRole" NOT NULL DEFAULT 'PINNER',
ADD COLUMN     "swarmAddrs" TEXT[] DEFAULT ARRAY[]::TEXT[];
