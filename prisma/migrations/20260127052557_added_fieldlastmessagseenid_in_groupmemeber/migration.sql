/*
  Warnings:

  - You are about to drop the column `lastMessageSeenId` on the `GroupMessage` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GroupMembers" ADD COLUMN     "lastMessageSeenId" INTEGER;

-- AlterTable
ALTER TABLE "GroupMessage" DROP COLUMN "lastMessageSeenId";
