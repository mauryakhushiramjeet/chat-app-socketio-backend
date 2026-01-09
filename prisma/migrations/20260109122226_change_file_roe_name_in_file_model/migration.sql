/*
  Warnings:

  - You are about to drop the column `type` on the `File` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `File` table. All the data in the column will be lost.
  - Added the required column `filePath` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileType` to the `File` table without a default value. This is not possible if the table is not empty.
  - Made the column `fileName` on table `File` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "File" DROP COLUMN "type",
DROP COLUMN "url",
ADD COLUMN     "filePath" TEXT NOT NULL,
ADD COLUMN     "fileType" TEXT NOT NULL,
ALTER COLUMN "fileName" SET NOT NULL;
