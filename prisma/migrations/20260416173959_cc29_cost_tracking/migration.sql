-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "cacheCreationTokens" INTEGER,
ADD COLUMN     "cacheReadTokens" INTEGER,
ADD COLUMN     "costUsd" DECIMAL(65,30),
ADD COLUMN     "inputTokens" INTEGER,
ADD COLUMN     "outputTokens" INTEGER,
ADD COLUMN     "projectId" TEXT;

-- CreateTable
CREATE TABLE "ProjectSpend" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "agentId" TEXT,
    "month" TEXT NOT NULL,
    "totalInputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCostUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSpend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentSpend" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "totalInputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCostUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentSpend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSpend_projectId_agentId_month_key" ON "ProjectSpend"("projectId", "agentId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "AgentSpend_agentId_month_key" ON "AgentSpend"("agentId", "month");

-- AddForeignKey
ALTER TABLE "ProjectSpend" ADD CONSTRAINT "ProjectSpend_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSpend" ADD CONSTRAINT "ProjectSpend_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentSpend" ADD CONSTRAINT "AgentSpend_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
