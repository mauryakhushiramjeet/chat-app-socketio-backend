-- CreateTable
CREATE TABLE "File" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "messageId" INTEGER NOT NULL,
    "groupMessageId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_groupMessageId_fkey" FOREIGN KEY ("groupMessageId") REFERENCES "GroupMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
