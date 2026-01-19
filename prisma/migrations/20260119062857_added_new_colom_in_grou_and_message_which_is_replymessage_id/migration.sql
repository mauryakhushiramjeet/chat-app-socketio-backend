-- AlterTable
ALTER TABLE "GroupMessage" ADD COLUMN     "replyToMessageId" INTEGER;

-- AlterTable
ALTER TABLE "Messages" ADD COLUMN     "replyToMessageId" INTEGER;
