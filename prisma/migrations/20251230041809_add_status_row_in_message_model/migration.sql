-- CreateEnum
CREATE TYPE "Status" AS ENUM ('Send', 'Delivered', 'Read');

-- AlterTable
ALTER TABLE "Messages" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Send';
