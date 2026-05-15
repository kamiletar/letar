-- CreateEnum
CREATE TYPE "AppType" AS ENUM ('WEB', 'CLI', 'SERVICE');

-- AlterEnum
ALTER TYPE "AlertType" ADD VALUE 'CONTAINER_RESTARTED';

-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 3100,
    "isLocal" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "agentToken" TEXT,
    "lastSeen" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Server_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeployedApp" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "containerName" TEXT,
    "port" INTEGER,
    "type" "AppType" NOT NULL DEFAULT 'WEB',
    "imageName" TEXT,
    "lastDeployed" TIMESTAMP(3),
    "serverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeployedApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Server_name_key" ON "Server"("name");

-- CreateIndex
CREATE INDEX "Server_isActive_sortOrder_idx" ON "Server"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "DeployedApp_serverId_idx" ON "DeployedApp"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "DeployedApp_name_serverId_key" ON "DeployedApp"("name", "serverId");

-- AddForeignKey
ALTER TABLE "DeployedApp" ADD CONSTRAINT "DeployedApp_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
