-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_groupMessageId_fkey";

-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_messageId_fkey";

-- AlterTable
ALTER TABLE "File" ALTER COLUMN "messageId" DROP NOT NULL,
ALTER COLUMN "groupMessageId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_groupMessageId_fkey" FOREIGN KEY ("groupMessageId") REFERENCES "GroupMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
