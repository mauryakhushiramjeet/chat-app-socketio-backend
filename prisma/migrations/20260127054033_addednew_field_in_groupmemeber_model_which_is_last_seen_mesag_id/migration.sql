/*
  Warnings:

  - You are about to drop the column `lastMessageSeenId` on the `GroupMembers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GroupMembers" DROP COLUMN "lastMessageSeenId",
ADD COLUMN     "lastSeenMessageId" INTEGER;
