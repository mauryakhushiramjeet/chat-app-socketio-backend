/*
  Warnings:

  - A unique constraint covering the columns `[userId,chatPartnerUserId]` on the table `ChatClear` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,groupId]` on the table `ChatClear` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ChatClear_userId_chatPartnerUserId_idx";

-- DropIndex
DROP INDEX "ChatClear_userId_groupId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "ChatClear_userId_chatPartnerUserId_key" ON "ChatClear"("userId", "chatPartnerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatClear_userId_groupId_key" ON "ChatClear"("userId", "groupId");
