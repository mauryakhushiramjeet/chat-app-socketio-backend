-- AlterTable
ALTER TABLE "GroupMessage" ADD COLUMN     "replyMessageSenderId" INTEGER;

-- AlterTable
ALTER TABLE "Messages" ADD COLUMN     "replyMessageSenderId" INTEGER;
