-- CreateTable
CREATE TABLE "ChatClear" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "chatPartnerUserId" INTEGER,
    "groupId" INTEGER,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatClear_id_key" ON "ChatClear"("id");

-- CreateIndex
CREATE INDEX "ChatClear_userId_chatPartnerUserId_idx" ON "ChatClear"("userId", "chatPartnerUserId");

-- CreateIndex
CREATE INDEX "ChatClear_userId_groupId_idx" ON "ChatClear"("userId", "groupId");
